import { completeRideHandler } from '../../convex/functions/rides/completeRideHandler';
import { createMockCtx } from './ridesTestUtils';

describe('completeRide Integration', () => {
  it('should complete a ride and update its status', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride6', { rideId: 'ride6', status: 'accepted', passengerId: 'user1', driverId: 'user2' });
    const result = await completeRideHandler(ctx, { rideId: 'ride6', driverId: 'user2' });
    expect(result.message).toBe('Ride marked as completed.');
    const ride = await db.get('ride6');
    expect(ride.status).toBe('completed');
    expect(ctx.runMutation).toHaveBeenCalled();
  });
  it('should throw if ride not found', async () => {
    const { ctx } = createMockCtx();
    await expect(completeRideHandler(ctx, { rideId: 'notfound', driverId: 'user2' })).rejects.toThrow('Ride not found');
  });
  it('should throw if ride is not in accepted state', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride7', { rideId: 'ride7', status: 'requested', passengerId: 'user1', driverId: 'user2' });
    await expect(completeRideHandler(ctx, { rideId: 'ride7', driverId: 'user2' })).rejects.toThrow('Ride is not in progress');
  });
  it('should throw if another driver tries to complete', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride8', { rideId: 'ride8', status: 'accepted', passengerId: 'user1', driverId: 'driverA' });
    await expect(completeRideHandler(ctx, { rideId: 'ride8', driverId: 'driverB' })).rejects.toThrow('Only the assigned driver can complete this ride');
  });
}); 