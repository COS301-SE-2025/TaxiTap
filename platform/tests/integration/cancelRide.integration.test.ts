import { cancelRideHandler } from '../../convex/functions/rides/cancelRideHandler';

describe('cancelRide Integration', () => {
  it('should allow a passenger to cancel a ride', async () => {
    const ride = { 
      _id: 'ride3', 
      rideId: 'ride3', 
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
        patch: jest.fn(() => Promise.resolve('ride3'))
      },
      runMutation: jest.fn(() => Promise.resolve())
    };

    const result = await cancelRideHandler(ctx as any, { rideId: 'ride3', userId: 'user1' });
    
    expect(result).toBeDefined();
    expect(result.message).toBe('Ride cancelled successfully');
    expect(ctx.db.patch).toHaveBeenCalledWith('ride3', { status: 'cancelled' });
    expect(ctx.runMutation).toHaveBeenCalled();
  });

  it('should allow a driver to cancel a ride', async () => {
    const ride = { 
      _id: 'ride4', 
      rideId: 'ride4', 
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
        patch: jest.fn(() => Promise.resolve('ride4'))
      },
      runMutation: jest.fn(() => Promise.resolve())
    };

    const result = await cancelRideHandler(ctx as any, { rideId: 'ride4', userId: 'user2' });
    
    expect(result).toBeDefined();
    expect(result.message).toBe('Ride cancelled successfully');
    expect(ctx.db.patch).toHaveBeenCalledWith('ride4', { status: 'cancelled' });
    expect(ctx.runMutation).toHaveBeenCalled();
  });

  it('should not allow unauthorized user to cancel', async () => {
    const ride = { 
      _id: 'ride5', 
      rideId: 'ride5', 
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
        }))
      }
    };

    await expect(cancelRideHandler(ctx as any, { rideId: 'ride5', userId: 'user3' }))
      .rejects.toThrow('User is not authorized to cancel this ride');
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

    await expect(cancelRideHandler(ctx as any, { rideId: 'notfound', userId: 'user1' }))
      .rejects.toThrow('Ride not found');
  });
});