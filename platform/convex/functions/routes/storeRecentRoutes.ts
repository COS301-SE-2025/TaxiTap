import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const storeRouteForPassenger = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    routeId: v.string(),
    name: v.optional(v.string()), // Destination name
    startName: v.optional(v.string()), // Start location name
    startLat: v.optional(v.number()), // Start location latitude
    startLng: v.optional(v.number()), // Start location longitude
    destinationLat: v.optional(v.number()), // Destination latitude
    destinationLng: v.optional(v.number()), // Destination longitude
  },
  handler: async (ctx, { 
    passengerId, 
    routeId, 
    name, 
    startName, 
    startLat, 
    startLng, 
    destinationLat, 
    destinationLng 
  }) => {
    const existing = await ctx.db
      .query("passengerRoutes")
      .withIndex("by_passenger_and_route", q =>
        q.eq("passengerId", passengerId).eq("routeId", routeId)
      )
      .first();

    const updateData = {
      usageCount: existing ? (existing.usageCount ?? 0) + 1 : 1,
      lastUsedAt: Date.now(),
      ...(name && { name }),
      ...(startName && { startName }),
      ...(typeof startLat === 'number' && { startLat }),
      ...(typeof startLng === 'number' && { startLng }),
      ...(typeof destinationLat === 'number' && { destinationLat }),
      ...(typeof destinationLng === 'number' && { destinationLng }),
    };

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("passengerRoutes", {
        passengerId,
        routeId,
        ...updateData,
      });
    }
  },
});