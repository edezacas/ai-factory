# Order management: decisions

Everything below is settled with the product owner.

Customers can place, list and cancel their orders, with an email when an order is placed.

- An order has lines (sku, quantity, unit price in cents) and a total in cents. Reason: floating point rounding caused billing errors before.
- An order has a status: `placed`, `shipped` or `cancelled`. `markShipped` sets a placed order to `shipped`; a cancelled order cannot be shipped, and marking a shipped order again changes nothing.
- A customer lists only their own orders, newest first. Cancelled orders stay in the list with their status.
- A customer can cancel their own order less than 24 hours after placing it, unless it has shipped. At exactly 24 hours it can no longer be cancelled. Reason: not stated.
- Cancelling another customer's order fails with the same "not found" error as an order that does not exist. Cancelling an order that is already cancelled fails with an error and refunds nothing.
- Two cancels of the same order at the same time refund it once: one succeeds, the other fails as already cancelled.
- A cancelled order is refunded in full to the original payment method through the payment provider. If the refund fails, the order is not cancelled.
- The confirmation email goes out when an order is placed, through the email provider, to the customer's email address, which placing an order receives. If the email fails, the order stays placed. Cancellation sends no email.
- Orders are kept in memory for now, behind the existing `OrderService` in `src/orders/`.

## Interface

Another team already calls this code, so the names and signatures are settled too:

```ts
// src/orders/order.ts
type OrderStatus = 'placed' | 'shipped' | 'cancelled' // Order gains `status: OrderStatus`

// src/payments/payment-gateway.ts
interface PaymentGateway {
  charge(customerId: string, amountCents: number): Promise<{ chargeId: string }>
  refund(chargeId: string, amountCents: number): Promise<void>
}

// src/notifications/email-sender.ts
interface EmailSender {
  sendOrderConfirmation(to: string, order: Order): Promise<void>
}

// src/orders/order-service.ts
class OrderService {
  constructor(orders: OrderRepository, payments: PaymentGateway, emails: EmailSender, now?: () => Date)
  place(customerId: string, email: string, lines: OrderLine[]): Promise<Order>
  listForCustomer(customerId: string): Promise<Order[]>
  markShipped(orderId: string): Promise<void>
  cancel(customerId: string, orderId: string): Promise<void>
}
```

Errors are plain `Error`s with these exact messages, which the other team shows to customers:

| When | Message |
|------|---------|
| The order does not exist, or `cancel` is called by another customer | `Order not found` |
| The order is already cancelled | `Order already cancelled` |
| The order has shipped | `Order already shipped` |
| 24 hours or more have passed since it was placed | `Cancellation window has passed` |
