import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export const switchDriverToBothHandler = async (
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
  
  if (user.accountType !== "driver") {
    throw new Error("User is not currently a driver");
  }
  
  // Update user account type to both and set current active role to driver
  await ctx.db.patch(args.userId, {
    accountType: "both",
    currentActiveRole: "driver",
    lastRoleSwitchAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  // Create passenger profile if it doesn't exist
  const existingPassengerProfile = await ctx.db
    .query("passengers")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .first();
  
  if (!existingPassengerProfile) {
    await ctx.db.insert("passengers", {
      userId: args.userId,
      numberOfRidesTaken: 0,
      totalDistance: 0,
      totalFare: 0,
      averageRating: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  
  return { success: true, message: "Account upgraded to both driver and passenger" };
};

export const switchDriverToBoth = mutation({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: switchDriverToBothHandler,
});