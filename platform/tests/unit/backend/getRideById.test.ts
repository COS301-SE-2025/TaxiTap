// Mock Convex validation functions before importing modules
jest.mock('convex/values', () => ({
  v: {
    id: jest.fn((table) => ({ table })),
    number: jest.fn(() => ({})),
    string: jest.fn(() => ({})),
    boolean: jest.fn(() => ({})),
    object: jest.fn(() => ({})),
    array: jest.fn(() => ({})),
    optional: jest.fn((validator) => ({ validator })),
    union: jest.fn((...validators) => ({ validators })),
  },
}));

jest.mock('../../../convex/_generated/server', () => ({
  mutation: (def: any) => def,
  query: (def: any) => def,
  action: (def: any) => def,
}));

const { getRideById } = require("../../../convex/functions/rides/getRideById");

function createMockCtx(ride: any) {
  return {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          first: jest.fn(async () => ride),
        })),
      })),
    },
  };
}

describe("getRideById", () => {
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
    status: "completed",
    requestedAt: Date.now(),
  };

  it("should return a ride by its ID", async () => {
    const ctx = createMockCtx({ ...baseRide });
    const ride = await getRideById.handler(ctx, { rideId: baseRide.rideId });
    expect(ride).not.toBeNull();
    expect(ride.rideId).toBe(baseRide.rideId);
  });

  it("should throw if the ride is not found", async () => {
    const ctx = createMockCtx(null);
    await expect(getRideById.handler(ctx, { rideId: "non_existent_ride" })).rejects.toThrow("Ride not found");
  });

  it("should throw if rideId is not provided", async () => {
    const ctx = createMockCtx(null);
    // @ts-ignore
    await expect(getRideById.handler(ctx, { rideId: "" })).rejects.toThrow("Ride not found");
  });
}); 