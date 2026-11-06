import { expect, it } from 'vitest'
import { totalCents } from '../../src/orders/order'

it('keeps the total of the lines free of the fee', () => {
  expect(totalCents([{ sku: 'A', quantity: 1, unitPriceCents: 1000 }])).toBe(1000)
})
