import { describe, expect, it } from 'vitest'
import { checkout } from '../../src/clients/storefront'
import type { EmailSender } from '../../src/notifications/email-sender'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'
import type { PaymentGateway } from '../../src/payments/payment-gateway'

describe('checkout', () => {
  it('places the order and returns its id and total', async () => {
    const payments: PaymentGateway = {
      charge: async () => ({ chargeId: 'charge-1' }),
      refund: async () => {},
    }
    const emails: EmailSender = { sendOrderConfirmation: async () => {} }
    const orders = new OrderService(new InMemoryOrderRepository(), payments, emails)

    const result = await checkout(orders, 'c1', 'c1@example.com', [{ sku: 'A', quantity: 3, unitPriceCents: 200 }])

    expect(result.totalCents).toBe(600)
    const [order] = await orders.listForCustomer('c1')
    expect(result.orderId).toBe(order.id)
  })
})
