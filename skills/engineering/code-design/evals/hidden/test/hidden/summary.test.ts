import { expect, it } from 'vitest'
import { line, setup } from './support'

it('counts the orders of the customer and adds up what they spent', async () => {
  const { service } = setup()
  await service.place('c1', [line(1000)])
  await service.place('c1', [line(2505)])
  await service.place('c2', [line(9900)])
  await service.place('c1', [line(1000)])
  expect(await service.summary('c1')).toBe('c1: 3 orders, 45.05 EUR spent')
})

it('a single order is singular', async () => {
  const { service } = setup()
  await service.place('c1', [line(700)])
  expect(await service.summary('c1')).toBe('c1: 1 order, 7.00 EUR spent')
})

it('a customer without orders spent nothing', async () => {
  const { service } = setup()
  expect(await service.summary('c1')).toBe('c1: 0 orders, 0.00 EUR spent')
})
