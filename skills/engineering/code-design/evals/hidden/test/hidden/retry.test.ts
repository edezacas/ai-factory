import { expect, it } from 'vitest'
import { line, setup } from './support'

it('a retry with the same requestId charges once and returns the first order', async () => {
  const { service, charges } = setup()
  const first = await service.place('c1', [line(1000)], 'r1')
  const retry = await service.place('c1', [line(1000)], 'r1')
  expect(charges).toEqual([1000])
  expect(retry.id).toBe(first.id)
})

it('different requestIds are different orders', async () => {
  const { service, charges } = setup()
  await service.place('c1', [line(1000)], 'r1')
  await service.place('c1', [line(1000)], 'r2')
  expect(charges).toEqual([1000, 1000])
})

it('without a requestId every call is a new order', async () => {
  const { service, charges } = setup()
  await service.place('c1', [line(1000)])
  await service.place('c1', [line(1000)])
  expect(charges).toEqual([1000, 1000])
})
