import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export interface BadgeEligibility {
  isEligible: boolean;
  currentRides: number;
  paidRides: number;
  paymentRate: number;
}

export interface BadgeInfo {
  badgeType: "trusted_payer" | "frequent_rider" | "loyal_member" | "marathon_driver" | "top_earner";
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGE_DEFINITIONS: Record<string, BadgeInfo> = {
  trusted_payer: {
    badgeType: "trusted_payer",
    name: "Trusted Payer",
    description: "Paid for 100% of rides",
    icon: "shield-check",
    color: "#10B981", // Green
  },
  frequent_rider: {
    badgeType: "frequent_rider",
    name: "Frequent Rider",
    description: "Completed 10+ rides",
    icon: "star",
    color: "#3B82F6", // Blue
  },
  loyal_member: {
    badgeType: "loyal_member",
    name: "Loyal Member",
    description: "7-day ride streak",
    icon: "heart",
    color: "#8B5CF6", // Purple
  },
  marathon_driver: {
    badgeType: "marathon_driver",
    name: "Marathon Driver",
    description: "Completed at least one ride",
    icon: "trophy",
    color: "#FF6B35", // Orange
  },
  top_earner: {
    badgeType: "top_earner",
    name: "Top Earner",
    description: "Top 10 driver by earnings",
    icon: "diamond",
    color: "#FFD700", // Gold
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
  badgeType: "trusted_payer" | "frequent_rider" | "loyal_member" | "marathon_driver" | "top_earner",
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

/**
 * Get total earnings for a driver from trips
 */
export async function getDriverTotalEarnings(
  ctx: QueryCtx,
  userId: Id<"taxiTap_users">
): Promise<number> {
  const trips = await ctx.db
    .query("trips")
    .withIndex("by_driver_and_startTime", (q) => q.eq("driverId", userId))
    .collect();

  return trips.reduce((total, trip) => total + trip.fare, 0);
}

/**
 * Get top 10 drivers by earnings
 */
export async function getTopEarners(
  ctx: QueryCtx,
  limit: number = 10
): Promise<Array<{ driverId: Id<"taxiTap_users">; totalEarnings: number }>> {
  // Get all drivers
  const drivers = await ctx.db
    .query("taxiTap_users")
    .filter((q) => 
      q.or(
        q.eq(q.field("accountType"), "driver"),
        q.eq(q.field("accountType"), "both")
      )
    )
    .collect();

  // Calculate earnings for each driver
  const driverEarnings = await Promise.all(
    drivers.map(async (driver) => {
      const totalEarnings = await getDriverTotalEarnings(ctx, driver._id);
      return {
        driverId: driver._id,
        totalEarnings,
      };
    })
  );

  // Sort by earnings and return top drivers
  return driverEarnings
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, limit);
}

/**
 * Check if a driver is eligible for the Top Earner badge
 */
export async function checkTopEarnerEligibility(
  ctx: QueryCtx,
  userId: Id<"taxiTap_users">
): Promise<BadgeEligibility> {
  const topEarners = await getTopEarners(ctx, 10);
  const userEarnings = await getDriverTotalEarnings(ctx, userId);
  
  // Check if user is in top 10 and has earnings > 0
  const isInTop10 = topEarners.some(earner => 
    earner.driverId === userId && earner.totalEarnings > 0
  );

  return {
    isEligible: isInTop10,
    currentRides: 0, // Not applicable for earnings badge
    paidRides: 0, // Not applicable for earnings badge
    paymentRate: 100, // Not applicable for earnings badge
  };
}

/**
 * Check and award Top Earner badge if eligible
 */
export async function checkAndAwardTopEarnerBadge(
  ctx: MutationCtx,
  userId: Id<"taxiTap_users">
): Promise<boolean> {
  const eligibility = await checkTopEarnerEligibility(ctx, userId);
  
  if (eligibility.isEligible) {
    const totalEarnings = await getDriverTotalEarnings(ctx, userId);
    await awardBadge(ctx, userId, "top_earner", {
      totalEarnings,
    });
    return true;
  }
  
  return false;
}

/**
 * Update Top Earner badges for all drivers
 * This should be called periodically to ensure top earners are up to date
 */
export async function updateTopEarnerBadges(
  ctx: MutationCtx
): Promise<void> {
  // Get current top earners
  const topEarners = await getTopEarners(ctx, 10);
  const topEarnerIds = topEarners.map(earner => earner.driverId);

  // Get all drivers
  const allDrivers = await ctx.db
    .query("taxiTap_users")
    .filter((q) => 
      q.or(
        q.eq(q.field("accountType"), "driver"),
        q.eq(q.field("accountType"), "both")
      )
    )
    .collect();

  // Process each driver
  for (const driver of allDrivers) {
    const isTopEarner = topEarnerIds.includes(driver._id);
    
    // Check if driver currently has top_earner badge
    const existingBadge = await ctx.db
      .query("badges")
      .withIndex("by_user_and_type", (q) => 
        q.eq("userId", driver._id).eq("badgeType", "top_earner")
      )
      .first();

    if (isTopEarner) {
      // Award or update badge
      if (existingBadge) {
        await ctx.db.patch(existingBadge._id, {
          isActive: true,
          earnedAt: Date.now(),
          metadata: {
            totalEarnings: topEarners.find(e => e.driverId === driver._id)?.totalEarnings || 0,
          },
        });
      } else {
        await ctx.db.insert("badges", {
          userId: driver._id,
          badgeType: "top_earner",
          earnedAt: Date.now(),
          isActive: true,
          metadata: {
            totalEarnings: topEarners.find(e => e.driverId === driver._id)?.totalEarnings || 0,
          },
        });
      }
    } else {
      // Deactivate badge if driver is no longer in top 10
      if (existingBadge) {
        await ctx.db.patch(existingBadge._id, {
          isActive: false,
        });
      }
    }
  }
}

/**
 * Check if a driver is eligible for the Marathon Driver badge
 */
export async function checkMarathonDriverEligibility(
  ctx: QueryCtx,
  userId: Id<"taxiTap_users">
): Promise<BadgeEligibility> {
  // Get all completed rides for this driver
  const rides = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q) => q.eq("driverId", userId))
    .filter((q) => q.eq(q.field("status"), "completed"))
    .collect();

  return {
    isEligible: rides.length >= 1,
    currentRides: rides.length,
    paidRides: rides.length, // All completed rides are considered "paid" for drivers
    paymentRate: 100, // Not applicable for driver badge
  };
}

/**
 * Check and award Marathon Driver badge if eligible
 */
export async function checkAndAwardMarathonDriverBadge(
  ctx: MutationCtx,
  userId: Id<"taxiTap_users">
): Promise<boolean> {
  const eligibility = await checkMarathonDriverEligibility(ctx, userId);
  
  if (eligibility.isEligible) {
    await awardBadge(ctx, userId, "marathon_driver", {
      totalRides: eligibility.currentRides,
    });
    return true;
  }
  
  return false;
}


