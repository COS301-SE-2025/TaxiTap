import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getActiveRideByDriver = query({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { driverId }) => {
    // Find the most recent active ride for this driver
    const activeRide = await ctx.db
      .query("rides")
      .withIndex("by_driver", (q) => q.eq("driverId", driverId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .order("desc")
      .first();

    if (!activeRide) {
      return null;
    }

    return {
      _id: activeRide._id,
      rideId: activeRide.rideId,
      status: activeRide.status,
      ridePin: activeRide.ridePin,
      passengerId: activeRide.passengerId,
      startLocation: activeRide.startLocation,
      endLocation: activeRide.endLocation,
      acceptedAt: activeRide.acceptedAt,
      startedAt: activeRide.startedAt,
    };
  },
});
