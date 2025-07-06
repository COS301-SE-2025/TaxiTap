// tests/unit/backend/createLocation.test.ts
/* eslint-disable */
// @ts-nocheck   — this spec focuses on behaviour, not types

import { jest } from '@jest/globals'

/* ──────────────────────────────────────────────────────────────
   1️⃣  Stub Convex helpers so the real module can load
   ────────────────────────────────────────────────────────────── */
jest.mock('convex/values', () => {
  const stub = () => ({})
  return {
    v: Object.assign(stub, {
      id: stub,
      number: stub,
      literal: stub,
      union: stub,
    }),
  }
})

const fakeServer = {
  mutation: (cfg: any) => ({ handler: cfg.handler }),
}
jest.mock('convex/_generated/server', () => fakeServer, { virtual: true })
jest.mock('../../../convex/_generated/server', () => fakeServer, { virtual: true })
jest.mock('../../_generated/server', () => fakeServer, { virtual: true })

/* ──────────────────────────────────────────────────────────────
   2️⃣  Import the real mutation AFTER the stubs
   ────────────────────────────────────────────────────────────── */
import { createLocation } from '../../../convex/functions/locations/createLocation'

/* ──────────────────────────────────────────────────────────────
   3️⃣  Helper to fabricate a ctx with spies
   ────────────────────────────────────────────────────────────── */
const buildCtx = (existingDoc: any | null) => {
  const insert = jest.fn().mockResolvedValue('loc_new')
  const first  = jest.fn().mockResolvedValue(existingDoc)
  const query  = jest.fn(() => ({
    withIndex: () => ({ first }),
  }))
  return { ctx: { db: { query, insert } } as any, insert, first }
}

/* ──────────────────────────────────────────────────────────────
   4️⃣  Specs
   ────────────────────────────────────────────────────────────── */
describe('createLocation mutation', () => {
  const callArgs = {
    userId: 'user_456',
    latitude : 34.05,
    longitude: -118.25,
    role     : 'driver',
  }

  it('inserts when no existing document is found', async () => {
    const { ctx, insert } = buildCtx(null)

    await (createLocation as any).handler(ctx, callArgs)

    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(
      'locations',
      expect.objectContaining({
        userId   : callArgs.userId,
        latitude : callArgs.latitude,
        longitude: callArgs.longitude,
        role     : callArgs.role,
        updatedAt: expect.any(String),
      }),
    )
  })

  it('skips insert when a location already exists for the user', async () => {
    const existing = { _id: 'loc1', userId: callArgs.userId }
    const { ctx, insert } = buildCtx(existing)

    await (createLocation as any).handler(ctx, callArgs)

    expect(insert).not.toHaveBeenCalled()
  })
})
