import { expect, it } from 'vitest'
import { boot } from '../src/index'

it('exports boot', () => {
  expect(typeof boot).toBe('function')
})
