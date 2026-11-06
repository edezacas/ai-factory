import { expect, it } from 'vitest'
import { line, setup } from './support'

it('returns the total without charging or saving', async () => {
  const { service, charges } = setup()
  const quoted = await service.quote([line(150), line(250)])
  expect(quoted).toBe(400)
  expect(charges).toEqual([])
  expect(await service.listForCustomer('c1')).toEqual([])
})
