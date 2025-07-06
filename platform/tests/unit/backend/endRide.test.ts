import { endRideHandler } from "../../../convex/functions/rides/endRideHandler";

describe("endRideHandler", () => {
  const args = {
    rideId: "ride_abc123",
    userId: "user_passenger789",
  };

  const rideDoc = {
    _id: "ride_doc456",
    rideId: args.rideId,
    driverId: "user_driver456",
    passengerId: args.userId,
    status: "in_progress",
  };

  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        first: jest.fn(),
        patch: jest.fn(),
      },
      runMutation: jest.fn(),
    };
  });

  it("throws if ride not found", async () => {
    mockCtx.db.first.mockResolvedValueOnce(null);

    await expect(endRideHandler(mockCtx, args)).rejects.toThrow("Ride not found");
  });

  it("throws if user is not the passenger", async () => {
    mockCtx.db.first.mockResolvedValueOnce({
      ...rideDoc,
      passengerId: "someone_else",
    });

    await expect(endRideHandler(mockCtx, args)).rejects.toThrow("Only the assigned passenger can end this ride");
  });

  it("throws if ride status is not accepted, started or in_progress", async () => {
    mockCtx.db.first.mockResolvedValueOnce({
      ...rideDoc,
      status: "cancelled",
    });

    await expect(endRideHandler(mockCtx, args)).rejects.toThrow("Ride is not in progress or started");
  });

  it("successfully completes ride and sends notification", async () => {
    mockCtx.db.first.mockResolvedValueOnce(rideDoc);

    const result = await endRideHandler(mockCtx, args);

    expect(mockCtx.db.patch).toHaveBeenCalledWith(rideDoc._id, {
      status: "completed",
      completedAt: expect.any(Number),
    });

    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      expect.anything(), // Safely match internal mutation path
      {
        rideId: args.rideId,
        type: "ride_completed",
        driverId: rideDoc.driverId,
        passengerId: args.userId,
      }
    );

    expect(result).toEqual({
      _id: rideDoc._id,
      message: "Ride completed successfully",
    });
  });
});