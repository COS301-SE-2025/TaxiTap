/**
 * Updates the information for a driver's taxi.
 * The driver must be authenticated.
 * All fields are optional, so only provided fields will be updated.
 */
import { updateTaxiInfoHandler } from '../../../convex/functions/taxis/updateTaxiInfoHandler';

import { Id } from '../../../convex/_generated/dataModel';

describe('updateTaxiInfoHandler', () => {
  const mockUserId = { __tableName: 'taxiTap_users' } as Id<'taxiTap_users'>;
  const driverProfile = { _id: 'driver1', userId: mockUserId };
  const taxi = { _id: 'taxi1', driverId: 'driver1' };

  const createMockMutationCtx = (driver = driverProfile, taxiDoc = taxi) => ({
    db: {
      query: jest.fn((table) => {
        if (table === 'drivers') {
          return {
            withIndex: () => ({ unique: () => Promise.resolve(driver) })
          };
        }
        if (table === 'taxis') {
          if (!driver) {
            return {
              withIndex: () => ({ unique: () => Promise.resolve(undefined) })
            };
          }
          return {
            withIndex: () => ({ unique: () => Promise.resolve(taxiDoc) })
          };
        }
        return { withIndex: () => ({ unique: () => Promise.resolve(undefined) }) };
      }),
      patch: jest.fn(() => Promise.resolve()),
    }
  }) as any;

  it('updates taxi info if driver and taxi exist', async () => {
    const ctx = createMockMutationCtx();
    const args = { userId: mockUserId, model: 'Toyota', color: 'Blue' };
    const result = await updateTaxiInfoHandler(ctx as any, args);
    expect(ctx.db.patch).toHaveBeenCalledWith('taxi1', expect.objectContaining({ model: 'Toyota', color: 'Blue' }));
    expect(result).toEqual({ success: true, taxiId: 'taxi1' });
  });

  it('throws if driver profile not found', async () => {
    const ctx = {
      db: {
        query: jest.fn((table) => {
          if (table === 'drivers') {
            return {
              withIndex: () => ({ unique: () => Promise.resolve(undefined) })
            };
          }
          // If driver is not found, taxi query should not be called, but if it is, return undefined
          return { withIndex: () => ({ unique: () => Promise.resolve(undefined) }) };
        }),
        patch: jest.fn(() => Promise.resolve()),
      }
    } as any;
    const args = { userId: mockUserId, model: 'Toyota' };
    await expect(updateTaxiInfoHandler(ctx, args)).rejects.toThrow('Could not find a driver profile for the current user.');
    expect(ctx.db.query).toHaveBeenCalledWith('drivers');
  });

  it('throws if taxi not found', async () => {
    const ctx = {
      db: {
        query: jest.fn((table) => {
          if (table === 'drivers') {
            return {
              withIndex: () => ({ unique: () => Promise.resolve(driverProfile) })
            };
          }
          if (table === 'taxis') {
            return {
              withIndex: () => ({ unique: () => Promise.resolve(undefined) })
            };
          }
          return { withIndex: () => ({ unique: () => Promise.resolve(undefined) }) };
        }),
        patch: jest.fn(() => Promise.resolve()),
      }
    } as any;
    const args = { userId: mockUserId, model: 'Toyota' };
    await expect(updateTaxiInfoHandler(ctx, args)).rejects.toThrow('Could not find a taxi for this driver.');
  });
}); 