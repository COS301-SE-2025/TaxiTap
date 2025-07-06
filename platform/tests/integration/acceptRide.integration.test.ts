import { acceptRideHandler } from '../../convex/functions/rides/acceptRideHandler';
import { createMockCtx } from './ridesTestUtils';

describe('acceptRide Integration', () => {
  it('should accept a ride and update its status', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride1', {
      rideId: 'ride1',
      status: 'requested',
      passengerId: 'user1',
      driverId: null,
    });
    const result = await acceptRideHandler(ctx, { rideId: 'ride1', driverId: 'user2' });
    expect(result.message).toBe('Ride accepted successfully');
    const ride = await db.get('ride1');
    expect(ride.status).toBe('accepted');
    expect(ride.driverId).toBe('user2');
    expect(ctx.runMutation).toHaveBeenCalled();
  });
  it('should throw if ride not found', async () => {
    const { ctx } = createMockCtx();
    await expect(acceptRideHandler(ctx, { rideId: 'notfound', driverId: 'user2' })).rejects.toThrow('Ride not found');
  });
  it('should throw if ride is not in requested state', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride2', { rideId: 'ride2', status: 'completed', passengerId: 'user1', driverId: null });
    await expect(acceptRideHandler(ctx, { rideId: 'ride2', driverId: 'user2' })).rejects.toThrow('Ride is not available for acceptance');
  });
}); 