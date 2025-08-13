import { getTaxiForDriverHandler } from '../../../platform/convex/functions/taxis/getTaxiForDriverHandler';

// Mock Id type for testing
type MockId<T> = string & { __tableName: T };

describe('getTaxiForDriver (integration)', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
      },
    } as any;
  });

  it('returns taxi if driver and taxi exist', async () => {
    const driverProfile = { _id: 'driver1', userId: 'user1' };
    const taxi = { _id: 'taxi1', driverId: 'driver1' };
    ctx.db.query.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return { withIndex: () => ({ unique: () => Promise.resolve(driverProfile) }) };
      }
      if (table === 'taxis') {
        return { withIndex: () => ({ unique: () => Promise.resolve(taxi) }) };
      }
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = { userId: 'user1' as MockId<"taxiTap_users"> };
    const result = await getTaxiForDriverHandler(ctx, args);
    expect(result).toEqual(taxi);
  });

  it('returns null if driver profile not found', async () => {
    ctx.db.query.mockImplementation((table: string) => {
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = { userId: 'user1' as MockId<"taxiTap_users"> };
    const result = await getTaxiForDriverHandler(ctx, args);
    expect(result).toBeNull();
  });

  it('returns null if taxi not found', async () => {
    const driverProfile = { _id: 'driver1', userId: 'user1' };
    ctx.db.query.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return { withIndex: () => ({ unique: () => Promise.resolve(driverProfile) }) };
      }
      if (table === 'taxis') {
        return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
      }
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = { userId: 'user1' as MockId<"taxiTap_users"> };
    const result = await getTaxiForDriverHandler(ctx, args);
    expect(result).toBeNull();
  });
}); 