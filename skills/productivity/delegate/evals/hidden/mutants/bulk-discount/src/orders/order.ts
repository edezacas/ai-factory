export interface OrderLine {
  sku: string
  quantity: number
  unitPriceCents: number
}

export interface Order {
  id: string
  customerId: string
  lines: OrderLine[]
  totalCents: number
  placedAt: Date
  chargeId: string
}

const BULK_UNITS = 10

export function totalCents(lines: OrderLine[]): number {
  if (lines.length === 0) throw new Error('An order needs at least one line')
  let units = 0
  const total = lines.reduce((total, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error(`Invalid quantity for ${line.sku}`)
    }
    units += line.quantity
    return total + line.quantity * line.unitPriceCents
  }, 0)
  if (units < BULK_UNITS) return total
  return total - Math.floor(total / 10)
}
