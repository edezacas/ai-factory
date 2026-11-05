import { describe, expect, it } from 'vitest'
import { totalCents } from '../../src/orders/order'

describe('totalCents', () => {
  it('adds up the lines', () => {
    expect(
      totalCents([
        { sku: 'A', quantity: 2, unitPriceCents: 150 },
        { sku: 'B', quantity: 1, unitPriceCents: 999 },
      ]),
    ).toBe(1299)
  })

  it('rejects an order with no lines', () => {
    expect(() => totalCents([])).toThrow('at least one line')
  })

  it('rejects a quantity below one', () => {
    expect(() => totalCents([{ sku: 'A', quantity: 0, unitPriceCents: 100 }])).toThrow(
      'Invalid quantity for A',
    )
  })
})
