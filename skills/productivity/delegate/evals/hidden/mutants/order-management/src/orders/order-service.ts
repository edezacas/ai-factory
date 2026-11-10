import { randomUUID } from 'node:crypto'
import type { EmailSender } from '../notifications/email-sender'
import type { PaymentGateway } from '../payments/payment-gateway'
import { totalCents, type Order, type OrderLine } from './order'
import type { OrderRepository } from './order-repository'

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
    private readonly emails: EmailSender,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private readonly cancelling = new Set<string>()

  async place(customerId: string, email: string, lines: OrderLine[]): Promise<Order> {
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
      await this.emails.sendOrderConfirmation(email, order)
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
    const order = await this.orders.findById(orderId)
    if (!order || order.customerId !== customerId) throw new Error('Order not found')
    if (order.status === 'cancelled') throw new Error('Order already cancelled')
    if (this.cancelling.has(orderId)) throw new Error('Order already cancelled')
    if (order.status === 'shipped') throw new Error('Order already shipped')
    if (this.now().getTime() - order.placedAt.getTime() >= CANCEL_WINDOW_MS) {
      throw new Error('Cancellation window has passed')
    }
    // Checked and claimed with no await in between, so a concurrent cancel sees the claim.
    this.cancelling.add(orderId)
    try {
      await this.payments.refund(order.chargeId, order.totalCents)
      await this.orders.save({ ...order, status: 'cancelled' })
    } finally {
      this.cancelling.delete(orderId)
    }
  }
}
