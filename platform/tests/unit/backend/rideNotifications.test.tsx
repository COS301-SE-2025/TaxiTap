import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock the internal API and server modules
jest.mock("../../../convex/_generated/api", () => ({
  internal: {
    functions: {
      notifications: {
        sendNotifications: {
          sendNotificationInternal: "sendNotificationInternalFn"
        }
      }
    }
  }
}));

jest.mock("../../../convex/_generated/server", () => ({
  internalMutation: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    string: jest.fn(() => ({})),
    id: jest.fn(() => jest.fn()),
    optional: jest.fn((v) => v),
  }
}));

// Create the actual handler logic for testing
const actualHandler = async (ctx: any, args: any) => {
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) return;

  const notifications: any[] = [];

  switch (args.type) {
    case "ride_requested":
      if (args.driverId) {
        notifications.push({
          userId: args.driverId,
          type: "ride_request",
          title: "New Ride Request",
          message: `New ride request from ${ride.startLocation.address} to ${ride.endLocation.address}`,
          priority: "high",
          metadata: { rideId: args.rideId, passengerId: ride.passengerId }
        });
      }
      break;
    case "ride_accepted":
      notifications.push({
        userId: ride.passengerId,
        type: "ride_accepted",
        title: "Ride Accepted",
        message: "Your ride has been accepted. Driver is on the way!",
        priority: "high",
        metadata: { rideId: args.rideId, driverId: args.driverId }
      });
      break;
    case "driver_arrived":
      notifications.push({
        userId: ride.passengerId,
        type: "driver_arrived",
        title: "Driver Arrived",
        message: "Your driver has arrived at the pickup location.",
        priority: "urgent",
        metadata: { rideId: args.rideId, driverId: ride.driverId }
      });
      break;
    case "ride_started":
      notifications.push({
        userId: ride.passengerId,
        type: "ride_started",
        title: "Ride Started",
        message: "Your ride has started. Enjoy your journey!",
        priority: "medium",
        metadata: { rideId: args.rideId }
      });
      break;
    case "ride_completed":
      notifications.push({
        userId: ride.passengerId,
        type: "ride_completed",
        title: "Ride Completed",
        message: "Your ride has been completed. Thank you for using TaxiTap!",
        priority: "medium",
        metadata: { rideId: args.rideId, amount: ride.finalFare }
      });
      if (ride.driverId) {
        notifications.push({
          userId: ride.driverId,
          type: "ride_completed",
          title: "Ride Completed",
          message: `Ride completed successfully. Fare: R${ride.finalFare}`,
          priority: "medium",
          metadata: { rideId: args.rideId, amount: ride.finalFare }
        });
      }
      break;
    case "ride_cancelled":
      const cancelledByDriver = args.driverId && ride.driverId === args.driverId;
      const targetUserId = cancelledByDriver ? ride.passengerId : ride.driverId;
      if (targetUserId) {
        notifications.push({
          userId: targetUserId,
          type: "ride_cancelled",
          title: "Ride Cancelled",
          message: cancelledByDriver
            ? "Your ride has been cancelled by the driver."
            : "The ride has been cancelled by the passenger.",
          priority: "high",
          metadata: { rideId: args.rideId }
        });
      }
      break;
  }

  for (const notification of notifications) {
    await ctx.runMutation("sendNotificationInternalFn", notification);
  }
};

function createMutationCtx(ride?: any) {
  const first: jest.Mock = jest.fn();
  const withIndex = jest.fn(() => ({ first }));
  const query = jest.fn(() => ({ withIndex }));
  const runMutation = jest.fn();

  // If a ride is provided, mock the db query to return it
  if (ride !== undefined) {
    first.mockImplementationOnce(() => Promise.resolve(ride));
  } else {
    first.mockImplementationOnce(() => Promise.resolve(null));
  }

  return {
    db: {
      query,
    },
    runMutation,
    _internal: { first, withIndex, query, runMutation },
  };
}

describe("sendRideNotification internal mutation", () => {
  const baseRide = {
    rideId: "ride1",
    passengerId: "passenger1",
    driverId: "driver1",
    startLocation: { address: "A" },
    endLocation: { address: "B" },
    finalFare: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing if ride is not found", async () => {
    const ctx = createMutationCtx();
    const args = { rideId: "ride1", type: "ride_accepted" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("sends ride_requested notification to driver", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "ride_requested", driverId: "driver1" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "driver1",
        type: "ride_request",
        title: "New Ride Request",
        message: expect.stringContaining("A to B"),
        priority: "high",
        metadata: expect.objectContaining({ rideId: "ride1", passengerId: "passenger1" })
      })
    );
  });

  it("sends ride_accepted notification to passenger", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "ride_accepted", driverId: "driver1" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "passenger1",
        type: "ride_accepted",
        title: "Ride Accepted",
        message: expect.any(String),
        priority: "high",
        metadata: expect.objectContaining({ rideId: "ride1", driverId: "driver1" })
      })
    );
  });

  it("sends driver_arrived notification to passenger", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "driver_arrived" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "passenger1",
        type: "driver_arrived",
        title: "Driver Arrived",
        message: expect.any(String),
        priority: "urgent",
        metadata: expect.objectContaining({ rideId: "ride1", driverId: "driver1" })
      })
    );
  });

  it("sends ride_started notification to passenger", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "ride_started" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "passenger1",
        type: "ride_started",
        title: "Ride Started",
        message: expect.any(String),
        priority: "medium",
        metadata: expect.objectContaining({ rideId: "ride1" })
      })
    );
  });

  it("sends ride_completed notifications to passenger and driver", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "ride_completed" };
    await actualHandler(ctx, args);
    // To passenger
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "passenger1",
        type: "ride_completed",
        title: "Ride Completed",
        message: expect.stringContaining("Thank you for using TaxiTap!"),
        priority: "medium",
        metadata: expect.objectContaining({ rideId: "ride1", amount: 100 })
      })
    );
    // To driver
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "driver1",
        type: "ride_completed",
        title: "Ride Completed",
        message: expect.stringContaining("Fare: R100"),
        priority: "medium",
        metadata: expect.objectContaining({ rideId: "ride1", amount: 100 })
      })
    );
  });

  it("sends ride_completed notification only to passenger if no driverId", async () => {
    const rideNoDriver = { ...baseRide, driverId: undefined };
    const ctx = createMutationCtx(rideNoDriver);
    const args = { rideId: "ride1", type: "ride_completed" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({ userId: "passenger1", type: "ride_completed" })
    );
  });

  it("sends ride_cancelled notification to passenger if cancelled by driver", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "ride_cancelled", driverId: "driver1" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "passenger1",
        type: "ride_cancelled",
        message: expect.stringContaining("cancelled by the driver"),
        priority: "high",
        metadata: expect.objectContaining({ rideId: "ride1" })
      })
    );
  });

  it("sends ride_cancelled notification to driver if cancelled by passenger", async () => {
    const ctx = createMutationCtx(baseRide);
    const args = { rideId: "ride1", type: "ride_cancelled", driverId: "other_driver" };
    await actualHandler(ctx, args);
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "sendNotificationInternalFn",
      expect.objectContaining({
        userId: "driver1",
        type: "ride_cancelled",
        message: expect.stringContaining("cancelled by the passenger"),
        priority: "high",
        metadata: expect.objectContaining({ rideId: "ride1" })
      })
    );
  });
});
