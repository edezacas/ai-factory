# Order management: decisions

Everything below is settled with the product owner.

Customers can place, list and cancel their orders, with an email when an order is placed.

- An order has lines (sku, quantity, unit price in cents) and a total in cents. Reason: floating point rounding caused billing errors before.
- An order has a status: `placed`, `shipped` or `cancelled`. A `markShipped` function sets it to `shipped`.
- A customer lists only their own orders, newest first. Cancelled orders stay in the list with their status.
- A customer can cancel their own order less than 24 hours after placing it, unless it has shipped. At exactly 24 hours it can no longer be cancelled. Reason: not stated.
- Cancelling another customer's order fails with the same "not found" error as an order that does not exist. Cancelling an order that is already cancelled fails with an error and refunds nothing.
- A cancelled order is refunded in full to the original payment method through the payment provider. If the refund fails, the order is not cancelled.
- The confirmation email goes out when an order is placed, through the email provider, to the customer's email address, which placing an order receives. If the email fails, the order stays placed. Cancellation sends no email.
- Orders are kept in memory for now, behind the existing `OrderService` in `src/orders/`.
