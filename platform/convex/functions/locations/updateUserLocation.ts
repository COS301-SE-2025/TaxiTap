/**
 * updateUserLocation.ts
 * 
 * Convex mutation to update or insert a user's current location.
 * Ensures only one location record exists per user by removing the old one (if any)
 * and inserting the latest location details including role and timestamp.
 * 
 * Used for real-time location updates of passengers, drivers, or users with both roles.
 * 
 * @author Moyahabo Hamese
 */

import { mutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Updates the location of a user (driver, passenger, or both).
 * Ensures existing location is removed to prevent duplication,
 * and a new entry is inserted with the latest coordinates and timestamp.
 * 
 * @param userId - ID of the user from the `taxiTap_users` table
 * @param latitude - User's current latitude
 * @param longitude - User's current longitude
 * @param role - Role of the user (passenger, driver, or both)
 */
export const updateUserLocation = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    latitude: v.number(),
    longitude: v.number(),
    role: v.union(v.literal("passenger"), v.literal("driver"), v.literal("both")),
  },
  handler: async (ctx, { userId, latitude, longitude, role }) => {
    // Check if a location record already exists for the user
    const existing = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // If it exists, remove the old location record
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Insert the new location with current coordinates, role, and timestamp
    await ctx.db.insert("locations", {
      userId,
      latitude,
      longitude,
      role,
      updatedAt: new Date().toISOString(),
    });
  },
});
