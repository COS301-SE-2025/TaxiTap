import { v } from "convex/values";
import { mutation, internalMutation, MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// Extract the handler logic for testing
export const sendRideNotificationHandler = async (
  ctx: MutationCtx,
  args: {
    rideId: string;
    type: string;
    passengerId?: Id<"taxiTap_users">;
    driverId?: Id<"taxiTap_users">;
  }
) => {
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) return;

  const notifications = [];

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
      
      // Also notify driver
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

  // Send all notifications using the internal mutation
  for (const notification of notifications) {
    await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, notification);
  }
};

// Then update your internalMutation to use the handler
export const sendRideNotification = internalMutation({
  args: {
    rideId: v.string(),
    type: v.string(),
    passengerId: v.optional(v.id("taxiTap_users")),
    driverId: v.optional(v.id("taxiTap_users"))
  },
  handler: sendRideNotificationHandler
});