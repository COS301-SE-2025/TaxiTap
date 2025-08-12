import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getActiveTrips = query({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    const { driverId } = args;

    const activeRides = await ctx.db
      .query("rides")
      .withIndex("by_driver", q => q.eq("driverId", driverId))
      .filter(q => q.eq(q.field("status"), "in_progress"))
      .collect();

    const unpaidRides = await ctx.db
      .query("rides")
      .withIndex("by_driver", q => q.eq("driverId", driverId))
      .filter(q => q.eq(q.field("tripPaid"), false))
      .collect();

    let activeCount = activeRides.length;
    let paidCount = 0;
    let noResponseCount = 0;
    const passengers = [];

    for (const ride of activeRides) {
      if (ride.tripPaid === true) paidCount++;
      else if (ride.tripPaid === null || ride.tripPaid === undefined) noResponseCount++;

      const passenger = await ctx.db.get(ride.passengerId);
      if (passenger) {
        passengers.push({
          name: passenger.name,
          phoneNumber: passenger.phoneNumber,
          fare: ride.finalFare ?? ride.estimatedFare ?? 0,
          tripPaid: ride.tripPaid ?? null,
        });
      }
    }

    return {
      activeCount,
      paidCount,
      unpaidCount: unpaidRides.length,
      noResponseCount,
      passengers,
    };
  },
});