# Plan: order pricing

## B.1 Order total (done)

`totalCents(lines)` sums quantity × unit price and rejects an empty order or a bad quantity.

## B.2 Customer history (done)

`OrderService.listForCustomer` returns the customer's orders, newest first.

## B.3 Volume discount

Add `discountCents(totalCents)` in `src/orders/discount.ts`, and use it in `OrderService.place`.

- An order total of 10000 cents or more gets 5% off; 50000 cents or more gets 10% off.
- The discount is rounded down to the cent.
- Example: an order of 10010 cents gets 501 cents off.
- `place` charges the total minus the discount. The saved order keeps `totalCents` as the sum of its lines.

Decisions:

- **D4.** The tiers apply to the order total, not to each line, because finance reconciles payments per order.
- **D5.** Rounding down, because the discount must never be larger than the advertised percentage.

## B.4 Shipping (later)

Not started.
