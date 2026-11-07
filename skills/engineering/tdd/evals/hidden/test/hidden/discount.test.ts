import { expect, it } from 'vitest'
import { discountCents } from '../../src/orders/discount'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'

it('applies the tiers to the order total, rounding down', () => {
  expect(discountCents(9999)).toBe(0)
  expect(discountCents(10000)).toBe(500)
  expect(discountCents(12345)).toBe(617)
  expect(discountCents(49999)).toBe(2499)
  expect(discountCents(50000)).toBe(5000)
})

it('charges the discounted amount and keeps the lines total', async () => {
  const charges: number[] = []
  const payments = {
    charge: async (_customerId: string, amountCents: number) => {
      charges.push(amountCents)
      return { chargeId: 'charge-1' }
    },
  }
  const service = new OrderService(new InMemoryOrderRepository(), payments)
  const order = await service.place('c1', [{ sku: 'A', quantity: 2, unitPriceCents: 10000 }])
  expect(charges).toEqual([19000])
  expect(order.totalCents).toBe(20000)
})
