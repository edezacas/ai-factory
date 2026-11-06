import { expect, it } from 'vitest'
import { line, setup } from './support'

it('adds the flat fee to the charged total', async () => {
  const { service, charges } = setup()
  await service.place('c1', [line(1000)])
  expect(charges).toEqual([1500])
})
