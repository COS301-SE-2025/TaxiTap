import { query } from "../../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export async function getLoyalMemberStatusHandler(
  ctx: QueryCtx,
  args: { userId: Id<"taxiTap_users"> }
) {
  // Count actual completed rides for this user from the rides table
  const completedRides = await ctx.db
    .query("rides")
    .withIndex("by_passenger", (q) => q.eq("passengerId", args.userId))
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  const actualRideCount = completedRides.length;

  // Check if user has loyal member badge
  const loyalMemberBadge = await ctx.db
    .query("badges")
    .withIndex("by_user_and_type", (q) => 
      q.eq("userId", args.userId).eq("badgeType", "loyal_member")
    )
    .first();

  // Get passenger profile for additional data
  const passengerProfile = await ctx.db
    .query("passengers")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .first();

  const isLoyalMember = !!loyalMemberBadge && loyalMemberBadge.isActive;
  // Updated threshold: 1 ride instead of 5
  const ridesUntilLoyalMember = Math.max(0, 1 - actualRideCount);

  return {
    isLoyalMember,
    rideCount: actualRideCount,
    ridesUntilLoyalMember,
    totalFare: passengerProfile?.totalFare || 0,
    totalDistance: passengerProfile?.totalDistance || 0,
    badgeEarnedAt: loyalMemberBadge?.earnedAt,
  };
}

export const getLoyalMemberStatus = query({
  args: { userId: v.id("taxiTap_users") },
  handler: getLoyalMemberStatusHandler,
});
