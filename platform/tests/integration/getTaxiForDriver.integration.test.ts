import { getTaxiForDriverHandler } from '../../convex/functions/taxis/getTaxiForDriverHandler';

// Mock Id type for testing
type MockId<T> = string & { __tableName: T };

describe('getTaxiForDriver (integration)', () => {
  it('returns taxi if driver and taxi exist', async () => {
    const driverProfile = { _id: 'driver1', userId: 'user1' };
    const taxi = { _id: 'taxi1', driverId: 'driver1' };
    
    const ctx = {
      db: {
        query: jest.fn((table: string) => {
          if (table === 'drivers') {
            return {
              withIndex: jest.fn(() => ({
                unique: jest.fn(() => Promise.resolve(driverProfile))
              }))
            };
          }
          if (table === 'taxis') {
            return {
              withIndex: jest.fn(() => ({
                unique: jest.fn(() => Promise.resolve(taxi))
              }))
            };
          }
          return {
            withIndex: jest.fn(() => ({
              unique: jest.fn(() => Promise.resolve(null))
            }))
          };
        })
      }
    };

    const args = { userId: 'user1' as MockId<"taxiTap_users"> };
    const result = await getTaxiForDriverHandler(ctx as any, args);
    
    expect(result).toEqual(taxi);
  });

  it('returns null if driver profile not found', async () => {
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            unique: jest.fn(() => Promise.resolve(null))
          }))
        }))
      }
    };

    const args = { userId: 'user1' as MockId<"taxiTap_users"> };
    const result = await getTaxiForDriverHandler(ctx as any, args);
    
    expect(result).toBeNull();
  });

  it('returns null if taxi not found', async () => {
    const driverProfile = { _id: 'driver1', userId: 'user1' };
    
    const ctx = {
      db: {
        query: jest.fn((table: string) => {
          if (table === 'drivers') {
            return {
              withIndex: jest.fn(() => ({
                unique: jest.fn(() => Promise.resolve(driverProfile))
              }))
            };
          }
          return {
            withIndex: jest.fn(() => ({
              unique: jest.fn(() => Promise.resolve(null))
            }))
          };
        })
      }
    };

    const args = { userId: 'user1' as MockId<"taxiTap_users"> };
    const result = await getTaxiForDriverHandler(ctx as any, args);
    
    expect(result).toBeNull();
  });
}); 