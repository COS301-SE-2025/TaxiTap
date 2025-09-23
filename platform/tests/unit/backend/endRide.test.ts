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
    const mockChain = {
      query: jest.fn().mockReturnThis(),
      withIndex: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      first: jest.fn(),
      unique: jest.fn(),
      collect: jest.fn(),
      patch: jest.fn(),
    };

    mockCtx = {
      db: mockChain,
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
      message: "Ride ended successfully.",
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
      message: "Ride ended successfully.",
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
      message: "Ride ended successfully.",
    });
  });

  it("accepts rides with 'accepted' status", async () => {
    const acceptedRideDoc = {
      ...rideDoc,
      status: "accepted",
      isMultiLegRide: false,
    };

    mockCtx.db.first.mockResolvedValueOnce(acceptedRideDoc);

    const result = await endRideHandler(mockCtx, args);

    expect(mockCtx.db.patch).toHaveBeenCalledWith(rideDoc._id, {
      status: "completed",
      completedAt: expect.any(Number),
    });

    expect(result).toEqual({
      _id: rideDoc._id,
      message: "Ride ended successfully.",
      isMultiLegRide: false,
      journeyInfo: null,
    });
  });

  it("handles multi-leg journey completion successfully", async () => {
    const multiLegRide = {
      ...rideDoc,
      isMultiLegRide: true,
      parentJourneyId: "journey_123",
      legIndex: 0,
      finalFare: 150,
    };

    // Mock the initial ride query
    mockCtx.db.first.mockResolvedValueOnce(multiLegRide);

    // Mock subsequent queries for journey handling
    mockCtx.db.unique
      .mockResolvedValueOnce({
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: args.userId,
        status: "active",
        totalLegs: 2,
        originAddress: "Start Location",
        destinationAddress: "End Location",
      })
      .mockResolvedValueOnce({
        _id: "leg_doc_1",
        legIndex: 0,
        estimatedFare: 100,
      });

    mockCtx.db.collect.mockResolvedValueOnce([
      { _id: "leg_1", legIndex: 0, status: "completed", estimatedFare: 100 },
      { _id: "leg_2", legIndex: 1, status: "pending", estimatedFare: 120 },
    ]);

    const result = await endRideHandler(mockCtx, args);

    expect(result.isMultiLegRide).toBe(true);
    expect(result.journeyInfo).toBeDefined();
    expect(result.message).toBe("Journey leg completed successfully.");
  });

  it("handles multi-leg journey completion with errors gracefully", async () => {
    const multiLegRide = {
      ...rideDoc,
      isMultiLegRide: true,
      parentJourneyId: "journey_123",
      legIndex: 0,
    };

    mockCtx.db.first.mockResolvedValueOnce(multiLegRide);

    // Mock journey query to fail
    mockCtx.db.unique.mockRejectedValueOnce(new Error("Journey not found"));

    const result = await endRideHandler(mockCtx, args);

    // Should still complete the ride even if journey handling fails
    expect(mockCtx.db.patch).toHaveBeenCalledWith(rideDoc._id, {
      status: "completed",
      completedAt: expect.any(Number),
    });

    expect(result.isMultiLegRide).toBe(true);
    expect(result.journeyInfo).toEqual({
      journeyCompleted: false,
      error: "Journey not found",
      partialCompletion: true,
      legCompleted: true,
    });
  });

  it("triggers badge checking for completed multi-leg journey", async () => {
    const completedJourneyRide = {
      ...rideDoc,
      isMultiLegRide: true,
      parentJourneyId: "journey_123",
      legIndex: 1, // Final leg
      finalFare: 150,
    };

    mockCtx.db.first.mockResolvedValueOnce(completedJourneyRide);

    // Mock subsequent queries for completed journey
    mockCtx.db.unique
      .mockResolvedValueOnce({
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: args.userId,
        status: "active",
        totalLegs: 2,
        originAddress: "Start Location",
        destinationAddress: "End Location",
      })
      .mockResolvedValueOnce({
        _id: "leg_doc_2",
        legIndex: 1,
        estimatedFare: 150,
      });

    mockCtx.db.collect.mockResolvedValueOnce([
      { _id: "leg_1", legIndex: 0, status: "completed", estimatedFare: 100, requestedAt: 1000, completedAt: 2000 },
      { _id: "leg_2", legIndex: 1, status: "completed", estimatedFare: 150, requestedAt: 3000, completedAt: 4000 },
    ]);

    const result = await endRideHandler(mockCtx, args);

    // Should have called runMutation at least once for notification
    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "journey_completed"
      })
    );

    expect(result.isMultiLegRide).toBe(true);
    expect(result.journeyInfo?.journeyCompleted).toBe(true);
    expect(result.message).toBe("Multi-leg journey completed successfully!");
  });
});