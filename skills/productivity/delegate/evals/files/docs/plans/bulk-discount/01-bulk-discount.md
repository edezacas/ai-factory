# Bulk discount

## Goal

An order with 10 units or more in total, across all its lines, gets 10% off its total.

## Criteria

- **Given** one line with quantity 10 and unit price 500, **when** `totalCents` is called, **then** it returns 4500
- **Given** two lines, quantity 4 at 1000 and quantity 6 at 1000, **when** `totalCents` is called, **then** it returns 9000
- **Given** one line with quantity 9 and unit price 500, **when** `totalCents` is called, **then** it returns 4500

## Behaviour to keep

- An order with no lines, or a line whose quantity is not a positive integer, still throws as today.

## Decisions

- The threshold counts units across all lines, not lines: stated by the product owner.
- 10% off the whole total, not per line: not stated.

## Seam

```ts
export interface OrderLine {
  sku: string
  quantity: number
  unitPriceCents: number
}

export function totalCents(lines: OrderLine[]): number
```

## Closest test

`test/orders/order.test.ts`, the test the new ones follow:

```ts
it('adds up the lines', () => {
  expect(
    totalCents([
      { sku: 'A', quantity: 2, unitPriceCents: 150 },
      { sku: 'B', quantity: 1, unitPriceCents: 999 },
    ]),
  ).toBe(1299)
})
```

## Files

- `src/orders/order.ts`: `totalCents` applies the discount. Each new behaviour has its test; no test is optional.
- `test/orders/order.test.ts`: the new cases.

## Commands

- This task's tests: `npx vitest run test/orders/order.test.ts`
- Before finishing, each step of the project's gate: `npm run typecheck`, `npm test`

## Depends on

- none
