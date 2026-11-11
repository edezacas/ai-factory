# Customer accounts and line cancellation: decisions

Everything below is settled with the product owner. Order management, as built from `notes/order-management.md`, is in `src/` and its tests pass.

Two changes. Placing an order stops taking an email address and looks the customer up instead. A customer can cancel one line of an order instead of the whole order.

## Customer accounts

- A customer has an id and an email address, kept in memory for now in a customer store in `src/customers/`.
- `place` takes the customer's email from the store, not from its caller. The confirmation email goes to that address.
- Placing an order for a customer the store does not know fails with `Customer not found`, charges nothing and saves nothing.
- The storefront team calls `place` from `src/clients/storefront.ts`, which is in this repo. Their release and ours are not in step, so the change goes in three steps, each one released on its own with every test passing:
  1. Expand: `place` accepts both `place(customerId, email, lines)` and `place(customerId, lines)`. In both forms the email comes from the store; an email passed in is ignored.
  2. Migrate: `src/clients/storefront.ts` calls `place(customerId, lines)` and stops taking an email itself.
  3. Contract: `place(customerId, email, lines)` is removed.

## Line cancellation

- The lines of an order have distinct skus. Placing an order with a sku repeated fails with `Duplicate sku`, charges nothing and saves nothing.
- A customer can cancel one line of their own order, named by its sku, under the same 24-hour rule as cancelling the order, and not once it has shipped.
- The line is refunded through the payment provider for its quantity times its unit price, on the order's original charge. If the refund fails, the line is not cancelled.
- A cancelled line stays in the order with its status, and the order's total drops by its amount.
- Cancelling the last line that is not cancelled cancels the order: its status becomes `cancelled`.
- Cancelling the order after some of its lines refunds only what is left of the total.
- Each cancelled line sends an email to the customer, through the email provider, to the address in the store. If the email fails, the line stays cancelled. Cancelling the whole order still sends no email.
- Two cancels of the same line at the same time refund it once: one succeeds, the other fails as already cancelled. Two cancels of different lines of one order at the same time both succeed, each line refunded once and both left cancelled.

## Interface

```ts
// src/customers/customer.ts
interface Customer { id: string; email: string }

// src/customers/customer-repository.ts
interface CustomerRepository {
  save(customer: Customer): Promise<void>
  findById(customerId: string): Promise<Customer | undefined>
}
class InMemoryCustomerRepository implements CustomerRepository

// src/orders/order.ts
type LineStatus = 'active' | 'cancelled' // OrderLine gains `status?: LineStatus`, absent meaning 'active'

// src/notifications/email-sender.ts
interface EmailSender {
  sendOrderConfirmation(to: string, order: Order): Promise<void>
  sendLineCancellation(to: string, order: Order, sku: string): Promise<void>
}

// src/orders/order-service.ts, once contracted
class OrderService {
  constructor(orders: OrderRepository, customers: CustomerRepository, payments: PaymentGateway, emails: EmailSender, now?: () => Date)
  place(customerId: string, lines: OrderLine[]): Promise<Order>
  cancelLine(customerId: string, orderId: string, sku: string): Promise<void>
  // listForCustomer, markShipped and cancel keep their signatures
}

// src/clients/storefront.ts, once migrated
function checkout(orders: OrderService, customerId: string, lines: OrderLine[]): Promise<{ orderId: string; totalCents: number }>
```

New errors, plain `Error`s with these exact messages; the errors of `cancel` keep theirs and `cancelLine` uses the same ones for the same cases:

| When | Message |
|------|---------|
| `place` for a customer the store does not know | `Customer not found` |
| `place` with the same sku on two lines | `Duplicate sku` |
| The order has no line with that sku | `Line not found` |
| The line is already cancelled | `Line already cancelled` |
