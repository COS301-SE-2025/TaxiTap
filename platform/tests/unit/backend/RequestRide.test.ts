// Mock Convex validation functions before importing modules
const v = {
  id: jest.fn((table) => ({ table })),
  number: jest.fn(() => ({})),
  string: jest.fn(() => ({})),
  boolean: jest.fn(() => ({})),
  object: jest.fn(() => ({})),
  array: jest.fn(() => ({})),
  optional: jest.fn((validator) => ({ validator })),
  union: jest.fn((...validators) => ({ validators })),
};
jest.mock('convex/values', () => ({ v }));

jest.mock('../../../convex/_generated/server', () => ({
  mutation: (def: any) => def,
  query: (def: any) => def,
  action: (def: any) => def,
}));

// Complete mock for the API structure that the handler expects
jest.mock('../../../convex/_generated/api', () => ({
  internal: {
    functions: {
      routes: {
        enhancedTaxiMatching: {
          _findAvailableTaxisForJourney: 'internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney',
        },
      },
      notifications: {
        rideNotifications: {
          sendRideNotification: 'internal.functions.notifications.rideNotifications.sendRideNotification',
        },
      },
    },
  },
}));

import { requestRideHandler } from "../../../convex/functions/rides/RequestRideHandler";

function createMockCtx() {
  const rides: any[] = [];

  return {
    db: {
      insert: jest.fn(async (table: any, obj: any) => {
        const newId = "mocked_ride_id_" + (rides.length + 1);
        const insertedObj = { ...obj, _id: newId };
        rides.push(insertedObj);
        return newId;
      }),
      query: jest.fn((table: any) => ({
        collect: jest.fn(async () => rides),
      })),
      get: jest.fn(async (id: string) => {
        return rides.find(r => r._id === id) || null;
      }),
    },
    runQuery: jest.fn(),
    runMutation: jest.fn(),
  };
}

describe("requestRideHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should request a ride and insert it into the database", async () => {
    const ctx = createMockCtx();
    
    // Mock the taxi matching result for this specific test
    const mockTaxiMatchingResult = {
      availableTaxis: [
        {
          userId: "driver456",
          routeInfo: {
            passengerDisplacement: 8.4,
            calculatedFare: 25.5,
            estimatedDuration: 15,
            routeName: "Route 42"
          }
        }
      ]
    };

    ctx.runQuery.mockImplementation(async (queryPath: string, queryArgs: any) => {
      if (queryPath.includes('_findAvailableTaxisForJourney')) {
        return mockTaxiMatchingResult;
      }
      return null;
    });

    ctx.runMutation.mockResolvedValue(undefined);

    const mockArgs = {
      passengerId: "user123",
      driverId: "driver456",
      startLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "123 Main St",
      },
      endLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "456 Oak Ave",
      },
      estimatedFare: 25.5,
      estimatedDistance: 10.2,
    };

    const result = await requestRideHandler(ctx, mockArgs);

    expect(result.message).toBe("Ride requested successfully from 123 Main St to 456 Oak Ave");
    expect(result.distance).toBe(8.4); // Should use calculated passenger displacement
    expect(result.estimatedFare).toBe(25.5); // Should use provided estimatedFare
    expect(result.rideId).toBeDefined();
    expect(result._id).toBeDefined();

    // Verify database insertion
    const rides = await ctx.db.query("rides").collect();
    expect(rides).toHaveLength(1);
    expect(rides[0].passengerId).toBe(mockArgs.passengerId);
    expect(rides[0].driverId).toBe(mockArgs.driverId);
    expect(rides[0].status).toBe("requested");
    expect(rides[0].distance).toBe(8.4); // Should use calculated displacement
    expect(rides[0].estimatedFare).toBe(25.5);

    // Verify runQuery was called with correct parameters
    expect(ctx.runQuery).toHaveBeenCalledWith(
      'internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney',
      {
        originLat: 34.0522,
        originLng: -118.2437,
        destinationLat: 34.0522,
        destinationLng: -118.2437,
        maxOriginDistance: 3.0,
        maxDestinationDistance: 3.0,
        maxTaxiDistance: 5.0,
        maxResults: 50
      }
    );

    // FIXED: Updated to expect the metadata field that was added
    expect(ctx.runMutation).toHaveBeenCalledWith(
      'internal.functions.notifications.rideNotifications.sendRideNotification',
      {
        rideId: expect.any(String),
        type: "ride_requested",
        driverId: mockArgs.driverId,
        passengerId: mockArgs.passengerId,
        metadata: null, // Added the expected metadata field
      }
    );
  });

  it("should throw error when driver is not available", async () => {
    const ctx = createMockCtx();
    
    // Mock taxi matching result without the requested driver
    const mockTaxiMatchingResult = {
      availableTaxis: [
        {
          userId: "different_driver", // Not the requested driver
          routeInfo: {
            passengerDisplacement: 8.4,
            calculatedFare: 25.5,
            estimatedDuration: 15,
            routeName: "Route 42"
          }
        }
      ]
    };

    ctx.runQuery.mockImplementation(async (queryPath: string, queryArgs: any) => {
      if (queryPath.includes('_findAvailableTaxisForJourney')) {
        return mockTaxiMatchingResult;
      }
      return null;
    });

    const mockArgs = {
      passengerId: "user123",
      driverId: "driver456", // This driver won't be in the available taxis
      startLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "123 Main St",
      },
      endLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "456 Oak Ave",
      },
      estimatedFare: 25.5,
      estimatedDistance: 10.2,
    };

    await expect(requestRideHandler(ctx, mockArgs)).rejects.toThrow(
      "Driver driver456 is not available for this route or no matching route found"
    );

    // Verify no ride was created
    const rides = await ctx.db.query("rides").collect();
    expect(rides).toHaveLength(0);
  });

  it("should use calculated fare when no estimated fare is provided", async () => {
    const ctx = createMockCtx();
    
    const mockTaxiMatchingResult = {
      availableTaxis: [
        {
          userId: "driver456",
          routeInfo: {
            passengerDisplacement: 8.4,
            calculatedFare: 42.75, // Different calculated fare
            estimatedDuration: 15,
            routeName: "Route 42"
          }
        }
      ]
    };

    ctx.runQuery.mockImplementation(async (queryPath: string, queryArgs: any) => {
      if (queryPath.includes('_findAvailableTaxisForJourney')) {
        return mockTaxiMatchingResult;
      }
      return null;
    });

    ctx.runMutation.mockResolvedValue(undefined);

    const mockArgs = {
      passengerId: "user123",
      driverId: "driver456",
      startLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "123 Main St",
      },
      endLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "456 Oak Ave",
      },
      // No estimatedFare provided
      estimatedDistance: 10.2,
    };

    const result = await requestRideHandler(ctx, mockArgs);

    // Should use the calculated fare from the mock (42.75)
    expect(result.estimatedFare).toBe(42.75);
    expect(result.distance).toBe(8.4);

    // Verify database record
    const rides = await ctx.db.query("rides").collect();
    expect(rides[0].estimatedFare).toBe(42.75);
    expect(rides[0].distance).toBe(8.4);
  });

  it("should throw error when passenger displacement is invalid", async () => {
    const ctx = createMockCtx();
    
    // Mock taxi matching result with invalid passenger displacement
    const mockTaxiMatchingResult = {
      availableTaxis: [
        {
          userId: "driver456",
          routeInfo: {
            passengerDisplacement: -1, // Invalid displacement
            calculatedFare: 0,
            estimatedDuration: 0,
            routeName: "Invalid Route"
          }
        }
      ]
    };

    ctx.runQuery.mockImplementation(async (queryPath: string, queryArgs: any) => {
      if (queryPath.includes('_findAvailableTaxisForJourney')) {
        return mockTaxiMatchingResult;
      }
      return null;
    });

    const mockArgs = {
      passengerId: "user123",
      driverId: "driver456",
      startLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "123 Main St",
      },
      endLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "456 Oak Ave",
      },
      estimatedFare: 25.5,
      estimatedDistance: 10.2,
    };

    await expect(requestRideHandler(ctx, mockArgs)).rejects.toThrow(
      "Unable to calculate passenger displacement for this journey"
    );

    // Verify no ride was created
    const rides = await ctx.db.query("rides").collect();
    expect(rides).toHaveLength(0);
  });

  it("should handle null taxi matching result", async () => {
    const ctx = createMockCtx();
    
    // Mock taxi matching to return null
    ctx.runQuery.mockImplementation(async (queryPath: string, queryArgs: any) => {
      if (queryPath.includes('_findAvailableTaxisForJourney')) {
        return null; // This should cause an error
      }
      return null;
    });

    const mockArgs = {
      passengerId: "user123",
      driverId: "driver456",
      startLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "123 Main St",
      },
      endLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "456 Oak Ave",
      },
      estimatedFare: 25.5,
      estimatedDistance: 10.2,
    };

    await expect(requestRideHandler(ctx, mockArgs)).rejects.toThrow();

    // Verify no ride was created
    const rides = await ctx.db.query("rides").collect();
    expect(rides).toHaveLength(0);
  });

  it("should handle empty available taxis array", async () => {
    const ctx = createMockCtx();
    
    // Mock taxi matching result with empty array
    const mockTaxiMatchingResult = {
      availableTaxis: [] // Empty array
    };

    ctx.runQuery.mockImplementation(async (queryPath: string, queryArgs: any) => {
      if (queryPath.includes('_findAvailableTaxisForJourney')) {
        return mockTaxiMatchingResult;
      }
      return null;
    });

    const mockArgs = {
      passengerId: "user123",
      driverId: "driver456",
      startLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "123 Main St",
      },
      endLocation: {
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        address: "456 Oak Ave",
      },
      estimatedFare: 25.5,
      estimatedDistance: 10.2,
    };

    await expect(requestRideHandler(ctx, mockArgs)).rejects.toThrow(
      "Driver driver456 is not available for this route or no matching route found"
    );

    // Verify no ride was created
    const rides = await ctx.db.query("rides").collect();
    expect(rides).toHaveLength(0);
  });
});