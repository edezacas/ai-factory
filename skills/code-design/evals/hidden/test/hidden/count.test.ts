import { expect, it } from 'vitest'
import { line, setup } from './support'

it('counts only the orders of the customer', async () => {
  const { service } = setup()
  await service.place('c1', [line(100)])
  await service.place('c1', [line(100)])
  await service.place('c2', [line(100)])
  expect(await service.countForCustomer('c1')).toBe(2)
  expect(await service.countForCustomer('c3')).toBe(0)
})
