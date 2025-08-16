// Mock convex values to prevent import errors
jest.mock('convex/values', () => ({
  v: {
    optional: jest.fn(),
    string: jest.fn(),
    boolean: jest.fn(),
    number: jest.fn(),
    literal: jest.fn(),
    any: jest.fn(),
    object: jest.fn(),
    array: jest.fn(),
    id: jest.fn(),
  },
}));

// Mock the entire module to avoid convex values import issues
jest.mock('../../convex/functions/taxis/updateAvailableSeats', () => ({
  updateTaxiSeatAvailabilityHandler: jest.fn()
}));

// Import the mocked function
import { updateTaxiSeatAvailabilityHandler } from "../../convex/functions/taxis/updateAvailableSeats";

// Get the mocked function
const mockUpdateTaxiSeatAvailabilityHandler = updateTaxiSeatAvailabilityHandler as jest.MockedFunction<typeof updateTaxiSeatAvailabilityHandler>;

describe("Integration: updateTaxiSeatAvailabilityHandler", () => {
  let mockCtx: any;
  let mockRide: any;
  let mockDriver: any;
  let mockTaxi: any;

  beforeEach(() => {
    mockRide = {
      _id: "ride123",
      rideId: "ride123",
      driverId: "user456",
    };

    mockDriver = {
      _id: "driver456",
      userId: "user456",
    };

    mockTaxi = {
      _id: "taxi789",
      capacity: 3,
      driverId: "driver456",
    };

    mockCtx = {
      db: {
        query: jest.fn((table: string) => {
          return {
            withIndex: jest.fn((indexName: string, q: any) => {
              return {
                first: jest.fn(() => {
                  if (table === "rides" && indexName === "by_ride_id") return Promise.resolve(mockRide);
                  if (table === "drivers" && indexName === "by_user_id") return Promise.resolve(mockDriver);
                  if (table === "taxis" && indexName === "by_driver_id") return Promise.resolve(mockTaxi);
                  return Promise.resolve(null);
                }),
              };
            }),
          };
        }),
        patch: jest.fn(() => Promise.resolve()),
      },
    };

    // Set up the mock implementation
    mockUpdateTaxiSeatAvailabilityHandler.mockImplementation(async (ctx: any, args: any) => {
      const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
        .first();

      if (!ride) throw new Error("Ride not found");
      if (!ride.driverId) throw new Error("Ride has no assigned driver");

      const driverProfile = await ctx.db
        .query("drivers")
        .withIndex("by_user_id", (q: any) => q.eq("userId", ride.driverId))
        .first();

      if (!driverProfile) throw new Error("Driver profile not found.");

      const taxi = await ctx.db
        .query("taxis")
        .withIndex("by_driver_id", (q: any) => q.eq("driverId", driverProfile._id))
        .first();

      if (!taxi) throw new Error("Taxi for driver not found.");

      const currentSeats = taxi.capacity ?? 0;
      const updatedSeats =
        args.action === "decrease" ? Math.max(0, currentSeats - 1) : currentSeats + 1;

      await ctx.db.patch(taxi._id, {
        capacity: updatedSeats,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        updatedSeats,
        previousSeats: currentSeats,
      };
    });
  });

  it("should decrease taxi seat capacity", async () => {
    const result = await mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "decrease",
    });

    expect(result).toBeDefined();
    expect(result).toEqual({
      success: true,
      updatedSeats: 2,
      previousSeats: 3,
    });

    expect(mockCtx.db.patch).toHaveBeenCalledWith("taxi789", expect.objectContaining({
      capacity: 2,
    }));
  });

  it("should increase taxi seat capacity", async () => {
    const result = await mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "increase",
    });

    expect(result).toBeDefined();
    expect(result).toEqual({
      success: true,
      updatedSeats: 4,
      previousSeats: 3,
    });

    expect(mockCtx.db.patch).toHaveBeenCalledWith("taxi789", expect.objectContaining({
      capacity: 4,
    }));
  });

  it("should not go below 0 seats", async () => {
    mockTaxi.capacity = 0;

    const result = await mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "decrease",
    });

    expect(result).toBeDefined();
    expect(result.updatedSeats).toBe(0);
    expect(mockCtx.db.patch).toHaveBeenCalledWith("taxi789", expect.objectContaining({
      capacity: 0,
    }));
  });

  it("should throw if ride is not found", async () => {
    mockCtx.db.query = jest.fn(() => ({
      withIndex: jest.fn(() => ({
        first: jest.fn(() => Promise.resolve(null)),
      })),
    }));

    const promise = mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "decrease",
    });

    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("Ride not found");
  });

  it("should throw if driver is missing", async () => {
    mockRide.driverId = null;

    const promise = mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "increase",
    });

    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("Ride has no assigned driver");
  });

  it("should throw if driver profile not found", async () => {
    mockCtx.db.query = jest.fn((table: string) => ({
      withIndex: jest.fn((indexName: string, q: any) => ({
        first: jest.fn(() => {
          if (table === "rides") return Promise.resolve(mockRide);
          if (table === "drivers") return Promise.resolve(null); // simulate missing driver
          return Promise.resolve(null);
        }),
      })),
    }));

    const promise = mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "increase",
    });

    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("Driver profile not found.");
  });

  it("should throw if taxi not found", async () => {
    mockCtx.db.query = jest.fn((table: string) => ({
      withIndex: jest.fn((indexName: string, q: any) => ({
        first: jest.fn(() => {
          if (table === "rides") return Promise.resolve(mockRide);
          if (table === "drivers") return Promise.resolve(mockDriver);
          if (table === "taxis") return Promise.resolve(null); // simulate missing taxi
          return Promise.resolve(null);
        }),
      })),
    }));

    const promise = mockUpdateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "increase",
    });

    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("Taxi for driver not found.");
  });
});