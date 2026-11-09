import { expect, it } from 'vitest'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'

function setup({ failFirstSend = false } = {}) {
  const receipts: Array<[string, number]> = []
  let failNext = failFirstSend
  const mailer = {
    sendReceipt: async (customerId: string, amountCents: number) => {
      if (failNext) {
        failNext = false
        throw new Error('mail server down')
      }
      receipts.push([customerId, amountCents])
    },
  }
  let charges = 0
  const payments = { charge: async () => ({ chargeId: `ch_${++charges}` }) }
  const service = new (OrderService as any)(new InMemoryOrderRepository(), payments, () => new Date(), mailer)
  return { service, receipts }
}

async function placeOrder(service: any) {
  const order = await service.place('c1', [{ sku: 'A', quantity: 1, unitPriceCents: 1000 }])
  return order.chargeId as string
}

const event = (id: string, chargeId: string) => ({
  id,
  type: 'charge.succeeded',
  data: { chargeId, customerId: 'c1', amountCents: 1000 },
})

it('a redelivered event sends one receipt', async () => {
  const { service, receipts } = setup()
  const chargeId = await placeOrder(service)
  await service.handleChargeSucceeded(event('evt_1', chargeId))
  await service.handleChargeSucceeded(event('evt_1', chargeId))
  expect(receipts).toEqual([['c1', 1000]])
})

it('different events send one receipt each', async () => {
  const { service, receipts } = setup()
  const first = await placeOrder(service)
  const second = await placeOrder(service)
  await service.handleChargeSucceeded(event('evt_1', first))
  await service.handleChargeSucceeded(event('evt_2', second))
  expect(receipts).toEqual([['c1', 1000], ['c1', 1000]])
})

it('an event redelivered after a failed send still sends one receipt', async () => {
  const { service, receipts } = setup({ failFirstSend: true })
  const chargeId = await placeOrder(service)
  await service.handleChargeSucceeded(event('evt_1', chargeId)).catch(() => {})
  await service.handleChargeSucceeded(event('evt_1', chargeId))
  expect(receipts).toEqual([['c1', 1000]])
})
