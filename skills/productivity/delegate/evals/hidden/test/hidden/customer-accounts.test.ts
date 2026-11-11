import { describe, expect, it } from 'vitest'
import { checkout } from '../../src/clients/storefront'
import { InMemoryCustomerRepository } from '../../src/customers/customer-repository'
import type { EmailSender } from '../../src/notifications/email-sender'
import type { Order } from '../../src/orders/order'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'
import type { PaymentGateway } from '../../src/payments/payment-gateway'

const a = { sku: 'A', quantity: 2, unitPriceCents: 500 }
const b = { sku: 'B', quantity: 1, unitPriceCents: 300 }
const c = { sku: 'C', quantity: 3, unitPriceCents: 100 }
const placedAt = new Date('2026-01-01T10:00:00Z')
const HOUR = 60 * 60 * 1000

async function setup({ emailFails = false, refundFails = false } = {}) {
  let current = placedAt
  const charges: number[] = []
  const refunds: { chargeId: string; amountCents: number }[] = []
  const confirmations: { to: string; order: Order }[] = []
  const lineEmails: { to: string; orderId: string; sku: string }[] = []
  const payments: PaymentGateway = {
    charge: async (_customerId, amountCents) => {
      charges.push(amountCents)
      return { chargeId: `charge-${charges.length}` }
    },
    refund: async (chargeId, amountCents) => {
      // Yields first, as a real provider would, so concurrent cancels interleave.
      await new Promise((resolve) => setTimeout(resolve, 5))
      if (refundFails) throw new Error('refund declined')
      refunds.push({ chargeId, amountCents })
    },
  }
  const sender: EmailSender = {
    sendOrderConfirmation: async (to, order) => {
      if (emailFails) throw new Error('email down')
      confirmations.push({ to, order })
    },
    sendLineCancellation: async (to, order, sku) => {
      if (emailFails) throw new Error('email down')
      lineEmails.push({ to, orderId: order.id, sku })
    },
  }
  const customers = new InMemoryCustomerRepository()
  await customers.save({ id: 'c1', email: 'c1@example.com' })
  await customers.save({ id: 'c2', email: 'c2@example.com' })
  const orders = new InMemoryOrderRepository()
  const service = new OrderService(orders, customers, payments, sender, () => current)
  const at = (ms: number) => {
    current = new Date(placedAt.getTime() + ms)
  }
  const stored = async (customerId: string, orderId: string) =>
    (await service.listForCustomer(customerId)).find((o) => o.id === orderId)!
  return { service, orders, charges, refunds, confirmations, lineEmails, at, stored }
}

const lineStatus = (order: Order, sku: string) => order.lines.find((l) => l.sku === sku)?.status ?? 'active'

describe('placing with customer accounts', () => {
  it('emails the confirmation to the address in the customer store', async () => {
    const { service, confirmations } = await setup()
    const order = await service.place('c1', [a])
    expect(confirmations).toHaveLength(1)
    expect(confirmations[0].to).toBe('c1@example.com')
    expect(confirmations[0].order.id).toBe(order.id)
  })

  it('fails for an unknown customer, charging and saving nothing', async () => {
    const { service, orders, charges } = await setup()
    await expect(service.place('nobody', [a])).rejects.toThrow(/^Customer not found$/)
    expect(charges).toEqual([])
    expect(await orders.findByCustomer('nobody')).toEqual([])
  })

  it('fails on a repeated sku, charging and saving nothing', async () => {
    const { service, charges } = await setup()
    await expect(service.place('c1', [a, { ...b, sku: 'A' }])).rejects.toThrow(/^Duplicate sku$/)
    expect(charges).toEqual([])
    expect(await service.listForCustomer('c1')).toEqual([])
  })

  it('no longer takes an email, and neither does the storefront', async () => {
    const { service } = await setup()
    // @ts-expect-error the email parameter was removed in the contract step
    void (() => service.place('c1', 'c1@example.com', [a]))
    // @ts-expect-error checkout stopped taking an email in the migrate step
    void (() => checkout(service, 'c1', 'c1@example.com', [a]))
    const result = await checkout(service, 'c1', [a, b])
    expect(result.totalCents).toBe(1300)
    expect((await service.listForCustomer('c1'))[0].id).toBe(result.orderId)
  })
})

describe('cancelling a line', () => {
  it('refunds the line on the original charge, keeps it as cancelled and lowers the total', async () => {
    const { service, refunds, at, stored } = await setup()
    const order = await service.place('c1', [a, b])
    at(24 * HOUR - 1)
    await service.cancelLine('c1', order.id, 'B')
    expect(refunds).toEqual([{ chargeId: order.chargeId, amountCents: 300 }])
    const after = await stored('c1', order.id)
    expect(after.lines.map((l) => [l.sku, lineStatus(after, l.sku)])).toEqual([
      ['A', 'active'],
      ['B', 'cancelled'],
    ])
    expect(after.totalCents).toBe(1000)
    expect(after.status).toBe('placed')
  })

  it('emails the cancelled line to the address in the store', async () => {
    const { service, lineEmails } = await setup()
    const order = await service.place('c1', [a, b])
    await service.cancelLine('c1', order.id, 'A')
    expect(lineEmails).toEqual([{ to: 'c1@example.com', orderId: order.id, sku: 'A' }])
  })

  it('keeps the line cancelled when the email fails', async () => {
    const { service, refunds, stored } = await setup({ emailFails: true })
    const order = await service.place('c1', [a, b])
    await service.cancelLine('c1', order.id, 'A')
    expect(refunds).toHaveLength(1)
    expect(lineStatus(await stored('c1', order.id), 'A')).toBe('cancelled')
  })

  it('leaves the line active when the refund fails', async () => {
    const { service, stored } = await setup({ refundFails: true })
    const order = await service.place('c1', [a, b])
    await expect(service.cancelLine('c1', order.id, 'A')).rejects.toThrow()
    const after = await stored('c1', order.id)
    expect(lineStatus(after, 'A')).toBe('active')
    expect(after.totalCents).toBe(1300)
  })

  it('cancels the order when its last active line is cancelled', async () => {
    const { service, refunds, stored } = await setup()
    const order = await service.place('c1', [a, b])
    await service.cancelLine('c1', order.id, 'A')
    await service.cancelLine('c1', order.id, 'B')
    expect(refunds.map((r) => r.amountCents)).toEqual([1000, 300])
    expect((await stored('c1', order.id)).status).toBe('cancelled')
  })

  it('refunds only what is left when the order is cancelled after a line, with no email', async () => {
    const { service, refunds, lineEmails } = await setup()
    const order = await service.place('c1', [a, b, c])
    await service.cancelLine('c1', order.id, 'A')
    await service.cancel('c1', order.id)
    expect(refunds.map((r) => r.amountCents)).toEqual([1000, 600])
    expect(lineEmails).toHaveLength(1)
  })

  it('rejects at exactly 24 hours and once shipped, with no refund', async () => {
    const { service, refunds, at, stored } = await setup()
    const late = await service.place('c1', [a, b])
    const shipped = await service.place('c1', [a, b])
    await service.markShipped(shipped.id)
    at(24 * HOUR)
    await expect(service.cancelLine('c1', late.id, 'A')).rejects.toThrow(/^Cancellation window has passed$/)
    at(HOUR)
    await expect(service.cancelLine('c1', shipped.id, 'A')).rejects.toThrow(/^Order already shipped$/)
    expect(refunds).toEqual([])
    expect(lineStatus(await stored('c1', late.id), 'A')).toBe('active')
  })

  it("rejects another customer's order as not found, and an unknown sku", async () => {
    const { service, refunds } = await setup()
    const order = await service.place('c1', [a, b])
    await expect(service.cancelLine('c2', order.id, 'A')).rejects.toThrow(/^Order not found$/)
    await expect(service.cancelLine('c1', order.id, 'Z')).rejects.toThrow(/^Line not found$/)
    expect(refunds).toEqual([])
  })

  it('rejects a line already cancelled and refunds it once', async () => {
    const { service, refunds } = await setup()
    const order = await service.place('c1', [a, b])
    await service.cancelLine('c1', order.id, 'A')
    await expect(service.cancelLine('c1', order.id, 'A')).rejects.toThrow(/^Line already cancelled$/)
    expect(refunds).toHaveLength(1)
  })

  it('refunds once when two cancels of the same line run at the same time', async () => {
    const { service, refunds } = await setup()
    const order = await service.place('c1', [a, b])
    const results = await Promise.allSettled([
      service.cancelLine('c1', order.id, 'A'),
      service.cancelLine('c1', order.id, 'A'),
    ])
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason.message).toBe('Line already cancelled')
    expect(refunds).toHaveLength(1)
  })

  it('cancels both when two different lines are cancelled at the same time', async () => {
    const { service, refunds, stored } = await setup()
    const order = await service.place('c1', [a, b, c])
    await Promise.all([service.cancelLine('c1', order.id, 'A'), service.cancelLine('c1', order.id, 'B')])
    expect(refunds.map((r) => r.amountCents).sort((x, y) => x - y)).toEqual([300, 1000])
    const after = await stored('c1', order.id)
    expect([lineStatus(after, 'A'), lineStatus(after, 'B'), lineStatus(after, 'C')]).toEqual([
      'cancelled',
      'cancelled',
      'active',
    ])
    expect(after.totalCents).toBe(300)
  })
})
