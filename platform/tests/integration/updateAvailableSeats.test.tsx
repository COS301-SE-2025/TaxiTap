import { updateTaxiSeatAvailabilityHandler } from "../../convex/functions/taxis/updateAvailableSeats";

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
  });

  it("should decrease taxi seat capacity", async () => {
    const result = await updateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "decrease",
    });

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
    const result = await updateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "increase",
    });

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

    const result = await updateTaxiSeatAvailabilityHandler(mockCtx, {
      rideId: "ride123",
      action: "decrease",
    });

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

    await expect(
      updateTaxiSeatAvailabilityHandler(mockCtx, {
        rideId: "ride123",
        action: "decrease",
      })
    ).rejects.toThrow("Ride not found");
  });

  it("should throw if driver is missing", async () => {
    mockRide.driverId = null;

    await expect(
      updateTaxiSeatAvailabilityHandler(mockCtx, {
        rideId: "ride123",
        action: "increase",
      })
    ).rejects.toThrow("Ride has no assigned driver");
  });

  it("should throw if driver profile not found", async () => {
    mockCtx.db.query = jest.fn((table: string) => ({
      withIndex: jest.fn((indexName: string, q: any) => ({
        first: jest.fn(() => {
          if (table === "rides") return Promise.resolve(mockRide);
          if (table === "drivers") return Promise.resolve(null); // simulate missing driver
        }),
      })),
    }));

    await expect(
      updateTaxiSeatAvailabilityHandler(mockCtx, {
        rideId: "ride123",
        action: "increase",
      })
    ).rejects.toThrow("Driver profile not found.");
  });

  it("should throw if taxi not found", async () => {
    mockCtx.db.query = jest.fn((table: string) => ({
      withIndex: jest.fn((indexName: string, q: any) => ({
        first: jest.fn(() => {
          if (table === "rides") return Promise.resolve(mockRide);
          if (table === "drivers") return Promise.resolve(mockDriver);
          if (table === "taxis") return Promise.resolve(null); // simulate missing taxi
        }),
      })),
    }));

    await expect(
      updateTaxiSeatAvailabilityHandler(mockCtx, {
        rideId: "ride123",
        action: "increase",
      })
    ).rejects.toThrow("Taxi for driver not found.");
  });
});
