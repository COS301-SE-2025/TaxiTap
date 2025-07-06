import { viewTaxiInfoHandler } from '../../../convex/functions/taxis/viewTaxiInfoHandler';

import { Id } from '../../../convex/_generated/dataModel';

jest.mock('convex/values', () => ({
  v: {
    id: () => jest.fn(),
    optional: (x: any) => x,
    string: () => jest.fn(),
    number: () => jest.fn(),
    boolean: () => jest.fn(),
  },
}));

describe('viewTaxiInfoHandler', () => {
  const mockId = { __tableName: 'taxiTap_users' } as Id<'taxiTap_users'>;
  const passengerId = mockId;
  const ride = { _id: 'ride1', rideId: 'RIDE123', passengerId, driverId: 'driverUser1', status: 'accepted' };
  const driverProfile = { _id: 'driver1', userId: 'driverUser1', averageRating: 4.5 };
  const taxi = { _id: 'taxi1', driverId: 'driver1', model: 'Toyota' };
  const driverUser = { _id: 'driverUser1', name: 'Alice', phoneNumber: '123456789' };

  type MockOpts = {
    rideDoc?: any,
    driverProf?: any,
    taxiDoc?: any,
    driverUsr?: any,
  };

  const createMockQueryCtx = (opts?: MockOpts) => {
    const rideDoc = opts?.rideDoc ?? ride;
    const driverProf = opts?.driverProf ?? driverProfile;
    const taxiDoc = opts?.taxiDoc ?? taxi;
    const driverUsr = opts?.driverUsr ?? driverUser;
    return {
      db: {
        query: jest.fn((table) => {
          if (table === 'rides') {
            return {
              withIndex: () => ({
                filter: () => ({ order: () => ({ first: () => Promise.resolve(rideDoc) }) })
              })
            };
          }
          if (table === 'drivers') {
            return {
              withIndex: () => ({ first: () => Promise.resolve(driverProf) })
            };
          }
          if (table === 'taxis') {
            return {
              withIndex: () => ({ first: () => Promise.resolve(taxiDoc) })
            };
          }
          return { withIndex: () => ({ first: () => Promise.resolve(undefined) }) };
        }),
        get: jest.fn(() => Promise.resolve(driverUsr)),
      },
    } as any;
  };

  it('returns taxi and driver info for active ride', async () => {
    const ctx = createMockQueryCtx();
    const args = { passengerId };
    const result = await viewTaxiInfoHandler(ctx, args);
    expect(result.taxi).toEqual(taxi);
    expect(result.driver).toEqual({
      name: 'Alice',
      phoneNumber: '123456789',
      rating: 4.5,
      userId: 'driverUser1',
    });
    expect(result.rideId).toBe('RIDE123');
    expect(result.status).toBe('accepted');
  });

  it('throws if no active ride', async () => {
    const ctx = createMockQueryCtx({ rideDoc: undefined });
    ctx.db.query = jest.fn((table) => {
      if (table === 'rides') {
        return {
          withIndex: () => ({
            filter: () => ({
              order: () => ({
                first: () => Promise.resolve(undefined)
              })
            })
          })
        };
      }
      if (table === 'drivers') {
        return {
          withIndex: () => ({ first: () => Promise.resolve(driverProfile) })
        };
      }
      if (table === 'taxis') {
        return {
          withIndex: () => ({ first: () => Promise.resolve(taxi) })
        };
      }
      return { withIndex: () => ({ first: () => Promise.resolve(undefined) }) };
    });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No active reservation found for this passenger.');
  });

  it('throws if no driver assigned', async () => {
    const ctx = createMockQueryCtx({ rideDoc: { ...ride, driverId: undefined } });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No driver assigned to this ride yet.');
  });

  it('throws if no driver profile', async () => {
    const ctx = createMockQueryCtx({ driverProf: undefined });
    ctx.db.query = jest.fn((table) => {
      if (table === 'rides') {
        return {
          withIndex: () => ({
            filter: () => ({
              order: () => ({
                first: () => Promise.resolve(ride)
              })
            })
          })
        };
      }
      if (table === 'drivers') {
        return {
          withIndex: () => ({ first: () => Promise.resolve(undefined) })
        };
      }
      if (table === 'taxis') {
        return {
          withIndex: () => ({ first: () => Promise.resolve(taxi) })
        };
      }
      return { withIndex: () => ({ first: () => Promise.resolve(undefined) }) };
    });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No driver profile found for this ride.');
  });

  it('throws if no taxi', async () => {
    const ctx = createMockQueryCtx({ taxiDoc: undefined });
    ctx.db.query = jest.fn((table) => {
      if (table === 'rides') {
        return {
          withIndex: () => ({
            filter: () => ({
              order: () => ({
                first: () => Promise.resolve(ride)
              })
            })
          })
        };
      }
      if (table === 'drivers') {
        return {
          withIndex: () => ({ first: () => Promise.resolve(driverProfile) })
        };
      }
      if (table === 'taxis') {
        return {
          withIndex: () => ({ first: () => Promise.resolve(undefined) })
        };
      }
      return { withIndex: () => ({ first: () => Promise.resolve(undefined) }) };
    });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No taxi found for this driver.');
  });
}); 