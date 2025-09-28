import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const forceCancelStuckRides = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { passengerId, reason = "Force cancelled due to stuck state" }) => {
    try {
      console.log(`Force cancelling stuck rides for passenger ${passengerId}`);

      // Find all active rides for this passenger
      const activeRides = await ctx.db
        .query("rides")
        .withIndex("by_passenger", (q) => q.eq("passengerId", passengerId))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "requested"),
            q.eq(q.field("status"), "accepted"),
            q.eq(q.field("status"), "in_progress")
          )
        )
        .collect();

      if (activeRides.length === 0) {
        return {
          success: true,
          message: "No active rides found to cancel",
          cancelledRides: 0,
        };
      }

      // Cancel all active rides
      const cancelledRideIds = [];
      for (const ride of activeRides) {
        await ctx.db.patch(ride._id, {
          status: "cancelled",
        });
        cancelledRideIds.push(ride.rideId);
      }

      console.log(`Force cancelled ${cancelledRideIds.length} stuck rides:`, cancelledRideIds);

      return {
        success: true,
        message: `Successfully cancelled ${cancelledRideIds.length} stuck rides`,
        cancelledRides: cancelledRideIds.length,
        cancelledRideIds,
      };
    } catch (error) {
      console.error("Error force cancelling stuck rides:", error);
      throw new Error(`Failed to cancel stuck rides: ${error}`);
    }
  },
});
