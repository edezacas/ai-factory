import { expect, it } from 'vitest'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'

const line = { sku: 'A', quantity: 2, unitPriceCents: 500 }
const extra = { sku: 'B', quantity: 1, unitPriceCents: 300 }

function setup() {
  const charges: number[] = []
  const payments = {
    charge: async (_customerId: string, amountCents: number) => {
      charges.push(amountCents)
      return { chargeId: `charge-${charges.length}` }
    },
    refund: async () => {},
  }
  const service = new OrderService(new InMemoryOrderRepository(), payments)
  return { service, charges }
}

it('adds the line, updates the total and charges only the line', async () => {
  const { service, charges } = setup()
  const order = await service.place('c1', [line])
  const updated = await service.addLine('c1', order.id, extra)
  expect(updated.totalCents).toBe(1300)
  expect(updated.lines).toHaveLength(2)
  expect(charges).toEqual([1000, 300])
  const [listed] = await service.listForCustomer('c1')
  expect(listed.totalCents).toBe(1300)
})

it('refuses another customer, charging nothing', async () => {
  const { service, charges } = setup()
  const order = await service.place('c1', [line])
  await expect(service.addLine('c2', order.id, extra)).rejects.toThrow()
  expect(charges).toEqual([1000])
})
