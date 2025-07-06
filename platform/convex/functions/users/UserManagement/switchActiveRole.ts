import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export const switchActiveRoleHandler = async (
  ctx: MutationCtx,
  args: { 
    userId: Id<"taxiTap_users">;
    newRole: "passenger" | "driver";
  }
) => {
  const user = await ctx.db
    .query("taxiTap_users")
    .filter((q) => q.eq(q.field("_id"), args.userId))
    .first();
  
  if (!user) {
    throw new Error("User not found");
  }
  
  if (user.accountType !== "both") {
    throw new Error("User must have both account types to switch active roles");
  }
  
  if (user.currentActiveRole === args.newRole) {
    throw new Error(`User is already in ${args.newRole} mode`);
  }
  
  // Check for active rides before switching roles
  if (args.newRole === "passenger") {
    // Switching to passenger - check for active driver rides
    const activeDriverRides = await ctx.db
      .query("rides")
      .withIndex("by_driver", (q) => q.eq("driverId", args.userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .first();
    
    if (activeDriverRides) {
      throw new Error("Cannot switch to passenger mode while you have active rides as a driver");
    }
  } else {
    // Switching to driver - check for active passenger rides
    const activePassengerRides = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", args.userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "requested"),
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .first();
    
    if (activePassengerRides) {
      throw new Error("Cannot switch to driver mode while you have active rides as a passenger");
    }
  }
  
  // Update user's current active role
  await ctx.db.patch(args.userId, {
    currentActiveRole: args.newRole,
    lastRoleSwitchAt: Date.now(),
    updatedAt: Date.now(),
  });

  // If switching to driver, ensure a location record exists
  if (args.newRole === "driver") {
    const existingLocation = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!existingLocation) {
      await ctx.db.insert("locations", {
        userId: args.userId,
        latitude: 0,
        longitude: 0,
        updatedAt: new Date().toISOString(),
        role: "driver",
      });
    }
  }
  
  return { 
    success: true, 
    message: `Successfully switched to ${args.newRole} mode`,
    newRole: args.newRole
  };
};

export const switchActiveRole = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    newRole: v.union(v.literal("passenger"), v.literal("driver")),
  },
  handler: switchActiveRoleHandler,
});