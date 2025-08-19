import { acceptRideHandler } from '../../convex/functions/rides/acceptRideHandler';
import { createMockCtx } from './ridesTestUtils';

describe('acceptRide Integration', () => {
  it('should accept a ride and update its status', async () => {
    const { ctx, db } = createMockCtx();
    
    // Insert the ride
    db.insert('rides', 'ride1', {
      rideId: 'ride1',
      status: 'requested',
      passengerId: 'user1',
      driverId: null,
    });
    
    // Mock the driver lookup by ID - the handler uses ctx.db.get(driverId)
    ctx.db.get = jest.fn().mockImplementation((id) => {
      if (id === 'user2') {
        return Promise.resolve({
          _id: 'user2',
          userId: 'user2',
          driverPin: '1234', // existing PIN
        });
      }
      return Promise.resolve(null);
    });
    
    // Mock the patch method
    ctx.db.patch = jest.fn().mockResolvedValue('ride1');
    
    // Mock the query for rides
    ctx.db.query = jest.fn().mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue({
          _id: 'ride1',
          rideId: 'ride1',
          status: 'requested',
          passengerId: 'user1',
          driverId: null,
        })
      })
    });
    
    try {
      const result = await acceptRideHandler(ctx, { rideId: 'ride1', driverId: 'user2' });
      expect(result).toBeDefined();
      expect(result.message).toBe('Ride accepted successfully');
      expect(result.driverPin).toBe('1234');
      
      // Verify patch was called to update the ride
      expect(ctx.db.patch).toHaveBeenCalledWith('ride1', expect.objectContaining({
        status: 'accepted',
        driverId: 'user2',
        ridePin: '1234'
      }));
      
      expect(ctx.runMutation).toHaveBeenCalled();
    } catch (error) {
      console.error('Handler error:', error);
      throw error;
    }
  });

  it('should throw if ride not found', async () => {
    const { ctx } = createMockCtx();
    
    // Mock empty query result
    ctx.db.query = jest.fn().mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue(null)
      })
    });
    
    const promise = acceptRideHandler(ctx, { rideId: 'notfound', driverId: 'user2' });
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow('Ride not found');
  });

  it('should throw if ride is not in requested state', async () => {
    const { ctx, db } = createMockCtx();
    
    // Mock the query to return a completed ride
    ctx.db.query = jest.fn().mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue({
          _id: 'ride2',
          rideId: 'ride2',
          status: 'completed',
          passengerId: 'user1',
          driverId: null,
        })
      })
    });
    
    const promise = acceptRideHandler(ctx, { rideId: 'ride2', driverId: 'user2' });
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow('Ride is not available for acceptance');
  });
});