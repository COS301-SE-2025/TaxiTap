import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getPassengerTopRoutes = query({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { passengerId }) => {
    const routes = await ctx.db
      .query("passengerRoutes")
      .withIndex("by_passenger_last_used", (q) => q.eq("passengerId", passengerId))
      .order("desc")
      .collect();

    return routes
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 3);
  },
});