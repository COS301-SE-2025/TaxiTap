import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

export const startRide = mutation({
  args: {
    rideId: v.string(),
    userId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    // Find the ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }
    if (ride.passengerId !== args.userId) {
      throw new Error("Only the passenger can start the ride");
    }
    if (ride.status !== "accepted") {
      throw new Error("Ride is not ready to start");
    }

    // Update the ride status
    await ctx.db.patch(ride._id, {
      status: "in_progress",
      startedAt: Date.now(),
    });

    // Notify both driver and passenger
    await ctx.runMutation(internal.functions.notifications.rideNotifications.sendRideNotification, {
      rideId: args.rideId,
      type: "ride_started",
      driverId: ride.driverId,
      passengerId: ride.passengerId,
    });

    return {
      _id: ride._id,
      message: "Ride marked as started.",
    };
  },
}); 