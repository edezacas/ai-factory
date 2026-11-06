import { expect, it } from 'vitest'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'

const line = { sku: 'A', quantity: 2, unitPriceCents: 500 }
const extra = { sku: 'B', quantity: 1, unitPriceCents: 300 }

class FlakyRepository extends InMemoryOrderRepository {
  failing = false
  override async save(order: Parameters<InMemoryOrderRepository['save']>[0]) {
    if (this.failing) throw new Error('Database down')
    return super.save(order)
  }
}

it('leaves the customer with no net charge when saving fails', async () => {
  let balance = 0
  const payments = {
    charge: async (_customerId: string, amountCents: number) => {
      balance += amountCents
      return { chargeId: 'charge' }
    },
    refund: async (_chargeId: string, amountCents: number) => {
      balance -= amountCents
    },
  }
  const orders = new FlakyRepository()
  const service = new OrderService(orders, payments)
  const order = await service.place('c1', [line])
  orders.failing = true
  await expect(service.addLine('c1', order.id, extra)).rejects.toThrow()
  expect(balance).toBe(1000)
})

it('leaves the order unchanged when the charge fails', async () => {
  let fail = false
  const payments = {
    charge: async () => {
      if (fail) throw new Error('Provider down')
      return { chargeId: 'charge' }
    },
    refund: async () => {},
  }
  const service = new OrderService(new InMemoryOrderRepository(), payments)
  const order = await service.place('c1', [line])
  fail = true
  await expect(service.addLine('c1', order.id, extra)).rejects.toThrow()
  const [listed] = await service.listForCustomer('c1')
  expect(listed.totalCents).toBe(1000)
})
