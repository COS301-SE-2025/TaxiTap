import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const saveFeedback = mutation({
  args: {
    rideId: v.id("rides"),
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    startLocation: v.string(),
    endLocation: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("feedback")
      .withIndex("by_ride", (q) => q.eq("rideId", args.rideId))
      .first();

    if (existing) {
      throw new Error("Feedback already submitted for this ride.");
    }

    const id = await ctx.db.insert("feedback", {
      rideId: args.rideId,
      passengerId: args.passengerId,
      driverId: args.driverId,
      rating: args.rating,
      comment: args.comment,
      startLocation: args.startLocation,
      endLocation: args.endLocation,
      createdAt: Date.now(),
    });

    return { id };
  },
});