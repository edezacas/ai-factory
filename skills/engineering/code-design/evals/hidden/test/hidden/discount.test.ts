import { expect, it } from 'vitest'
import { line, setup } from './support'

it.each([
  [9999, 9999],
  [10000, 9000],
  [20000, 18000],
])('charges for %i cents', async (subtotal, charged) => {
  const { service, charges } = setup()
  await service.place('c1', [line(subtotal)])
  expect(charges).toEqual([charged])
})
