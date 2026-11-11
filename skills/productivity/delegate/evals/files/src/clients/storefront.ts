// Owned by the storefront team: the checkout their web shop calls.
import type { OrderLine } from '../orders/order'
import type { OrderService } from '../orders/order-service'

export async function checkout(
  orders: OrderService,
  customerId: string,
  email: string,
  lines: OrderLine[],
): Promise<{ orderId: string; totalCents: number }> {
  const order = await orders.place(customerId, email, lines)
  return { orderId: order.id, totalCents: order.totalCents }
}
