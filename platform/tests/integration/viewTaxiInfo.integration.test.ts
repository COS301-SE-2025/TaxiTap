import { viewTaxiInfoHandler } from '../../convex/functions/taxis/viewTaxiInfoHandler';

describe('viewTaxiInfo (integration)', () => {
  // Create proper Convex ID types for testing
  const passengerId = { __tableName: 'taxiTap_users' } as any;
  const ride = { _id: 'ride1', rideId: 'RIDE123', passengerId, driverId: 'driverUser1', status: 'accepted' };
  const driverProfile = { _id: 'driver1', userId: 'driverUser1', averageRating: 4.5 };
  const taxi = { _id: 'taxi1', driverId: 'driver1', model: 'Toyota' };
  const driverUser = { _id: 'driverUser1', name: 'Alice', phoneNumber: '123456789' };

  const createMockQueryCtx = (opts: any = {}) => {
    const {
      rideDoc = ride,
      driverProf = driverProfile,
      taxiDoc = taxi,
      driverUsr = driverUser,
    } = opts;
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
          return { withIndex: () => ({ first: () => Promise.resolve(null) }) };
        }),
        get: jest.fn(() => Promise.resolve(driverUsr)),
        system: {},
        normalizeId: jest.fn(),
      },
      auth: {},
      storage: {},
      runQuery: jest.fn(),
    } as any;
  };

  it('returns taxi and driver info for active ride', async () => {
    const ctx = createMockQueryCtx();
    const args = { passengerId };
    const result = await viewTaxiInfoHandler(ctx, args);
    expect(result).not.toBeNull();
    expect(result!.taxi).toEqual(taxi);
    expect(result!.driver).toEqual({
      name: 'Alice',
      phoneNumber: '123456789',
      rating: 4.5,
      userId: 'driverUser1',
    });
    expect(result!.rideId).toBe('RIDE123');
    expect(result!.status).toBe('accepted');
  });

  it('returns null if no active ride', async () => {
    const ctx = createMockQueryCtx({ rideDoc: null });
    const args = { passengerId };
    const result = await viewTaxiInfoHandler(ctx, args);
    expect(result).toBeNull();
  });

  it('returns ride info without driver details if no driver assigned', async () => {
    const ctx = createMockQueryCtx({ rideDoc: { ...ride, driverId: null } });
    const args = { passengerId };
    const result = await viewTaxiInfoHandler(ctx, args);
    expect(result).not.toBeNull();
    expect(result!.driver).toBeNull();
    expect(result!.taxi).toBeNull();
    expect(result!.rideId).toBe('RIDE123');
    expect(result!.status).toBe('accepted');
  });

  it('returns null if no driver profile', async () => {
    const ctx = createMockQueryCtx({ driverProf: null });
    const args = { passengerId };
    const result = await viewTaxiInfoHandler(ctx, args);
    expect(result).toBeNull();
  });

  it('returns null if no taxi', async () => {
    const ctx = createMockQueryCtx({ taxiDoc: null });
    const args = { passengerId };
    const result = await viewTaxiInfoHandler(ctx, args);
    expect(result).toBeNull();
  });
}); 