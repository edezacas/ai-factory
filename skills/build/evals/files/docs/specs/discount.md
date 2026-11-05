# Discount

## Goal

Apply a percentage discount to an order total.

## Out of scope

- Coupons.

## Decisions

### Discounts are a percentage of the total

- **Why:** not stated
- **Rejected:** none discussed

## Acceptance criteria

### Small order

- **Given** a total of 9.99 and a discount of 10%
- **When** the discount is applied
- **Then** the result is 8.99

### Larger order

- **Given** a total of 19.99 and a discount of 10%
- **When** the discount is applied
- **Then** the result is 18.00
