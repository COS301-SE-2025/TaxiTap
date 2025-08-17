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
});