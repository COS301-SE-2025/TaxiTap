import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getFareForLatestTrip = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    // Check if user is a passenger
    const passengerTrip = await ctx.db
      .query("trips")
      .withIndex("by_passenger_and_startTime", q => q.eq("passengerId", userId))
      .order("desc")
      .first();

    if (passengerTrip) return passengerTrip.fare;

    // If not a passenger, check as driver
    const driverTrip = await ctx.db
      .query("trips")
      .withIndex("by_driver_and_startTime", q => q.eq("driverId", userId))
      .order("desc")
      .first();

    if (driverTrip) return driverTrip.fare;

    // No trip found
    return null;
  },
});