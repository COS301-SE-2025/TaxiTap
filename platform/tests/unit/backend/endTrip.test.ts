import { endTripHandler } from "../../../convex/functions/earnings/endTripHandler";

describe("endTrip mutation", () => {
  let ctx: any;
  const passengerId = "passenger_123";
  const ongoingTrip = { _id: "trip_1", endTime: 0 };
  const ride = { estimatedFare: 150 };

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  it("should successfully end a trip", async () => {
    // Mock trips
    const tripsQuery = {
      withIndex: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      collect: jest.fn().mockResolvedValue([ongoingTrip]),
    };

    // Mock rides
    const ridesQuery = {
      withIndex: jest.fn().mockReturnThis(),
      unique: jest.fn().mockResolvedValue(ride),
    };

    ctx.db.query
      .mockImplementationOnce(() => tripsQuery) // trips
      .mockImplementationOnce(() => ridesQuery); // rides

    ctx.db.patch.mockResolvedValue(undefined);

    const result = await endTripHandler(ctx, { passengerId });

    expect(ctx.db.patch).toHaveBeenCalledWith(ongoingTrip._id, expect.objectContaining({
      fare: ride.estimatedFare,
    }));
    expect(result.fare).toBe(ride.estimatedFare);
    expect(typeof result.endTime).toBe("number");
  });

  it("should throw if no ongoing trip found", async () => {
    const tripsQuery = {
      withIndex: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      collect: jest.fn().mockResolvedValue([{ _id: "t2", endTime: 1234 }]), // all trips ended
    };

    ctx.db.query.mockImplementation(() => tripsQuery);

    await expect(endTripHandler(ctx, { passengerId }))
      .rejects
      .toThrow("No ongoing trip found.");
  });

  it("should throw if ride not found", async () => {
    const tripsQuery = {
      withIndex: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      collect: jest.fn().mockResolvedValue([ongoingTrip]),
    };

    const ridesQuery = {
      withIndex: jest.fn().mockReturnThis(),
      unique: jest.fn().mockResolvedValue(null), // no ride
    };

    ctx.db.query
      .mockImplementationOnce(() => tripsQuery)
      .mockImplementationOnce(() => ridesQuery);

    await expect(endTripHandler(ctx, { passengerId }))
      .rejects
      .toThrow("Estimated fare not found for this trip.");
  });

  it("should throw if ride has no estimatedFare", async () => {
    const tripsQuery = {
      withIndex: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      collect: jest.fn().mockResolvedValue([ongoingTrip]),
    };

    const ridesQuery = {
      withIndex: jest.fn().mockReturnThis(),
      unique: jest.fn().mockResolvedValue({ estimatedFare: null }),
    };

    ctx.db.query
      .mockImplementationOnce(() => tripsQuery)
      .mockImplementationOnce(() => ridesQuery);

    await expect(endTripHandler(ctx, { passengerId }))
      .rejects
      .toThrow("Estimated fare not found for this trip.");
  });

  describe("endTrip mutation - Additional Tests", () => {
    let ctx: any;
    const passengerId = "passenger_123";
    const ongoingTrip = { _id: "trip_1", endTime: 0 };
    const ride = { _id: "ride_1", tripId: "trip_1", estimatedFare: 150 };

    beforeEach(() => {
      jest.clearAllMocks();
      ctx = {
        db: {
          query: jest.fn(),
          patch: jest.fn(),
          get: jest.fn(),
        },
      };
    });

    it("should end trip successfully when rideId is provided", async () => {
      const ridesQuery = { filter: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(ride) };
      ctx.db.query.mockImplementationOnce(() => ridesQuery);
      ctx.db.get.mockResolvedValueOnce(ongoingTrip);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await endTripHandler(ctx, { passengerId, rideId: "ride_1" });

      expect(ctx.db.patch).toHaveBeenCalledWith(ongoingTrip._id, expect.objectContaining({
        fare: ride.estimatedFare,
      }));
      expect(result.fare).toBe(ride.estimatedFare);
      expect(typeof result.endTime).toBe("number");
    });

    it("should throw if rideId provided but ride not found", async () => {
      const ridesQuery = { filter: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
      ctx.db.query.mockImplementationOnce(() => ridesQuery);

      await expect(endTripHandler(ctx, { passengerId, rideId: "ride_999" }))
        .rejects
        .toThrow("Ride not found for the provided rideId.");
    });

    it("should throw if ride has no tripId when rideId is provided", async () => {
      const ridesQuery = { filter: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue({ ...ride, tripId: null }) };
      ctx.db.query.mockImplementationOnce(() => ridesQuery);

      await expect(endTripHandler(ctx, { passengerId, rideId: "ride_1" }))
        .rejects
        .toThrow("No trip associated with this ride.");
    });

    it("should throw if trip not found when rideId is provided", async () => {
      const ridesQuery = { filter: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(ride) };
      ctx.db.query.mockImplementationOnce(() => ridesQuery);
      ctx.db.get.mockResolvedValueOnce(null);

      await expect(endTripHandler(ctx, { passengerId, rideId: "ride_1" }))
        .rejects
        .toThrow("Trip not found.");
    });

    it("should throw if patch fails during end trip", async () => {
      const tripsQuery = {
        withIndex: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        collect: jest.fn().mockResolvedValue([ongoingTrip]),
      };
      const ridesQuery = { withIndex: jest.fn().mockReturnThis(), unique: jest.fn().mockResolvedValue(ride) };

      ctx.db.query
        .mockImplementationOnce(() => tripsQuery)
        .mockImplementationOnce(() => ridesQuery);

      ctx.db.patch.mockRejectedValue(new Error("DB patch failed"));

      await expect(endTripHandler(ctx, { passengerId }))
        .rejects
        .toThrow("DB patch failed");
    });

    it("should handle ride with estimatedFare = 0 correctly", async () => {
      const zeroFareRide = { ...ride, estimatedFare: 0 };
      const tripsQuery = {
        withIndex: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        collect: jest.fn().mockResolvedValue([ongoingTrip]),
      };
      const ridesQuery = { withIndex: jest.fn().mockReturnThis(), unique: jest.fn().mockResolvedValue(zeroFareRide) };

      ctx.db.query
        .mockImplementationOnce(() => tripsQuery)
        .mockImplementationOnce(() => ridesQuery);

      ctx.db.patch.mockResolvedValue(undefined);

      const result = await endTripHandler(ctx, { passengerId });

      expect(result.fare).toBe(0);
      expect(typeof result.endTime).toBe("number");
    });
  });
});