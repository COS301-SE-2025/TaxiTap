import { requestRideHandler } from '../../convex/functions/rides/RequestRideHandler';
import { createMockCtx } from './ridesTestUtils';

describe('RequestRide Integration', () => {
  it('should create a new ride and notify the driver', async () => {
    const { ctx, db } = createMockCtx();
    
    // Add the missing runQuery method to the mock context
    ctx.runQuery = jest.fn().mockResolvedValue({
      availableTaxis: [
        {
          userId: 'user2', // matches the driverId in args
          routeInfo: {
            passengerDisplacement: 10.5,
            calculatedFare: 52.50,
            estimatedDuration: 15,
            routeName: 'Route A to B'
          }
        }
      ]
    });

    const args = {
      passengerId: 'user1',
      driverId: 'user2',
      startLocation: { coordinates: { latitude: 1, longitude: 2 }, address: 'A' },
      endLocation: { coordinates: { latitude: 3, longitude: 4 }, address: 'B' },
      estimatedFare: 50,
      estimatedDistance: 10,
    };
    
    const result = await requestRideHandler(ctx, args);
    
    expect(result.message).toMatch(/Ride requested successfully/);
    const rides = await db.query('rides').collect();
    expect(rides.length).toBe(1);
    expect(ctx.runMutation).toHaveBeenCalled();
  });
});