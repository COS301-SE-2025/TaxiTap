// convex/functions/rides/getRidePin.ts
import { v } from "convex/values";
import { query } from "../../_generated/server";

export const getRidePin = query({
  args: {
    rideId: v.string(),
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    // Query the rides table for the ride with the given rideId
    const ride = await ctx.db
      .query("rides")
      .filter(q => q.eq(q.field("rideId"), args.rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    // Only return PIN to the passenger who made the reservation
    if (ride.passengerId !== args.passengerId) {
      throw new Error("Unauthorized access");
    }

    return {
      pin: ride.ridePin,
      pinGeneratedAt: ride.pinRegeneratedAt,
      rideStatus: ride.status,
    };
  },
});