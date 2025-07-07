import { query } from "../../_generated/server";
import { v } from "convex/values";

export const showFeedbackPassenger = query({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedback")
      .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
      .order("desc")
      .collect();
  },
});

export const showFeedbackDriver = query({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("feedback")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .order("desc")
      .collect();
  },
});