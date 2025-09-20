import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getActiveRideByPassenger = query({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { passengerId }) => {
    // Find the most recent active ride for this passenger
    const activeRide = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", passengerId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "requested"),
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
      driverId: activeRide.driverId,
      startLocation: activeRide.startLocation,
      endLocation: activeRide.endLocation,
      estimatedFare: activeRide.estimatedFare,
      requestedAt: activeRide.requestedAt,
      acceptedAt: activeRide.acceptedAt,
      startedAt: activeRide.startedAt,
    };
  },
});
