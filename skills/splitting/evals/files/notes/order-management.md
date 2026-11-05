# Order management: decisions

Everything below is settled with the product owner.

Customers can place, list and cancel their orders, with an email when an order is placed.

- An order has lines (sku, quantity, unit price in cents) and a total in cents. Reason: floating point rounding caused billing errors before.
- A customer lists only their own orders, newest first.
- A customer can cancel their own order within 24 hours of placing it, unless it has shipped. Reason: not stated.
- A cancelled order is refunded in full to the original payment method through the payment provider.
- The confirmation email goes out when an order is placed, through the email provider. Cancellation sends no email.
- Orders are kept in memory for now, behind functions exported from `src/orders/`.
