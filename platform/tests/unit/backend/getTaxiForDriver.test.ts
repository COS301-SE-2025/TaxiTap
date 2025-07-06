import { getTaxiForDriverHandler } from '../../../convex/functions/taxis/getTaxiForDriverHandler';

import { Id } from '../../../convex/_generated/dataModel';

describe('getTaxiForDriverHandler', () => {
  const mockUserId = { __tableName: 'taxiTap_users' } as Id<'taxiTap_users'>;
  const driverProfile = { _id: 'driver1', userId: mockUserId };
  const taxi = { _id: 'taxi1', driverId: 'driver1' };

  const createMockQueryCtx = (driver = driverProfile, taxiDoc = taxi) => ({
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
      })
    }
  }) as any;

  it('returns taxi if driver and taxi exist', async () => {
    const ctx = createMockQueryCtx(driverProfile, taxi);
    const args = { userId: mockUserId };
    const result = await getTaxiForDriverHandler(ctx, args);
    expect(result).toEqual(taxi);
  });

  it('returns null if driver profile not found', async () => {
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
        })
      }
    } as any;
    const args = { userId: mockUserId };
    const result = await getTaxiForDriverHandler(ctx, args);
    expect(result).toBeNull();
    expect(ctx.db.query).toHaveBeenCalledWith('drivers');
  });

  it('returns null if taxi not found', async () => {
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
        })
      }
    } as any;
    const args = { userId: mockUserId };
    const result = await getTaxiForDriverHandler(ctx, args);
    expect(result).toBeNull();
  });
}); 