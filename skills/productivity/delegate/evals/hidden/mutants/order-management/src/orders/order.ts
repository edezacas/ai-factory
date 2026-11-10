export interface OrderLine {
  sku: string
  quantity: number
  unitPriceCents: number
}

export type OrderStatus = 'placed' | 'shipped' | 'cancelled'

export interface Order {
  id: string
  customerId: string
  lines: OrderLine[]
  totalCents: number
  placedAt: Date
  chargeId: string
  status: OrderStatus
}

export function totalCents(lines: OrderLine[]): number {
  if (lines.length === 0) throw new Error('An order needs at least one line')
  return lines.reduce((total, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error(`Invalid quantity for ${line.sku}`)
    }
    return total + line.quantity * line.unitPriceCents
  }, 0)
}
