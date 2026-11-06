import { expect, it } from 'vitest'
import { totalCents } from '../../src/orders/order'

it('rejects a negative unit price', () => {
  expect(() => totalCents([{ sku: 'A', quantity: 1, unitPriceCents: -1 }])).toThrow()
})

it('still accepts a free line', () => {
  expect(totalCents([{ sku: 'A', quantity: 2, unitPriceCents: 0 }])).toBe(0)
})
