import { randomUUID } from 'node:crypto'
import type { PaymentGateway } from '../payments/payment-gateway'
import { totalCents, type Order, type OrderLine } from './order'
import type { OrderRepository } from './order-repository'

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async place(customerId: string, lines: OrderLine[]): Promise<Order> {
    const total = totalCents(lines)
    const { chargeId } = await this.payments.charge(customerId, total)
    const order: Order = {
      id: randomUUID(),
      customerId,
      lines,
      totalCents: total,
      placedAt: this.now(),
      chargeId,
    }
    await this.orders.save(order)
    return order
  }

  async addLine(customerId: string, orderId: string, line: OrderLine): Promise<Order> {
    const order = await this.orders.findById(orderId)
    if (!order || order.customerId !== customerId) throw new Error('Order not found')
    const amount = totalCents([line])
    const updated: Order = { ...order, lines: [...order.lines, line], totalCents: order.totalCents + amount }
    const { chargeId } = await this.payments.charge(customerId, amount)
    try {
      await this.orders.save(updated)
    } catch (error) {
      await this.payments.refund(chargeId, amount)
      throw error
    }
    return updated
  }

  async listForCustomer(customerId: string): Promise<Order[]> {
    const orders = await this.orders.findByCustomer(customerId)
    return orders.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
  }
}
