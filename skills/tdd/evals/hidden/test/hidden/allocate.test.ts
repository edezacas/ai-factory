import { expect, it } from 'vitest'
import { allocateDiscount } from '../../src/orders/allocate-discount'

it.each([
  [[100, 200, 300], 60, [10, 20, 30]],
  [[100, 100, 100], 100, [34, 33, 33]],
  [[1, 1, 1, 7], 1, [0, 0, 0, 1]],
  [[333, 333, 334], 100, [33, 33, 34]],
  [[0, 100], 50, [0, 50]],
  [[50, 50], 0, [0, 0]],
  [[3, 3, 3, 3], 2, [1, 1, 0, 0]],
  [[1, 2], 1, [0, 1]],
  [[], 0, []],
])('%j with %i gives %j', (lines, discount, expected) => {
  expect(allocateDiscount(lines, discount)).toEqual(expected)
})

it('rejects a discount above the total', () => {
  expect(() => allocateDiscount([100, 200], 301)).toThrow(RangeError)
})

it('rejects a negative discount', () => {
  expect(() => allocateDiscount([100], -1)).toThrow(RangeError)
})
