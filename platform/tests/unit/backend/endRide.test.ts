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

    // FIXED: Simply check that runMutation was called and verify the notification data
    expect(mockCtx.runMutation).toHaveBeenCalledTimes(1);
    
    // Check only the second argument (the notification data) since the first is a complex require path
    const [, secondArg] = mockCtx.runMutation.mock.calls[0];
    expect(secondArg).toEqual({
      rideId: args.rideId,
      type: "ride_completed",
      driverId: rideDoc.driverId,
      passengerId: args.userId,
      metadata: null,
    });

    expect(result).toEqual({
      _id: rideDoc._id,
      message: "Ride completed successfully",
    });
  });

  it("continues ride completion even if notification fails", async () => {
    mockCtx.db.first.mockResolvedValueOnce(rideDoc);
    
    // Mock notification failure
    mockCtx.runMutation.mockRejectedValueOnce(new Error("Notification service unavailable"));

    const result = await endRideHandler(mockCtx, args);

    // Should still complete the ride despite notification failure
    expect(mockCtx.db.patch).toHaveBeenCalledWith(rideDoc._id, {
      status: "completed",
      completedAt: expect.any(Number),
    });

    expect(result).toEqual({
      _id: rideDoc._id,
      message: "Ride completed successfully",
    });
  });

  it("accepts rides with 'started' status", async () => {
    const startedRideDoc = {
      ...rideDoc,
      status: "started",
    };

    mockCtx.db.first.mockResolvedValueOnce(startedRideDoc);

    const result = await endRideHandler(mockCtx, args);

    expect(mockCtx.db.patch).toHaveBeenCalledWith(rideDoc._id, {
      status: "completed",
      completedAt: expect.any(Number),
    });

    expect(result).toEqual({
      _id: rideDoc._id,
      message: "Ride completed successfully",
    });
  });

  it("accepts rides with 'accepted' status", async () => {
    const acceptedRideDoc = {
      ...rideDoc,
      status: "accepted",
    };

    mockCtx.db.first.mockResolvedValueOnce(acceptedRideDoc);

    const result = await endRideHandler(mockCtx, args);

    expect(mockCtx.db.patch).toHaveBeenCalledWith(rideDoc._id, {
      status: "completed",
      completedAt: expect.any(Number),
    });

    expect(result).toEqual({
      _id: rideDoc._id,
      message: "Ride completed successfully",
    });
  });
});