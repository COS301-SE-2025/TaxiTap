import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export interface BadgeEligibility {
  isEligible: boolean;
  currentRides: number;
  paidRides: number;
  paymentRate: number;
}

export interface BadgeInfo {
  badgeType: "trusted_payer" | "frequent_rider" | "loyal_member"; // Add loyal_member
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGE_DEFINITIONS: Record<string, BadgeInfo> = {
  trusted_payer: {
    badgeType: "trusted_payer",
    name: "Trusted Payer",
    description: "Paid for 100% of rides taken",
    icon: "shield-checkmark",
    color: "#10B981", // Green
  },
  frequent_rider: {
    badgeType: "frequent_rider",
    name: "Frequent Rider",
    description: "Taken 50+ rides",
    icon: "car-sport",
    color: "#3B82F6", // Blue
  },
  loyal_member: {
    badgeType: "loyal_member",
    name: "Loyal Member",
    description: "Completed 1+ rides",
    icon: "trophy",
    color: "#34C759", // Green
  },
};

/**
 * Check if a passenger is eligible for the Trusted Payer badge
 */
export async function checkTrustedPayerEligibility(
  ctx: QueryCtx,
  userId: Id<"taxiTap_users">
): Promise<BadgeEligibility> {
  // Get all completed rides for this passenger
  const rides = await ctx.db
    .query("rides")
    .withIndex("by_passenger", (q) => q.eq("passengerId", userId))
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  if (rides.length === 0) {
    return {
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 0,
    };
  }

  // Count paid rides (tripPaid === true)
  const paidRides = rides.filter(ride => ride.tripPaid === true).length;
  const paymentRate = (paidRides / rides.length) * 100;

  return {
    isEligible: rides.length >= 1 && paymentRate === 100,
    currentRides: rides.length,
    paidRides,
    paymentRate,
  };
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(
  ctx: QueryCtx,
  userId: Id<"taxiTap_users">
): Promise<Array<{
  badgeType: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: number;
  isActive: boolean;
  metadata?: any;
}>> {
  const badges = await ctx.db
    .query("badges")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  return badges.map(badge => ({
    ...BADGE_DEFINITIONS[badge.badgeType],
    earnedAt: badge.earnedAt,
    isActive: badge.isActive,
    metadata: badge.metadata,
  }));
}

/**
 * Award a badge to a user
 */
export async function awardBadge(
  ctx: MutationCtx,
  userId: Id<"taxiTap_users">,
  badgeType: "trusted_payer" | "frequent_rider",
  metadata?: any
): Promise<void> {
  // Check if user already has this badge
  const existingBadge = await ctx.db
    .query("badges")
    .withIndex("by_user_and_type", (q) => 
      q.eq("userId", userId).eq("badgeType", badgeType)
    )
    .first();

  if (existingBadge) {
    // Update existing badge to active
    await ctx.db.patch(existingBadge._id, {
      isActive: true,
      earnedAt: Date.now(),
      metadata,
    });
  } else {
    // Create new badge
    await ctx.db.insert("badges", {
      userId,
      badgeType,
      earnedAt: Date.now(),
      isActive: true,
      metadata,
    });
  }
}

/**
 * Check and award Trusted Payer badge if eligible
 */
export async function checkAndAwardTrustedPayerBadge(
  ctx: MutationCtx,
  userId: Id<"taxiTap_users">
): Promise<boolean> {
  const eligibility = await checkTrustedPayerEligibility(ctx, userId);
  
  if (eligibility.isEligible) {
    await awardBadge(ctx, userId, "trusted_payer", {
      totalRides: eligibility.currentRides,
      paymentRate: eligibility.paymentRate,
    });
    return true;
  }
  
  return false;
}

/**
 * Get badge information for display
 */
export function getBadgeInfo(badgeType: string): BadgeInfo | null {
  return BADGE_DEFINITIONS[badgeType] || null;
}

