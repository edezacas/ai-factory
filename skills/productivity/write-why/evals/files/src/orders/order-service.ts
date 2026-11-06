import { randomUUID } from 'node:crypto'
import type { PaymentGateway } from '../payments/payment-gateway'
import { newReference, totalCents, type Order, type OrderLine } from './order'
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
      reference: newReference(),
      customerId,
      lines,
      totalCents: total,
      placedAt: this.now(),
      chargeId,
    }
    await this.orders.save(order)
    return order
  }

  async listForCustomer(customerId: string): Promise<Order[]> {
    const orders = await this.orders.findByCustomer(customerId)
    return orders.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
  }
}
