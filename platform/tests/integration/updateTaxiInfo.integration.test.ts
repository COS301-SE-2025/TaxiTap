import { updateTaxiInfoHandler } from '../../../platform/convex/functions/taxis/updateTaxiInfoHandler';

describe('updateTaxiInfo (integration)', () => {
  const userId = 'user1';
  const driverProfile = { _id: 'driver1', userId };
  const taxi = { _id: 'taxi1', driverId: 'driver1' };

  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(() => Promise.resolve()),
      },
    } as any;
  });

  it('updates taxi info if driver and taxi exist', async () => {
    ctx.db.query.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return { withIndex: () => ({ unique: () => Promise.resolve(driverProfile) }) };
      }
      if (table === 'taxis') {
        return { withIndex: () => ({ unique: () => Promise.resolve(taxi) }) };
      }
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = { userId, model: 'Toyota', color: 'Blue' };
    const result = await updateTaxiInfoHandler(ctx, args);
    expect(ctx.db.patch).toHaveBeenCalledWith('taxi1', expect.objectContaining({ model: 'Toyota', color: 'Blue' }));
    expect(result).toEqual({ success: true, taxiId: 'taxi1' });
  });

  it('throws if driver profile not found', async () => {
    ctx.db.query.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
      }
      if (table === 'taxis') {
        return { withIndex: () => ({ unique: () => Promise.resolve(taxi) }) };
      }
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = { userId, model: 'Toyota' };
    await expect(updateTaxiInfoHandler(ctx, args)).rejects.toThrow('Could not find a driver profile for the current user.');
  });

  it('throws if taxi not found', async () => {
    ctx.db.query.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return { withIndex: () => ({ unique: () => Promise.resolve(driverProfile) }) };
      }
      if (table === 'taxis') {
        return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
      }
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = { userId, model: 'Toyota' };
    await expect(updateTaxiInfoHandler(ctx, args)).rejects.toThrow('Could not find a taxi for this driver.');
  });
}); 