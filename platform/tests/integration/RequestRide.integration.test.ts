import { requestRideHandler } from '../../convex/functions/rides/RequestRideHandler';
import { createMockCtx } from './ridesTestUtils';

describe('RequestRide Integration', () => {
  it('should create a new ride and notify the driver', async () => {
    const { ctx, db } = createMockCtx();
    
    // Mock the query chain for duplicate detection
    const mockFilterChain = {
      first: jest.fn().mockResolvedValue(null) // No existing ride found
    };
    
    const mockQueryChain = {
      collect: jest.fn().mockResolvedValue([]),
      filter: jest.fn().mockReturnValue(mockFilterChain)
    };

    // Override the db.query mock to return the proper chain
    ctx.db.query = jest.fn().mockReturnValue(mockQueryChain);

    // Mock db.insert for Jest call tracking
    ctx.db.insert = jest.fn();

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
    
    // Verify the duplicate check was performed
    expect(ctx.db.query).toHaveBeenCalledWith("rides");
    expect(mockQueryChain.filter).toHaveBeenCalled();
    expect(mockFilterChain.first).toHaveBeenCalled();
    
    // Verify ride creation
    expect(ctx.db.insert).toHaveBeenCalledWith("rides", expect.objectContaining({
      passengerId: 'user1',
      driverId: 'user2',
      status: 'requested'
    }));
    
    // Verify notification was sent
    expect(ctx.runMutation).toHaveBeenCalled();
  });

  it('should return duplicate ride when one already exists', async () => {
    const { ctx, db } = createMockCtx();
    
    // Mock existing ride for duplicate detection
    const existingRide = {
      _id: 'existing_ride_id',
      rideId: 'existing_ride_123',
      passengerId: 'user1',
      driverId: 'user2',
      status: 'requested',
      distance: 8.5,
      estimatedFare: 42.0
    };
    
    const mockFilterChain = {
      first: jest.fn().mockResolvedValue(existingRide) // Return existing ride
    };
    
    const mockQueryChain = {
      collect: jest.fn().mockResolvedValue([]),
      filter: jest.fn().mockReturnValue(mockFilterChain)
    };

    ctx.db.query = jest.fn().mockReturnValue(mockQueryChain);

    // Mock db.insert for Jest call tracking
    ctx.db.insert = jest.fn();

    const args = {
      passengerId: 'user1',
      driverId: 'user2',
      startLocation: { coordinates: { latitude: 1, longitude: 2 }, address: 'A' },
      endLocation: { coordinates: { latitude: 3, longitude: 4 }, address: 'B' },
      estimatedFare: 50,
      estimatedDistance: 10,
    };
    
    const result = await requestRideHandler(ctx, args);
    
    // Verify duplicate response
    expect(result.isDuplicate).toBe(true);
    expect(result.message).toMatch(/Ride request already exists/);
    expect(result.rideId).toBe('existing_ride_123');
    
    // Verify no new ride was created
    expect(ctx.db.insert).not.toHaveBeenCalled();
    
    // Verify no notification was sent for duplicate
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it('should handle driver not available error', async () => {
    const { ctx, db } = createMockCtx();
    
    // Mock no duplicate
    const mockFilterChain = {
      first: jest.fn().mockResolvedValue(null)
    };
    
    const mockQueryChain = {
      collect: jest.fn().mockResolvedValue([]),
      filter: jest.fn().mockReturnValue(mockFilterChain)
    };

    ctx.db.query = jest.fn().mockReturnValue(mockQueryChain);

    // Mock db.insert for Jest call tracking
    ctx.db.insert = jest.fn();

    // Mock runQuery to return no matching driver
    ctx.runQuery = jest.fn().mockResolvedValue({
      availableTaxis: [
        {
          userId: 'different_driver', // Not the requested driver
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
      driverId: 'user2', // This driver won't be found
      startLocation: { coordinates: { latitude: 1, longitude: 2 }, address: 'A' },
      endLocation: { coordinates: { latitude: 3, longitude: 4 }, address: 'B' },
      estimatedFare: 50,
      estimatedDistance: 10,
    };
    
    await expect(requestRideHandler(ctx, args)).rejects.toThrow(
      'Driver user2 is not available for this route or no matching route found'
    );
    
    // Verify no ride was created
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });
});