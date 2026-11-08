import { expect, it } from 'vitest'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'
import { line } from './support'

function setup(times: string[]) {
  const clock = times.map((t) => new Date(t))
  const payments = { charge: async () => ({ chargeId: 'ch' }) }
  return new OrderService(new InMemoryOrderRepository(), payments, () => clock.shift()!)
}

it('lists the orders of the customer, newest first', async () => {
  const service = setup(['2026-01-01T10:00:00.000Z', '2026-01-02T10:00:00.000Z', '2026-01-03T10:00:00.000Z'])
  const first = await service.place('c1', [line(1000)])
  await service.place('c2', [line(5000)])
  const second = await service.place('c1', [line(2500)])
  expect(await service.exportCsv('c1')).toBe(
    [
      'id,placedAt,totalCents',
      `${second.id},2026-01-03T10:00:00.000Z,2500`,
      `${first.id},2026-01-01T10:00:00.000Z,1000`,
    ].join('\n'),
  )
})

it('a customer without orders gets only the header', async () => {
  const service = setup([])
  expect(await service.exportCsv('c1')).toBe('id,placedAt,totalCents')
})
