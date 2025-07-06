/**
 * mutations.ts
 * 
 * Convex mutations for route management operations.
 * Handles route assignments and driver-route associations.
 * 
 * @author Moyahabo Hamese
 */

import { mutation } from "../../_generated/server";
import { v } from "convex/values";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Assigns a random route to a driver based on their taxi association
 * 
 * 1. Fetches all active routes for the specified taxi association
 * 2. Randomly selects one route from the available options
 * 3. Updates the driver's record with the assigned route
 * 4. Records the assignment timestamp
 * 
 * @param userId - Driver's user ID
 * @param taxiAssociation - Taxi association name
 * @returns Object containing success status and assigned route details
 * @throws Error if no routes found or driver record doesn't exist
 */
export const assignRandomRouteToDriver = mutation({
  args: { 
    userId: v.id("taxiTap_users"),
    taxiAssociation: v.string()
  },
  handler: async (ctx, args) => {
    // Get all active routes for the specified taxi association
    const routes = await ctx.db
      .query("routes")
      .filter((q) => 
        q.and(
          q.eq(q.field("taxiAssociation"), args.taxiAssociation),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    if (routes.length === 0) {
      throw new Error(`No active routes found for taxi association: ${args.taxiAssociation}`);
    }

    // Get the driver record
    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!driver) {
      throw new Error("Driver record not found");
    }

    // Select a random route from available options
    const randomIndex = Math.floor(Math.random() * routes.length);
    const selectedRoute = routes[randomIndex];

    // Update the driver's assigned route and association
    await ctx.db.patch(driver._id, {
      assignedRoute: selectedRoute._id,
      taxiAssociation: args.taxiAssociation,
      routeAssignedAt: Date.now()
    });

    return {
      success: true,
      message: "Route assigned successfully",
      assignedRoute: selectedRoute
    };
  },
}); 