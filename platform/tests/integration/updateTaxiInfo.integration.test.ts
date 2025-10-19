import { updateTaxiInfoHandler } from '../../convex/functions/taxis/updateTaxiInfoHandler';

// Mock Id type for testing
type MockId<T> = string & { __tableName: T };

describe('updateTaxiInfo (integration)', () => {
  const userId = 'user1' as MockId<"taxiTap_users">;
  const driverProfile = { _id: 'driver1', userId };
  const taxi = { _id: 'taxi1', driverId: 'driver1' };

  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(() => Promise.resolve()),
        insert: jest.fn(() => Promise.resolve('newTaxi1')),
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
    expect(result).toEqual({
      success: true,
      taxiId: 'taxi1',
      created: false,
      message: "Taxi information updated successfully"
    });
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

  it('throws if taxi not found and required fields missing for creation', async () => {
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
    await expect(updateTaxiInfoHandler(ctx, args)).rejects.toThrow('License plate, model, color, year, and capacity are required to create a new taxi.');
  });

  it('creates a new taxi if taxi not found and all required fields provided', async () => {
    ctx.db.query.mockImplementation((table: string) => {
      if (table === 'drivers') {
        return { withIndex: () => ({ unique: () => Promise.resolve(driverProfile) }) };
      }
      if (table === 'taxis') {
        return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
      }
      return { withIndex: () => ({ unique: () => Promise.resolve(null) }) };
    });
    const args = {
      userId,
      licensePlate: 'ABC123',
      model: 'Toyota',
      color: 'Blue',
      year: 2023,
      capacity: 4
    };
    const result = await updateTaxiInfoHandler(ctx, args);
    expect(ctx.db.insert).toHaveBeenCalledWith('taxis', expect.objectContaining({
      driverId: 'driver1',
      licensePlate: 'ABC123',
      model: 'Toyota',
      color: 'Blue',
      year: 2023,
      capacity: 4,
    }));
    expect(result).toEqual({
      success: true,
      taxiId: 'newTaxi1',
      created: true,
      message: "Taxi created successfully"
    });
  });
}); 