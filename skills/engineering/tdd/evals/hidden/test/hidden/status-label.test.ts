import { expect, it } from 'vitest'
import { statusLabel } from '../../src/ui/status-label'

it('labels each status', () => {
  expect(statusLabel('placed')).toBe('Placed')
  expect(statusLabel('cancelled')).toBe('Cancelled')
})
