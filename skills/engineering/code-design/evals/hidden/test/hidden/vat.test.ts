import { expect, it } from 'vitest'
import type { Order } from '../../src/orders/order'
import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { applyVat } from '../../src/orders/apply-vat'

class FlakyRepository extends InMemoryOrderRepository {
  failOnSave = 0
  private saves = 0

  async save(order: Order): Promise<void> {
    if (this.failOnSave && ++this.saves === this.failOnSave) throw new Error('database down')
    return super.save(order)
  }
}

const NET = [1000, 2000, 3000, 4000, 5000]

async function seed() {
  const orders = new FlakyRepository()
  for (const [i, cents] of NET.entries()) {
    await orders.save({
      id: `o${i}`,
      customerId: 'c1',
      lines: [{ sku: 'A', quantity: 1, unitPriceCents: cents }],
      totalCents: cents,
      placedAt: new Date(2026, 0, i + 1),
      chargeId: `ch_${i}`,
    })
  }
  return orders
}

async function totals(orders: InMemoryOrderRepository) {
  const saved = await orders.findByCustomer('c1')
  return saved.map((order) => order.totalCents).sort((a, b) => a - b)
}

const WITH_VAT = [1210, 2420, 3630, 4840, 6050]

it('applies VAT once', async () => {
  const orders = await seed()
  await applyVat(orders)
  expect(await totals(orders)).toEqual(WITH_VAT)
})

it('running it twice applies VAT once', async () => {
  const orders = await seed()
  await applyVat(orders)
  await applyVat(orders)
  expect(await totals(orders)).toEqual(WITH_VAT)
})

it('running it again after a crash halfway applies VAT once to every order', async () => {
  const orders = await seed()
  orders.failOnSave = 3
  await applyVat(orders).catch(() => {})
  orders.failOnSave = 0
  await applyVat(orders)
  expect(await totals(orders)).toEqual(WITH_VAT)
})
