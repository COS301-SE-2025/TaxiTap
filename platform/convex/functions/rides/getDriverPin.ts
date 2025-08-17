import { v } from "convex/values";
import { query } from "../../_generated/server";

export const getDriverPin = query({
  args: {
    rideId: v.string(),
    driverId: v.id("taxiTap_users"),
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

    // Only return PIN to the driver who is assigned to this ride
    if (ride.driverId !== args.driverId) {
      throw new Error("Unauthorized access");
    }

    // Get driver's PIN from their user profile
    const driver = await ctx.db.get(args.driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    return {
      pin: driver.driverPin || "1234", // Fallback PIN if not set
      rideStatus: ride.status,
      driverName: driver.name,
    };
  },
});