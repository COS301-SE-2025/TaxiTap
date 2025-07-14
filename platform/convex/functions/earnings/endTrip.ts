import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const endTrip = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { passengerId }) => {
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_passenger_and_startTime", q => q.eq("passengerId", passengerId))
      .order("desc")
      .collect();

    const ongoingTrip = trips.find(t => t.endTime === 0);
    if (!ongoingTrip) throw new Error("No ongoing trip found.");

    const endTime = Date.now();
    const durationInMinutes = (endTime - ongoingTrip.startTime) / 60000;

    const baseFare = 20;
    const ratePerMinute = 5;
    const fare = baseFare + ratePerMinute * durationInMinutes;

    await ctx.db.patch(ongoingTrip._id, {
      endTime,
      fare: Math.round(fare),
    });

    return { endTime, fare };
  },
});