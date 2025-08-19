// updateUserLocation.ts

/**
 * Convex mutation for updating a user's real-time location.
 * Ensures each user has at most one location record by removing any existing one.
 * 
 * updateUserLocationHandler is added for easier unit testing.
 * updateUserLocation is used in the production runtime.
 * 
 * @author Moyahabo Hamese
 */

import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { updateUserLocationHandler } from "./updateUserLocationHandler";

/**
 * Convex mutation for updating a user's location.
 */
export const updateUserLocation = mutation({
  args: {
    userId: v.id("taxiTap_users"), // ID of the user (foreign key to `taxiTap_users`)
    latitude: v.number(),          // Latitude coordinate
    longitude: v.number(),         // Longitude coordinate
    role: v.union(                 // Role of the user (restricted literal values)
      v.literal("passenger"), 
      v.literal("driver"), 
      v.literal("both")
    ),
  },
  handler: updateUserLocationHandler,
});
