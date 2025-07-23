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

    const matchingRide = await ctx.db
      .query("rides")
      .withIndex("by_passenger_and_driver", q =>
        q.eq("passengerId", passengerId).eq("driverId", driverId)
      )
      .order("desc")
      .collect();

    const rideToPatch = matchingRide.find(r => !r.tripId);

    if (rideToPatch) {
      await ctx.db.patch(rideToPatch._id, {
        tripId,
      });
    }

    return tripId;
  },
});