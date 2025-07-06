import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export const switchBothToDriverHandler = async (
  ctx: MutationCtx,
  args: { userId: Id<"taxiTap_users"> }
) => {
  const user = await ctx.db
    .query("taxiTap_users")
    .filter((q) => q.eq(q.field("_id"), args.userId))
    .first();
  
  if (!user) {
    throw new Error("User not found");
  }
  
  if (user.accountType !== "both") {
    throw new Error("User does not currently have both account types");
  }
  
  // Check if user has any active rides as a passenger
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
    throw new Error("Cannot switch to driver-only while you have active rides as a passenger");
  }
  
  // Update user account type to driver only
  await ctx.db.patch(args.userId, {
    accountType: "driver",
    currentActiveRole: "driver", // Set active role to driver since they're now driver-only
    lastRoleSwitchAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  return { success: true, message: "Account switched to driver only" };
};

export const switchBothToDriver = mutation({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: switchBothToDriverHandler,
});