import { cancelRideHandler } from '../../convex/functions/rides/cancelRideHandler';
import { createMockCtx } from './ridesTestUtils';

describe('cancelRide Integration', () => {
  it('should allow a passenger to cancel a ride', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride3', { rideId: 'ride3', status: 'accepted', passengerId: 'user1', driverId: 'user2' });
    const result = await cancelRideHandler(ctx, { rideId: 'ride3', userId: 'user1' });
    expect(result.message).toBe('Ride cancelled successfully');
    const ride = await db.get('ride3');
    expect(ride.status).toBe('cancelled');
    expect(ctx.runMutation).toHaveBeenCalled();
  });
  it('should allow a driver to cancel a ride', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride4', { rideId: 'ride4', status: 'accepted', passengerId: 'user1', driverId: 'user2' });
    const result = await cancelRideHandler(ctx, { rideId: 'ride4', userId: 'user2' });
    expect(result.message).toBe('Ride cancelled successfully');
    const ride = await db.get('ride4');
    expect(ride.status).toBe('cancelled');
    expect(ctx.runMutation).toHaveBeenCalled();
  });
  it('should not allow unauthorized user to cancel', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride5', { rideId: 'ride5', status: 'accepted', passengerId: 'user1', driverId: 'user2' });
    await expect(cancelRideHandler(ctx, { rideId: 'ride5', userId: 'user3' })).rejects.toThrow('User is not authorized to cancel this ride');
  });
  it('should throw if ride not found', async () => {
    const { ctx } = createMockCtx();
    await expect(cancelRideHandler(ctx, { rideId: 'notfound', userId: 'user1' })).rejects.toThrow('Ride not found');
  });
}); 