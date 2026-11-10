import { describe, expect, it } from 'vitest'
import type { EmailSender } from '../../src/notifications/email-sender'
import type { Order } from '../../src/orders/order'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'
import type { PaymentGateway } from '../../src/payments/payment-gateway'

const line = { sku: 'A', quantity: 2, unitPriceCents: 500 }
const placedAt = new Date('2026-01-01T10:00:00Z')
const HOUR = 60 * 60 * 1000

function setup({ emailFails = false, refundFails = false } = {}) {
  let current = placedAt
  const charges: number[] = []
  const refunds: { chargeId: string; amountCents: number }[] = []
  const emails: { to: string; order: Order }[] = []
  const payments: PaymentGateway = {
    charge: async (_customerId, amountCents) => {
      charges.push(amountCents)
      return { chargeId: `charge-${charges.length}` }
    },
    refund: async (chargeId, amountCents) => {
      if (refundFails) throw new Error('refund declined')
      refunds.push({ chargeId, amountCents })
    },
  }
  const sender: EmailSender = {
    sendOrderConfirmation: async (to, order) => {
      if (emailFails) throw new Error('email down')
      emails.push({ to, order })
    },
  }
  const service = new OrderService(new InMemoryOrderRepository(), payments, sender, () => current)
  const at = (ms: number) => {
    current = new Date(placedAt.getTime() + ms)
  }
  const statusOf = async (customerId: string, orderId: string) =>
    (await service.listForCustomer(customerId)).find((o) => o.id === orderId)?.status
  return { service, charges, refunds, emails, at, statusOf }
}

const errorOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (err) {
    return (err as Error).message
  }
  throw new Error('expected a rejection')
}

describe('placing an order', () => {
  it('charges the total, saves it as placed and emails the confirmation to the given address', async () => {
    const { service, charges, emails, statusOf } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    expect(charges).toEqual([1000])
    expect(order).toMatchObject({ customerId: 'c1', totalCents: 1000, status: 'placed', placedAt })
    expect(emails).toHaveLength(1)
    expect(emails[0].to).toBe('c1@example.com')
    expect(emails[0].order.id).toBe(order.id)
    expect(await statusOf('c1', order.id)).toBe('placed')
  })

  it('keeps the order placed when the email fails', async () => {
    const { service, statusOf } = setup({ emailFails: true })
    const order = await service.place('c1', 'c1@example.com', [line])
    expect(order.status).toBe('placed')
    expect(await statusOf('c1', order.id)).toBe('placed')
  })
})

describe('listing', () => {
  it('lists only the customer orders, newest first, cancelled ones included with their status', async () => {
    const { service, at } = setup()
    const first = await service.place('c1', 'c1@example.com', [line])
    at(HOUR)
    await service.place('c2', 'c2@example.com', [line])
    at(2 * HOUR)
    const third = await service.place('c1', 'c1@example.com', [line])
    await service.cancel('c1', first.id)
    const orders = await service.listForCustomer('c1')
    expect(orders.map((o) => [o.id, o.status])).toEqual([
      [third.id, 'placed'],
      [first.id, 'cancelled'],
    ])
  })
})

describe('shipping', () => {
  it('marks an order as shipped', async () => {
    const { service, statusOf } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    await service.markShipped(order.id)
    expect(await statusOf('c1', order.id)).toBe('shipped')
  })
})

describe('cancelling', () => {
  it('refunds the full total to the original charge and marks the order cancelled', async () => {
    const { service, refunds, emails, at, statusOf } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    at(24 * HOUR - 1)
    await service.cancel('c1', order.id)
    expect(refunds).toEqual([{ chargeId: order.chargeId, amountCents: 1000 }])
    expect(await statusOf('c1', order.id)).toBe('cancelled')
    expect(emails).toHaveLength(1)
  })

  it('rejects at exactly 24 hours, with no refund', async () => {
    const { service, refunds, at, statusOf } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    at(24 * HOUR)
    await expect(service.cancel('c1', order.id)).rejects.toThrow()
    expect(refunds).toEqual([])
    expect(await statusOf('c1', order.id)).toBe('placed')
  })

  it('rejects a shipped order, with no refund', async () => {
    const { service, refunds, statusOf } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    await service.markShipped(order.id)
    await expect(service.cancel('c1', order.id)).rejects.toThrow()
    expect(refunds).toEqual([])
    expect(await statusOf('c1', order.id)).toBe('shipped')
  })

  it("rejects another customer's order with the same error as a missing one, with no refund", async () => {
    const { service, refunds, statusOf } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    const missing = await errorOf(service.cancel('c2', 'no-such-order'))
    const foreign = await errorOf(service.cancel('c2', order.id))
    expect(foreign).toBe(missing)
    expect(refunds).toEqual([])
    expect(await statusOf('c1', order.id)).toBe('placed')
  })

  it('rejects an order already cancelled and refunds only once', async () => {
    const { service, refunds } = setup()
    const order = await service.place('c1', 'c1@example.com', [line])
    await service.cancel('c1', order.id)
    await expect(service.cancel('c1', order.id)).rejects.toThrow()
    expect(refunds).toHaveLength(1)
  })

  it('leaves the order placed when the refund fails', async () => {
    const { service, statusOf } = setup({ refundFails: true })
    const order = await service.place('c1', 'c1@example.com', [line])
    await expect(service.cancel('c1', order.id)).rejects.toThrow()
    expect(await statusOf('c1', order.id)).toBe('placed')
  })
})
