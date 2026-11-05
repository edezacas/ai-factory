import type { Order } from './order'

export interface OrderRepository {
  save(order: Order): Promise<void>
  findByCustomer(customerId: string): Promise<Order[]>
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>()

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order)
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return [...this.orders.values()].filter((order) => order.customerId === customerId)
  }
}
