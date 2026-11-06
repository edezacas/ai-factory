import { InMemoryOrderRepository } from '../../src/orders/order-repository'
import { OrderService } from '../../src/orders/order-service'

export function setup() {
  const charges: number[] = []
  const payments = {
    charge: async (_customerId: string, amountCents: number) => {
      charges.push(amountCents)
      return { chargeId: `charge-${charges.length}` }
    },
  }
  const orders = new InMemoryOrderRepository()
  return { service: new OrderService(orders, payments), charges, orders }
}

export const line = (unitPriceCents: number) => ({ sku: 'A', quantity: 1, unitPriceCents })
