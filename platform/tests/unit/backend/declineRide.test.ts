import { declineRideHandler } from "../../../convex/functions/rides/declineRideHandler";
import { internal } from "../../../convex/_generated/api";

describe("declineRideHandler", () => {
  const fakeArgs = {
    rideId: "ride_abc123",
    driverId: "user_driver123",
  };

  const fakeRide = {
    _id: "ride_doc456",
    rideId: fakeArgs.rideId,
    driverId: fakeArgs.driverId,
    passengerId: "user_passenger789",
    status: "requested",
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

  it("throws an error if the ride is not found", async () => {
    mockCtx.db.first.mockResolvedValueOnce(null);

    await expect(declineRideHandler(mockCtx, fakeArgs)).rejects.toThrow("Ride not found");
  });

  it("throws an error if the driver is not the assigned driver", async () => {
    mockCtx.db.first.mockResolvedValueOnce({
      ...fakeRide,
      driverId: "some_other_driver",
    });

    await expect(declineRideHandler(mockCtx, fakeArgs)).rejects.toThrow("Only the assigned driver can decline this ride");
  });

  it("throws an error if the ride is not in a pending status", async () => {
    mockCtx.db.first.mockResolvedValueOnce({
      ...fakeRide,
      status: "completed",
    });

    await expect(declineRideHandler(mockCtx, fakeArgs)).rejects.toThrow("Ride is not pending");
  });

  it("updates the ride and sends notification when valid", async () => {
    mockCtx.db.first.mockResolvedValueOnce(fakeRide);

    const result = await declineRideHandler(mockCtx, fakeArgs);

    expect(mockCtx.db.patch).toHaveBeenCalledWith(fakeRide._id, { status: "declined" });

    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId: fakeArgs.rideId,
        type: "ride_declined",
        driverId: fakeArgs.driverId,
        passengerId: fakeRide.passengerId,
      }
    );

    expect(result).toEqual({
      _id: fakeRide._id,
      message: "Ride declined by driver.",
    });
  });
});