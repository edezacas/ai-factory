import type { Order } from '../orders/order'

export interface EmailSender {
  sendOrderConfirmation(to: string, order: Order): Promise<void>
  sendLineCancellation(to: string, order: Order, sku: string): Promise<void>
}
