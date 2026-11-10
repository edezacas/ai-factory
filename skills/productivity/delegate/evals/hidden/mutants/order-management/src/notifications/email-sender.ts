import type { Order } from '../orders/order'

export interface EmailSender {
  sendOrderConfirmation(to: string, order: Order): Promise<void>
}
