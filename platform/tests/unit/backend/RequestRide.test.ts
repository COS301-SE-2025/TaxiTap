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

jest.mock('../../../convex/_generated/api', () => ({
  internal: {
    functions: {
      notifications: {
        rideNotifications: {
          sendRideNotification: jest.fn().mockResolvedValue(undefined),
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
        rides.push(obj);
        return "mocked_ride_id";
      }),
      query: jest.fn((table: any) => ({
        collect: jest.fn(async () => rides),
      })),
    },
    runMutation: jest.fn(async () => null),
  };
}

describe("requestRideHandler", () => {
  it("should request a ride and insert it into the database", async () => {
    const ctx = createMockCtx();
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
    const rides = await ctx.db.query("rides").collect();
    expect(rides).toHaveLength(1);
    expect(rides[0].passengerId).toBe(mockArgs.passengerId);
    expect(rides[0].driverId).toBe(mockArgs.driverId);
    expect(rides[0].status).toBe("requested");
    expect(ctx.runMutation).toHaveBeenCalledWith(
      expect.anything(),
      {
        rideId: expect.any(String),
        type: "ride_requested",
        driverId: mockArgs.driverId,
        passengerId: mockArgs.passengerId,
      }
    );
  });

  it("should prevent duplicate ride requests between the same passenger and driver", async () => {
    const ctx = createMockCtx();
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

    // Mock existing ride
    ctx.db.query.mockReturnValue({
      filter: () => ({
        first: () => Promise.resolve({
          _id: "existing_ride_id",
          rideId: "existing_ride_123",
          passengerId: "user123",
          driverId: "driver456",
          status: "requested"
        })
      })
    });

    const result = await requestRideHandler(ctx, mockArgs);

    expect(result.isDuplicate).toBe(true);
    expect(result.message).toBe("Ride request already exists from 123 Main St to 456 Oak Ave");
    expect(result.rideId).toBe("existing_ride_123");
    
    // Should not call the notification mutation for duplicates
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("should allow new ride requests when no existing request exists", async () => {
    const ctx = createMockCtx();
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

    // Mock no existing ride
    ctx.db.query.mockReturnValue({
      filter: () => ({
        first: () => Promise.resolve(null)
      })
    });

    const result = await requestRideHandler(ctx, mockArgs);

    expect(result.isDuplicate).toBeUndefined();
    expect(result.message).toBe("Ride requested successfully from 123 Main St to 456 Oak Ave");
    expect(ctx.runMutation).toHaveBeenCalled();
  });
}); 