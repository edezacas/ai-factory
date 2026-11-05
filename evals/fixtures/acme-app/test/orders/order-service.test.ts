import { describe, expect, it } from 'vitest'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'
import type { PaymentGateway } from '../../src/payments/payment-gateway'

const line = { sku: 'A', quantity: 2, unitPriceCents: 500 }

function serviceAt(times: Date[]) {
  const charges: number[] = []
  const payments: PaymentGateway = {
    charge: async (_customerId, amountCents) => {
      charges.push(amountCents)
      return { chargeId: `charge-${charges.length}` }
    },
  }
  const clock = [...times]
  const service = new OrderService(new InMemoryOrderRepository(), payments, () => clock.shift()!)
  return { service, charges }
}

describe('OrderService', () => {
  it('charges the total and returns the placed order', async () => {
    const placedAt = new Date('2026-01-01T10:00:00Z')
    const { service, charges } = serviceAt([placedAt])

    const order = await service.place('c1', [line])

    expect(charges).toEqual([1000])
    expect(order).toMatchObject({ customerId: 'c1', totalCents: 1000, chargeId: 'charge-1', placedAt })
  })

  it('lists only the orders of a customer, newest first', async () => {
    const { service } = serviceAt([
      new Date('2026-01-01T10:00:00Z'),
      new Date('2026-01-01T10:30:00Z'),
      new Date('2026-01-01T11:00:00Z'),
    ])
    const first = await service.place('c1', [line])
    await service.place('c2', [line])
    const third = await service.place('c1', [line])

    const orders = await service.listForCustomer('c1')

    expect(orders.map((order) => order.id)).toEqual([third.id, first.id])
  })
})
