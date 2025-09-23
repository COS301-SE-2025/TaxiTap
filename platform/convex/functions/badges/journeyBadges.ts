/**
 * journeyBadges.ts
 *
 * Badge system for multi-leg journey achievements.
 * Awards badges based on journey completion milestones and efficiency.
 *
 * @author Git It Done
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

// Journey badge definitions
export const JOURNEY_BADGE_DEFINITIONS = {
  journey_pioneer: {
    badgeType: "journey_pioneer" as const,
    name: "Journey Pioneer",
    description: "Completed your first multi-leg journey",
    icon: "map",
    color: "#10B981", // Green
    requirements: "Complete 1 multi-leg journey"
  },
  journey_master: {
    badgeType: "journey_master" as const,
    name: "Journey Master",
    description: "Completed 10+ multi-leg journeys",
    icon: "trophy",
    color: "#FFD700", // Gold
    requirements: "Complete 10 multi-leg journeys"
  },
  transfer_expert: {
    badgeType: "transfer_expert" as const,
    name: "Transfer Expert",
    description: "Consistently efficient transfers",
    icon: "shuffle",
    color: "#8B5CF6", // Purple
    requirements: "Maintain 4.0+ transfer rating over 5 journeys"
  }
};

/**
 * Handler function for checking and awarding journey badges
 */
export async function checkAndAwardJourneyBadgesHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🏆 Checking journey badges for user ${args.userId}`);

    const badges = [];

    // Check for Journey Pioneer badge (first multi-leg journey)
    const pioneerCheck = await checkJourneyPioneerEligibility(ctx, args.userId);
    if (pioneerCheck.isEligible) {
      await awardJourneyBadge(ctx, args.userId, "journey_pioneer", {
        totalJourneys: pioneerCheck.totalJourneys,
        awardedForJourney: args.journeyId
      });
      badges.push("journey_pioneer");
    }

    // Check for Journey Master badge (10+ journeys)
    const masterCheck = await checkJourneyMasterEligibility(ctx, args.userId);
    if (masterCheck.isEligible) {
      await awardJourneyBadge(ctx, args.userId, "journey_master", {
        totalJourneys: masterCheck.totalJourneys,
        awardedForJourney: args.journeyId
      });
      badges.push("journey_master");
    }

    // Check for Transfer Expert badge (efficient transfers)
    const expertCheck = await checkTransferExpertEligibility(ctx, args.userId);
    if (expertCheck.isEligible) {
      await awardJourneyBadge(ctx, args.userId, "transfer_expert", {
        averageTransferRating: expertCheck.averageTransferRating,
        qualifyingJourneys: expertCheck.qualifyingJourneys,
        awardedForJourney: args.journeyId
      });
      badges.push("transfer_expert");
    }

    console.log(`✅ Journey badges check complete. Awarded: ${badges.join(', ')}`);

    return {
      success: true,
      badgesAwarded: badges,
      message: badges.length > 0
        ? `Congratulations! You earned: ${badges.map(b => JOURNEY_BADGE_DEFINITIONS[b as keyof typeof JOURNEY_BADGE_DEFINITIONS].name).join(', ')}`
        : "No new badges awarded"
    };

  } catch (error) {
    console.error("❌ Error checking journey badges:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Check Journey Pioneer badge eligibility (first multi-leg journey)
 */
async function checkJourneyPioneerEligibility(ctx: any, userId: Id<"taxiTap_users">) {
  // Check if user already has this badge
  const existingBadge = await ctx.db
    .query("badges")
    .withIndex("by_user_and_type", (q: any) =>
      q.eq("userId", userId).eq("badgeType", "journey_pioneer")
    )
    .first();

  if (existingBadge) {
    return { isEligible: false, totalJourneys: 0 };
  }

  // Count completed multi-leg journeys
  const completedJourneys = await ctx.db
    .query("multiLegJourneys")
    .withIndex("by_passenger", (q: any) => q.eq("passengerId", userId))
    .filter((q: any) => q.eq(q.field("status"), "completed"))
    .collect();

  return {
    isEligible: completedJourneys.length === 1, // First journey
    totalJourneys: completedJourneys.length
  };
}

/**
 * Check Journey Master badge eligibility (10+ journeys)
 */
async function checkJourneyMasterEligibility(ctx: any, userId: Id<"taxiTap_users">) {
  // Check if user already has this badge
  const existingBadge = await ctx.db
    .query("badges")
    .withIndex("by_user_and_type", (q: any) =>
      q.eq("userId", userId).eq("badgeType", "journey_master")
    )
    .first();

  if (existingBadge) {
    return { isEligible: false, totalJourneys: 0 };
  }

  // Count completed multi-leg journeys
  const completedJourneys = await ctx.db
    .query("multiLegJourneys")
    .withIndex("by_passenger", (q: any) => q.eq("passengerId", userId))
    .filter((q: any) => q.eq(q.field("status"), "completed"))
    .collect();

  return {
    isEligible: completedJourneys.length >= 10,
    totalJourneys: completedJourneys.length
  };
}

/**
 * Check Transfer Expert badge eligibility (efficient transfers)
 */
async function checkTransferExpertEligibility(ctx: any, userId: Id<"taxiTap_users">) {
  // Check if user already has this badge
  const existingBadge = await ctx.db
    .query("badges")
    .withIndex("by_user_and_type", (q: any) =>
      q.eq("userId", userId).eq("badgeType", "transfer_expert")
    )
    .first();

  if (existingBadge) {
    return { isEligible: false, averageTransferRating: 0, qualifyingJourneys: 0 };
  }

  // Get journey feedback records for transfer ratings
  const allFeedback = await ctx.db
    .query("feedback")
    .filter((q: any) => q.eq(q.field("passengerId"), userId))
    .collect();

  const journeyFeedbacks = allFeedback.filter((f: any) => {
    try {
      const comment = JSON.parse(f.comment || '{}');
      return comment.type === "journey_feedback" && comment.transferFeedback?.length > 0;
    } catch {
      return false;
    }
  });

  if (journeyFeedbacks.length < 5) {
    return { isEligible: false, averageTransferRating: 0, qualifyingJourneys: journeyFeedbacks.length };
  }

  // Calculate average transfer rating across all journeys
  let totalTransferRatings = 0;
  let totalTransfers = 0;

  journeyFeedbacks.forEach((feedback: any) => {
    try {
      const comment = JSON.parse(feedback.comment);
      if (comment.transferFeedback) {
        comment.transferFeedback.forEach((transfer: any) => {
          if (transfer.rating > 0) {
            totalTransferRatings += transfer.rating;
            totalTransfers++;
          }
        });
      }
    } catch {
      // Skip invalid feedback
    }
  });

  const averageTransferRating = totalTransfers > 0 ? totalTransferRatings / totalTransfers : 0;

  return {
    isEligible: journeyFeedbacks.length >= 5 && averageTransferRating >= 4.0,
    averageTransferRating,
    qualifyingJourneys: journeyFeedbacks.length
  };
}

/**
 * Award a journey badge to a user
 */
async function awardJourneyBadge(
  ctx: any,
  userId: Id<"taxiTap_users">,
  badgeType: "journey_pioneer" | "journey_master" | "transfer_expert",
  metadata?: any
): Promise<void> {
  // Check if user already has this badge
  const existingBadge = await ctx.db
    .query("badges")
    .withIndex("by_user_and_type", (q: any) =>
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

  console.log(`🏆 Awarded ${badgeType} badge to user ${userId}`);
}

/**
 * Check and award journey badges after journey completion
 */
export const checkAndAwardJourneyBadges = internalMutation({
  args: {
    userId: v.id("taxiTap_users"),
    journeyId: v.string(),
    triggeredBy: v.optional(v.string())
  },
  handler: checkAndAwardJourneyBadgesHandler
});

/**
 * Handler function for getting journey badge progress
 */
export async function getJourneyBadgeProgressHandler(ctx: any, args: any): Promise<any> {
  try {
    const userId = args.userId;

    // Get user's current journey badges
    const userBadges = await ctx.db
      .query("badges")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .filter((q: any) =>
        q.or(
          q.eq(q.field("badgeType"), "journey_pioneer"),
          q.eq(q.field("badgeType"), "journey_master"),
          q.eq(q.field("badgeType"), "transfer_expert")
        )
      )
      .collect();

    // Count completed journeys
    const completedJourneys = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_passenger", (q: any) => q.eq("passengerId", userId))
      .filter((q: any) => q.eq(q.field("status"), "completed"))
      .collect();

    // Get transfer ratings from feedback
    const allFeedback = await ctx.db
      .query("feedback")
      .filter((q: any) => q.eq(q.field("passengerId"), userId))
      .collect();

    const journeyFeedbacks = allFeedback.filter((f: any) => {
      try {
        const comment = JSON.parse(f.comment || '{}');
        return comment.type === "journey_feedback";
      } catch {
        return false;
      }
    });

    let totalTransferRatings = 0;
    let totalTransfers = 0;

    journeyFeedbacks.forEach((feedback: any) => {
      try {
        const comment = JSON.parse(feedback.comment);
        if (comment.transferFeedback) {
          comment.transferFeedback.forEach((transfer: any) => {
            if (transfer.rating > 0) {
              totalTransferRatings += transfer.rating;
              totalTransfers++;
            }
          });
        }
      } catch {
        // Skip invalid feedback
      }
    });

    const averageTransferRating = totalTransfers > 0 ? totalTransferRatings / totalTransfers : 0;

    const progress = {
      journey_pioneer: {
        ...JOURNEY_BADGE_DEFINITIONS.journey_pioneer,
        earned: userBadges.some((b: any) => b.badgeType === "journey_pioneer"),
        earnedAt: userBadges.find((b: any) => b.badgeType === "journey_pioneer")?.earnedAt,
        progress: Math.min(completedJourneys.length, 1),
        target: 1,
        progressText: `${completedJourneys.length}/1 journeys completed`
      },
      journey_master: {
        ...JOURNEY_BADGE_DEFINITIONS.journey_master,
        earned: userBadges.some((b: any) => b.badgeType === "journey_master"),
        earnedAt: userBadges.find((b: any) => b.badgeType === "journey_master")?.earnedAt,
        progress: Math.min(completedJourneys.length, 10),
        target: 10,
        progressText: `${completedJourneys.length}/10 journeys completed`
      },
      transfer_expert: {
        ...JOURNEY_BADGE_DEFINITIONS.transfer_expert,
        earned: userBadges.some((b: any) => b.badgeType === "transfer_expert"),
        earnedAt: userBadges.find((b: any) => b.badgeType === "transfer_expert")?.earnedAt,
        progress: Math.min(averageTransferRating, 4.0),
        target: 4.0,
        progressText: `${averageTransferRating.toFixed(1)}/4.0 average transfer rating`,
        qualifyingJourneys: journeyFeedbacks.length,
        needsMinJourneys: journeyFeedbacks.length < 5
      }
    };

    return {
      success: true,
      progress,
      totalJourneys: completedJourneys.length,
      totalTransferRating: averageTransferRating
    };

  } catch (error) {
    console.error("❌ Error getting journey badge progress:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Get journey badge progress for a user
 */
export const getJourneyBadgeProgress = query({
  args: {
    userId: v.id("taxiTap_users")
  },
  handler: getJourneyBadgeProgressHandler
});