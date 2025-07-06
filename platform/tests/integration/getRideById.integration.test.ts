import { getRideByIdHandler } from '../../convex/functions/rides/getRideById';
import { createMockCtx } from './ridesTestUtils';

describe('getRideById Integration', () => {
  it('should return the ride by rideId', async () => {
    const { ctx, db } = createMockCtx();
    db.insert('rides', 'ride9', { rideId: 'ride9', status: 'requested', passengerId: 'user1', driverId: 'user2' });
    const result = await getRideByIdHandler(ctx, { rideId: 'ride9' });
    expect(result.rideId).toBe('ride9');
  });
  it('should throw if ride not found', async () => {
    const { ctx } = createMockCtx();
    await expect(getRideByIdHandler(ctx, { rideId: 'notfound' })).rejects.toThrow('Ride not found');
  });
}); 