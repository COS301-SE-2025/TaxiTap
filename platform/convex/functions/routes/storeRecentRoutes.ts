import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const storeRouteForPassenger = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    routeId: v.string(),
  },
  handler: async (ctx, { passengerId, routeId }) => {
    // Check if route already exists for the passenger
    const existing = await ctx.db
      .query("passengerRoutes")
      .withIndex("by_passenger_and_route", q =>
        q.eq("passengerId", passengerId).eq("routeId", routeId)
      )
      .first();

    if (existing) {
      // If it exists, increment usageCount and update lastUsedAt
      await ctx.db.patch(existing._id, {
        usageCount: (existing.usageCount ?? 0) + 1,
        lastUsedAt: Date.now(),
      });
    } else {
      // If not, create a new record
      await ctx.db.insert("passengerRoutes", {
        passengerId,
        routeId,
        usageCount: 1,
        lastUsedAt: Date.now(),
      });
    }
  },
});