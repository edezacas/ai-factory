import { randomUUID } from 'node:crypto'
import type { CustomerRepository } from '../customers/customer-repository'
import type { EmailSender } from '../notifications/email-sender'
import type { PaymentGateway } from '../payments/payment-gateway'
import { lineCents, totalCents, type Order, type OrderLine } from './order'
import type { OrderRepository } from './order-repository'

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerRepository,
    private readonly payments: PaymentGateway,
    private readonly emails: EmailSender,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private readonly locks = new Map<string, Promise<unknown>>()

  async place(customerId: string, lines: OrderLine[]): Promise<Order> {
    const customer = await this.customers.findById(customerId)
    if (!customer) throw new Error('Customer not found')
    const total = totalCents(lines)
    const { chargeId } = await this.payments.charge(customerId, total)
    const order: Order = {
      id: randomUUID(),
      customerId,
      lines,
      totalCents: total,
      placedAt: this.now(),
      chargeId,
      status: 'placed',
    }
    await this.orders.save(order)
    try {
      await this.emails.sendOrderConfirmation(customer.email, order)
    } catch (err) {
      // The order is paid and saved; a failed email does not undo it.
      console.error('Order confirmation email failed', err)
    }
    return order
  }

  async listForCustomer(customerId: string): Promise<Order[]> {
    const orders = await this.orders.findByCustomer(customerId)
    return orders.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
  }

  async markShipped(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId)
    if (!order) throw new Error('Order not found')
    if (order.status === 'cancelled') throw new Error('Order already cancelled')
    if (order.status === 'shipped') return
    await this.orders.save({ ...order, status: 'shipped' })
  }

  async cancel(customerId: string, orderId: string): Promise<void> {
    return this.exclusive(orderId, async () => {
      const order = await this.cancellable(customerId, orderId)
      await this.payments.refund(order.chargeId, order.totalCents)
      await this.orders.save({ ...order, status: 'cancelled' })
    })
  }

  async cancelLine(customerId: string, orderId: string, sku: string): Promise<void> {
    return this.exclusive(orderId, async () => {
      const order = await this.cancellable(customerId, orderId)
      const line = order.lines.find((l) => l.sku === sku)
      if (!line) throw new Error('Line not found')
      if (line.status === 'cancelled') throw new Error('Line already cancelled')
      await this.payments.refund(order.chargeId, lineCents(line))
      const lines = order.lines.map((l) => (l === line ? { ...l, status: 'cancelled' as const } : l))
      const updated: Order = {
        ...order,
        lines,
        totalCents: order.totalCents - lineCents(line),
        status: lines.every((l) => l.status === 'cancelled') ? 'cancelled' : order.status,
      }
      await this.orders.save(updated)
      const customer = await this.customers.findById(customerId)
      try {
        await this.emails.sendLineCancellation(customer!.email, updated, sku)
      } catch (err) {
        // The line is refunded and saved; a failed email does not undo it.
        console.error('Line cancellation email failed', err)
      }
    })
  }

  // Fails unless the customer's order can still be cancelled, in whole or in part.
  private async cancellable(customerId: string, orderId: string): Promise<Order> {
    const order = await this.orders.findById(orderId)
    if (!order || order.customerId !== customerId) throw new Error('Order not found')
    if (order.status === 'cancelled') throw new Error('Order already cancelled')
    if (order.status === 'shipped') throw new Error('Order already shipped')
    if (this.now().getTime() - order.placedAt.getTime() >= CANCEL_WINDOW_MS) {
      throw new Error('Cancellation window has passed')
    }
    return order
  }

  // Runs cancels of one order one after another, so each reads what the previous one saved.
  private async exclusive<T>(orderId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(orderId) ?? Promise.resolve()
    const current = previous.catch(() => {}).then(work)
    this.locks.set(orderId, current)
    try {
      return await current
    } finally {
      if (this.locks.get(orderId) === current) this.locks.delete(orderId)
    }
  }
}
