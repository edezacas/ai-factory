import { expect, it } from 'vitest'
import { line, setup } from './support'

it('takes 500 cents off from the fourth order of a customer', async () => {
  const { service, charges } = setup()
  for (let i = 0; i < 4; i++) await service.place('c1', [line(2000)])
  expect(charges).toEqual([2000, 2000, 2000, 1500])
})

it('counts only the orders of the same customer', async () => {
  const { service, charges } = setup()
  for (let i = 0; i < 3; i++) await service.place('c1', [line(2000)])
  await service.place('c2', [line(2000)])
  expect(charges.at(-1)).toBe(2000)
})
