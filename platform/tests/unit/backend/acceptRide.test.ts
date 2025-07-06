import { acceptRideHandler } from "../../../convex/functions/rides/acceptRideHandler";

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

function createMockCtx(rideData: any) {
  let ride: any = rideData ? { ...rideData } : null;
  return {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          first: jest.fn(async () => ride),
        })),
      })),
      patch: jest.fn(async (_id: any, update: any) => {
        if (ride && _id === ride._id) {
          Object.assign(ride, update);
          return _id;
        }
        return null;
      }),
      get: jest.fn(async (_id: any) => (ride && _id === ride._id ? ride : null)),
    },
    runMutation: jest.fn(async () => null),
  };
}

describe("acceptRideHandler", () => {
  const baseRide = {
    _id: "mocked_ride_id",
    rideId: "ride_12345",
    passengerId: "user_1",
    driverId: "user_2",
    startLocation: {
      coordinates: { latitude: 1, longitude: 1 },
      address: "A",
    },
    endLocation: {
      coordinates: { latitude: 2, longitude: 2 },
      address: "B",
    },
    status: "requested",
    requestedAt: Date.now(),
  };

  it("should accept a ride and update its status", async () => {
    const ctx = createMockCtx({ ...baseRide });
    const result = await acceptRideHandler(ctx, { rideId: baseRide.rideId, driverId: "driver_1" });
    expect(result.message).toBe("Ride accepted successfully");
    expect(ctx.db.patch).toHaveBeenCalledWith(baseRide._id, expect.objectContaining({ status: "accepted", driverId: "driver_1" }));
    expect(ctx.runMutation).toHaveBeenCalled();
    const ride = await ctx.db.get(baseRide._id);
    expect(ride.status).toBe("accepted");
    expect(ride.driverId).toBe("driver_1");
  });

  it("should throw an error if the ride is not found", async () => {
    const ctx = createMockCtx(null);
    await expect(
      acceptRideHandler(ctx, { rideId: "non_existent_ride", driverId: "driver_1" })
    ).rejects.toThrow("Ride not found");
  });

  it("should throw an error if the ride is not in 'requested' state", async () => {
    const ctx = createMockCtx({ ...baseRide, status: "completed" });
    await expect(
      acceptRideHandler(ctx, { rideId: baseRide.rideId, driverId: "driver_1" })
    ).rejects.toThrow("Ride is not available for acceptance");
  });
}); 