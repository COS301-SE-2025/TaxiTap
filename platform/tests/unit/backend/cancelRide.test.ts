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

import { cancelRideHandler } from "../../../convex/functions/rides/cancelRideHandler";

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

describe("cancelRideHandler", () => {
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
    status: "accepted",
    requestedAt: Date.now(),
  };

  it("should allow a passenger to cancel a ride", async () => {
    const ctx = createMockCtx({ ...baseRide });
    const result = await cancelRideHandler(ctx, { rideId: baseRide.rideId, userId: baseRide.passengerId });
    expect(result.message).toBe("Ride cancelled successfully");
    expect(ctx.db.patch).toHaveBeenCalledWith(baseRide._id, expect.objectContaining({ status: "cancelled" }));
    expect(ctx.runMutation).toHaveBeenCalled();
    const ride = await ctx.db.get(baseRide._id);
    expect(ride.status).toBe("cancelled");
  });

  it("should allow a driver to cancel a ride", async () => {
    const ctx = createMockCtx({ ...baseRide });
    const result = await cancelRideHandler(ctx, { rideId: baseRide.rideId, userId: baseRide.driverId });
    expect(result.message).toBe("Ride cancelled successfully");
    expect(ctx.db.patch).toHaveBeenCalledWith(baseRide._id, expect.objectContaining({ status: "cancelled" }));
    expect(ctx.runMutation).toHaveBeenCalled();
    const ride = await ctx.db.get(baseRide._id);
    expect(ride.status).toBe("cancelled");
  });

  it("should not allow an unauthorized user to cancel a ride", async () => {
    const ctx = createMockCtx({ ...baseRide });
    await expect(
      cancelRideHandler(ctx, { rideId: baseRide.rideId, userId: "unauthorized_user" })
    ).rejects.toThrow("User is not authorized to cancel this ride");
  });

  it("should throw an error if ride is not found", async () => {
    const ctx = createMockCtx(null);
    await expect(
      cancelRideHandler(ctx, { rideId: "non_existent_ride", userId: baseRide.passengerId })
    ).rejects.toThrow("Ride not found");
  });
}); 