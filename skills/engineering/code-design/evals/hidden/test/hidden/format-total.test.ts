import { expect, it } from 'vitest'
import { formatTotal } from '../../src/orders/format-total'

it.each([
  [1234, '12.34 EUR'],
  [5, '0.05 EUR'],
  [100, '1.00 EUR'],
])('formats %i cents', (cents, text) => {
  expect(formatTotal(cents)).toBe(text)
})
