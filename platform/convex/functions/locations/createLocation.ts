import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const createLocation = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    latitude: v.number(),
    longitude: v.number(),
    role: v.union(v.literal("driver"), v.literal("passenger"), v.literal("both")),
  },
  handler: async (ctx, { userId, latitude, longitude, role }) => {
    const existing = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) {
      await ctx.db.insert("locations", {
        userId,
        latitude,
        longitude,
        updatedAt: new Date().toISOString(),
        role,
      });
    }
  },
});