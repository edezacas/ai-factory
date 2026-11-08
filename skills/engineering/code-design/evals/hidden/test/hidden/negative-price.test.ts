import { expect, it } from 'vitest'
import { line, setup } from './support'

it('rejects a line with a negative price and charges nothing', async () => {
  const { service, charges } = setup()
  await expect(service.place('c1', [line(1000), line(-100)])).rejects.toThrow()
  expect(charges).toEqual([])
})

it('still accepts a free line', async () => {
  const { service, charges } = setup()
  await service.place('c1', [line(1000), line(0)])
  expect(charges).toEqual([1000])
})
