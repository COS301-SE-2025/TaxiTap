import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const storeRouteForPassenger = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    routeId: v.string(),
  },
  handler: async (ctx, args) => {
    const { passengerId, routeId, } = args;

    const existing = await ctx.db
      .query("passengerRoutes")
      .withIndex("by_passenger_and_route", q =>
        q.eq("passengerId", passengerId).eq("routeId", routeId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        usageCount: (existing.usageCount || 0) + 1,
        lastUsedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("passengerRoutes", {
        passengerId,
        routeId,
        usageCount: 1,
        lastUsedAt: Date.now(),
      });
    }
  },
});
