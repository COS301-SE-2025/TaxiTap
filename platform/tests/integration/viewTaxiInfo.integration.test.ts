import { viewTaxiInfoHandler } from '../../../platform/convex/functions/taxis/viewTaxiInfoHandler';

describe('viewTaxiInfo (integration)', () => {
  const passengerId = 'passenger1';
  const ride = { _id: 'ride1', rideId: 'RIDE123', passengerId, driverId: 'driverUser1', status: 'accepted' };
  const driverProfile = { _id: 'driver1', userId: 'driverUser1', averageRating: 4.5 };
  const taxi = { _id: 'taxi1', driverId: 'driver1', model: 'Toyota' };
  const driverUser = { _id: 'driverUser1', name: 'Alice', phoneNumber: '123456789' };

  const createMockQueryCtx = (opts = {}) => {
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
      },
    };
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
    const ctx = createMockQueryCtx({ rideDoc: null });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No active reservation found for this passenger.');
  });

  it('throws if no driver assigned', async () => {
    const ctx = createMockQueryCtx({ rideDoc: { ...ride, driverId: null } });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No driver assigned to this ride yet.');
  });

  it('throws if no driver profile', async () => {
    const ctx = createMockQueryCtx({ driverProf: null });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No driver profile found for this ride.');
  });

  it('throws if no taxi', async () => {
    const ctx = createMockQueryCtx({ taxiDoc: null });
    const args = { passengerId };
    await expect(viewTaxiInfoHandler(ctx, args)).rejects.toThrow('No taxi found for this driver.');
  });
}); 