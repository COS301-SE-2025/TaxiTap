import { getRideByIdHandler } from '../../convex/functions/rides/getRideById';

describe('getRideById Integration', () => {
  it('should return the ride by rideId', async () => {
    const ride = { 
      _id: 'ride9', 
      rideId: 'ride9', 
      status: 'requested', 
      passengerId: 'user1', 
      driverId: 'user2' 
    };
    
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            first: jest.fn(() => Promise.resolve(ride))
          }))
        }))
      }
    };

    const result = await getRideByIdHandler(ctx as any, { rideId: 'ride9' });
    
    expect(result.rideId).toBe('ride9');
  });

  it('should throw if ride not found', async () => {
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            first: jest.fn(() => Promise.resolve(null))
          }))
        }))
      }
    };

    await expect(getRideByIdHandler(ctx as any, { rideId: 'notfound' }))
      .rejects.toThrow('Ride not found');
  });
}); 