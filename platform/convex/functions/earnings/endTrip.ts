import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const endTrip = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { passengerId }) => {
    // Step 1: Find the most recent ongoing trip
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_passenger_and_startTime", q => q.eq("passengerId", passengerId))
      .order("desc")
      .collect();

    const ongoingTrip = trips.find(t => t.endTime === 0);
    if (!ongoingTrip) throw new Error("No ongoing trip found.");

    // Step 2: Find the corresponding ride (if any) to get the estimated fare
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_trip_id", q => q.eq("tripId", ongoingTrip._id)) // You must have this index
      .unique();

    if (!ride || ride.estimatedFare == null) {
      throw new Error("Estimated fare not found for this trip.");
    }

    const endTime = Date.now();

    // Step 3: Patch the trip with the endTime and fare from rides
    await ctx.db.patch(ongoingTrip._id, {
      endTime,
      fare: ride.estimatedFare,
    });

    return { endTime, fare: ride.estimatedFare };
  },
});