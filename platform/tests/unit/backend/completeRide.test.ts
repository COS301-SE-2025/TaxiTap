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

import { completeRideHandler } from "../../../convex/functions/rides/completeRideHandler";

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

describe("completeRide", () => {
  const baseRide = {
    _id: "mocked_ride_id",
    rideId: "ride_12345",
    passengerId: "user_1",
    driverId: "driver_1",
    startLocation: {
      coordinates: { latitude: 1, longitude: 1 },
      address: "A",
    },
    endLocation: {
      coordinates: { latitude: 2, longitude: 2 },
      address: "B",
    },
    status: "accepted",
    requestedAt: Date.now(),
  };

  it("should allow the assigned driver to complete a ride", async () => {
    const ctx = createMockCtx({ ...baseRide });
    const result = await completeRideHandler(ctx, { rideId: baseRide.rideId, driverId: baseRide.driverId });
    expect(result.message).toBe("Ride marked as completed.");
    expect(ctx.db.patch).toHaveBeenCalledWith(baseRide._id, expect.objectContaining({ status: "completed" }));
    expect(ctx.runMutation).toHaveBeenCalled();
    const ride = await ctx.db.get(baseRide._id);
    expect(ride.status).toBe("completed");
  });

  it("should not allow another driver to complete a ride", async () => {
    const ctx = createMockCtx({ ...baseRide });
    await expect(
      completeRideHandler(ctx, { rideId: baseRide.rideId, driverId: "another_driver" })
    ).rejects.toThrow("Only the assigned driver can complete this ride");
  });

  it("should throw an error if ride is not found", async () => {
    const ctx = createMockCtx(null);
    await expect(
      completeRideHandler(ctx, { rideId: "non_existent_ride", driverId: baseRide.driverId })
    ).rejects.toThrow("Ride not found");
  });

  it("should throw an error if the ride is not in 'accepted' state", async () => {
    const ctx = createMockCtx({ ...baseRide, status: "completed" });
    await expect(
      completeRideHandler(ctx, { rideId: baseRide.rideId, driverId: baseRide.driverId })
    ).rejects.toThrow("Ride is not in progress");
  });
}); 