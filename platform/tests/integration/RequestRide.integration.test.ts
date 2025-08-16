import { requestRideHandler } from '../../convex/functions/rides/RequestRideHandler';

describe('RequestRide Integration', () => {
  it('should create a new ride and notify the driver', async () => {
    const mockRideId = "ride_123";
    const mockTaxiMatchingResult = {
      availableTaxis: [
        {
          userId: 'user2',
          routeInfo: {
            passengerDisplacement: 10.5,
            calculatedFare: 52.50,
            estimatedDuration: 15,
            routeName: 'Route A to B'
          }
        }
      ]
    };

    const ctx = {
      db: {
        insert: jest.fn(() => Promise.resolve(mockRideId))
      },
      runQuery: jest.fn(() => Promise.resolve(mockTaxiMatchingResult)),
      runMutation: jest.fn(() => Promise.resolve())
    };

    const args = {
      passengerId: 'user1',
      driverId: 'user2',
      startLocation: { coordinates: { latitude: 1, longitude: 2 }, address: 'A' },
      endLocation: { coordinates: { latitude: 3, longitude: 4 }, address: 'B' },
      estimatedFare: 50,
      estimatedDistance: 10,
    };
    
    const result = await requestRideHandler(ctx as any, args);
    
    expect(result.message).toMatch(/Ride requested successfully/);
    expect(result.rideId).toBe(mockRideId);
    expect(ctx.runMutation).toHaveBeenCalled();
  });
});