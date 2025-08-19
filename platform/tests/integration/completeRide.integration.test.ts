import { completeRideHandler } from '../../convex/functions/rides/completeRideHandler';

describe('completeRide Integration', () => {
  it('should complete a ride and update its status', async () => {
    const ride = { 
      _id: 'ride6', 
      rideId: 'ride6', 
      status: 'accepted', 
      passengerId: 'user1', 
      driverId: 'user2' 
    };
    
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            first: jest.fn(() => Promise.resolve(ride))
          }))
        })),
        patch: jest.fn(() => Promise.resolve('ride6'))
      },
      runMutation: jest.fn(() => Promise.resolve())
    };

    const result = await completeRideHandler(ctx as any, { rideId: 'ride6', driverId: 'user2' });
    
    expect(result.message).toBe('Ride marked as completed.');
    expect(ctx.db.patch).toHaveBeenCalledWith('ride6', {
      status: 'completed',
      completedAt: expect.any(Number)
    });
    expect(ctx.runMutation).toHaveBeenCalled();
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

    await expect(completeRideHandler(ctx as any, { rideId: 'notfound', driverId: 'user2' }))
      .rejects.toThrow('Ride not found');
  });

  it('should throw if ride is not in accepted state', async () => {
    const ride = { 
      _id: 'ride7', 
      rideId: 'ride7', 
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

    await expect(completeRideHandler(ctx as any, { rideId: 'ride7', driverId: 'user2' }))
      .rejects.toThrow('Ride is not in progress');
  });

  it('should throw if another driver tries to complete', async () => {
        const ride = { 
          _id: 'ride8', 
          rideId: 'ride8', 
          status: 'accepted', 
          passengerId: 'user1', 
          driverId: 'driverA' 
        };
      });
    });