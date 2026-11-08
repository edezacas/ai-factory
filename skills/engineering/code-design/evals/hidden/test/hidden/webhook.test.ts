import { expect, it } from 'vitest'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'

function setup() {
  const receipts: Array<[string, number]> = []
  const mailer = {
    sendReceipt: async (customerId: string, amountCents: number) => {
      receipts.push([customerId, amountCents])
    },
  }
  const payments = { charge: async () => ({ chargeId: 'ch_1' }) }
  const service = new (OrderService as any)(new InMemoryOrderRepository(), payments, () => new Date(), mailer)
  return { service, receipts }
}

const event = (id: string) => ({
  id,
  type: 'charge.succeeded',
  data: { chargeId: `ch_${id}`, customerId: 'c1', amountCents: 1000 },
})

it('a redelivered event sends one receipt', async () => {
  const { service, receipts } = setup()
  await service.handleChargeSucceeded(event('evt_1'))
  await service.handleChargeSucceeded(event('evt_1'))
  expect(receipts).toEqual([['c1', 1000]])
})

it('different events send one receipt each', async () => {
  const { service, receipts } = setup()
  await service.handleChargeSucceeded(event('evt_1'))
  await service.handleChargeSucceeded(event('evt_2'))
  expect(receipts).toEqual([['c1', 1000], ['c1', 1000]])
})
