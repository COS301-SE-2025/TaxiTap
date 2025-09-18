import { query } from "../../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export async function getLoyalMemberStatusHandler(
  ctx: QueryCtx,
  args: { userId: Id<"taxiTap_users"> }
) {
  // Get the passenger profile using existing query
  const passengerProfile = await ctx.db
    .query("passengers")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .first();

  if (!passengerProfile) {
    return {
      isLoyalMember: false,
      rideCount: 0,
      ridesUntilLoyalMember: 10,
    };
  }

  const isLoyalMember = passengerProfile.numberOfRidesTaken >= 10;
  const ridesUntilLoyalMember = Math.max(0, 10 - passengerProfile.numberOfRidesTaken);

  return {
    isLoyalMember,
    rideCount: passengerProfile.numberOfRidesTaken,
    ridesUntilLoyalMember,
    totalFare: passengerProfile.totalFare || 0,
    totalDistance: passengerProfile.totalDistance || 0,
  };
}

export const getLoyalMemberStatus = query({
  args: { userId: v.id("taxiTap_users") },
  handler: getLoyalMemberStatusHandler,
});
