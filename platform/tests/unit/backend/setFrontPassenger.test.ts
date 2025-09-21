import {
  setFrontPassengerHandler,
  removeFrontPassengerHandler,
  getFrontPassengerHandler,
  checkPassengerFrontStatusHandler,
  getDriverFrontPassengersHandler,
} from "../../../convex/functions/rides/setFrontPassenger";

describe("Front Passenger Handlers", () => {
  let ctx: any;
  let mockRide: any;
  let mockDriver: any;
  let mockPassenger: any;

  beforeEach(() => {
    mockRide = {
      _id: "ride-123",
      rideId: "ride-123",
      passengerId: "passenger-1",
      driverId: "driver-1",
      status: "in_progress",
      isFrontPassenger: false,
      frontPassengerSetAt: null,
      updatedAt: null,
      estimatedFare: 100,
      finalFare: 120,
      tripPaid: false,
      startLocation: "A",
      endLocation: "B",
    };

    mockPassenger = {
      _id: "passenger-1",
      name: "John Doe",
      phoneNumber: "1234567890",
    };

    mockDriver = {
      _id: "driver-1",
      name: "Driver One",
      phoneNumber: "0987654321",
    };

    ctx = {
      db: {
        query: jest.fn(),
        get: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  // -------------------- setFrontPassengerHandler --------------------
  it("sets a front passenger successfully", async () => {
    // Mock database queries
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({ first: async () => mockRide }),
    });
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ collect: async () => [] }),
      }),
    });
    ctx.db.patch.mockResolvedValue(true);

    const result = await setFrontPassengerHandler(ctx, mockRide.rideId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Front passenger set successfully");
    expect(ctx.db.patch).toHaveBeenCalledWith(mockRide._id, expect.objectContaining({
      isFrontPassenger: true,
    }));
  });

  it("throws error if ride not found", async () => {
    ctx.db.query.mockReturnValueOnce({ withIndex: () => ({ first: async () => null }) });
    await expect(setFrontPassengerHandler(ctx, "ride-999")).rejects.toThrow("Ride not found");
  });

  it("throws error if ride not in progress", async () => {
    mockRide.status = "completed";
    ctx.db.query.mockReturnValueOnce({ withIndex: () => ({ first: async () => mockRide }) });
    await expect(setFrontPassengerHandler(ctx, mockRide.rideId)).rejects.toThrow(
      "Only active rides can have front passengers set"
    );
  });

  it("removes existing front passengers for the same driver", async () => {
    const otherRide = { ...mockRide, _id: "ride-456", isFrontPassenger: true };
    ctx.db.query.mockReturnValueOnce({ withIndex: () => ({ first: async () => mockRide }) });
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ collect: async () => [otherRide] }),
      }),
    });
    ctx.db.patch.mockResolvedValue(true);

    await setFrontPassengerHandler(ctx, mockRide.rideId);

    expect(ctx.db.patch).toHaveBeenCalledWith(otherRide._id, expect.objectContaining({
      isFrontPassenger: false,
    }));
  });

  // -------------------- removeFrontPassengerHandler --------------------
  it("removes a front passenger successfully", async () => {
    mockRide.isFrontPassenger = true;
    ctx.db.query.mockReturnValueOnce({ withIndex: () => ({ first: async () => mockRide }) });
    ctx.db.patch.mockResolvedValue(true);

    const result = await removeFrontPassengerHandler(ctx, mockRide.rideId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Front passenger status removed successfully");
  });

  it("throws error if ride is not a front passenger", async () => {
    mockRide.isFrontPassenger = false;
    ctx.db.query.mockReturnValueOnce({ withIndex: () => ({ first: async () => mockRide }) });
    await expect(removeFrontPassengerHandler(ctx, mockRide.rideId)).rejects.toThrow(
      "This passenger is not currently set as front passenger"
    );
  });

  // -------------------- getFrontPassengerHandler --------------------
  it("returns front passenger details if exists", async () => {
    const frontRide = { ...mockRide, isFrontPassenger: true };
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ first: async () => frontRide }),
      }),
    });
    ctx.db.get.mockResolvedValue(mockPassenger);

    const result = await getFrontPassengerHandler(ctx, "driver-1");

    expect(result.hasFrontPassenger).toBe(true);
    expect(result.frontPassenger!.name).toBe(mockPassenger.name);
  });

  it("returns no front passenger if none exists", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ first: async () => null }),
      }),
    });

    const result = await getFrontPassengerHandler(ctx, "driver-1");
    expect(result.hasFrontPassenger).toBe(false);
    expect(result.frontPassenger).toBeNull();
  });

  // -------------------- checkPassengerFrontStatusHandler --------------------
  it("checks if a passenger is front passenger", async () => {
    const frontRide = { ...mockRide, isFrontPassenger: true };
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ first: async () => frontRide }),
      }),
    });
    ctx.db.get.mockResolvedValue(mockDriver);

    const result = await checkPassengerFrontStatusHandler(ctx, "passenger-1");
    expect(result.isFrontPassenger).toBe(true);
    expect(result.rideInfo!.driverName).toBe(mockDriver.name);
  });

  it("returns false if passenger is not front passenger", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ first: async () => null }),
      }),
    });

    const result = await checkPassengerFrontStatusHandler(ctx, "passenger-1");
    expect(result.isFrontPassenger).toBe(false);
    expect(result.rideInfo).toBeNull();
  });

  // -------------------- getDriverFrontPassengersHandler --------------------
  it("returns a list of front passengers for a driver", async () => {
    const frontRides = [{ ...mockRide, isFrontPassenger: true }];
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ collect: async () => frontRides }),
      }),
    });
    ctx.db.get.mockResolvedValue(mockPassenger);

    const result = await getDriverFrontPassengersHandler(ctx, "driver-1");

    expect(result.count).toBe(1);
    expect(result.frontPassengers[0].passengerName).toBe(mockPassenger.name);
  });

  it("returns empty list if no front passengers", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        filter: () => ({ collect: async () => [] }),
      }),
    });

    const result = await getDriverFrontPassengersHandler(ctx, "driver-1");
    expect(result.count).toBe(0);
    expect(result.frontPassengers).toEqual([]);
  });
});