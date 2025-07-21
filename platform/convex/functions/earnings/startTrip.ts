import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const startTrip = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    reservation: v.boolean(),
  },
  handler: async (ctx, { passengerId, driverId, reservation }) => {
    const startTime = Date.now();

    const tripId = await ctx.db.insert("trips", {
      driverId,
      passengerId,
      startTime,
      endTime: 0,
      fare: 0,
      reservation,
    });

    return tripId;
  },
});