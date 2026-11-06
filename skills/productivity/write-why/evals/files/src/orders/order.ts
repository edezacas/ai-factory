import { randomInt } from 'node:crypto'

export interface OrderLine {
  sku: string
  quantity: number
  unitPriceCents: number
}

export interface Order {
  id: string
  reference: string
  customerId: string
  lines: OrderLine[]
  totalCents: number
  placedAt: Date
  chargeId: string
}

const REFERENCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function newReference(): string {
  const suffix = Array.from({ length: 8 }, () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)])
  return `ACME-${suffix.join('')}`
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
