import { describe, expect, it } from 'vitest'
import { totalCents } from '../../src/orders/order'

const line = (quantity: number, unitPriceCents: number, sku = 'A') => ({ sku, quantity, unitPriceCents })

describe('bulk discount', () => {
  it('takes 10 % off an order of 10 units', () => {
    expect(totalCents([line(10, 500)])).toBe(4500)
  })

  it('charges the full total below 10 units', () => {
    expect(totalCents([line(9, 500)])).toBe(4500)
  })

  it('counts the units of every line', () => {
    expect(totalCents([line(4, 1000, 'A'), line(6, 1000, 'B')])).toBe(9000)
  })

  it('still rejects an empty order and a bad quantity', () => {
    expect(() => totalCents([])).toThrow('at least one line')
    expect(() => totalCents([line(0, 100)])).toThrow('Invalid quantity for A')
  })
})
