/**
 * journeyFailureHandler.ts
 *
 * Handles failed leg completions and provides fallback mechanisms
 * for multi-leg journeys when individual legs fail to complete.
 *
 * @author Git It Done
 */

import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

/**
 * Handler function for managing failed leg completions
 */
export async function handleFailedLegHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`⚠️ Handling failed leg ${args.legIndex} of journey ${args.journeyId}`);

    // Get the journey record
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      throw new Error("Journey not found");
    }

    if (journey.passengerId !== args.passengerId) {
      throw new Error("Unauthorized: Journey does not belong to this passenger");
    }

    // Get the failed leg record
    const failedLeg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
      )
      .unique();

    if (!failedLeg) {
      throw new Error("Failed leg not found");
    }

    // Update the failed leg status
    await ctx.db.patch(failedLeg._id, {
      status: "failed",
      failureReason: args.failureReason || "Unknown failure",
      failedAt: Date.now(),
      updatedAt: Date.now()
    });

    // Get all journey legs to assess journey status
    const allLegs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    const completedLegs = allLegs.filter(leg => leg.status === "completed");
    const failedLegs = allLegs.filter(leg => leg.status === "failed");
    const pendingLegs = allLegs.filter(leg => leg.status === "pending" || leg.status === "requesting");

    // Determine fallback strategy based on failure position and remaining legs
    const fallbackStrategy = determineFallbackStrategy(args.legIndex, allLegs, completedLegs, failedLegs);

    let journeyStatus = journey.status;
    let fallbackResult = null;

    switch (fallbackStrategy.action) {
      case "cancel_journey":
        journeyStatus = "cancelled";
        await cancelRemainingLegs(ctx, args.journeyId, pendingLegs);
        fallbackResult = await handleJourneyCancellation(ctx, journey, failedLeg, args.failureReason);
        break;

      case "partial_completion":
        journeyStatus = "completed";
        await cancelRemainingLegs(ctx, args.journeyId, pendingLegs);
        fallbackResult = await handlePartialCompletion(ctx, journey, completedLegs, failedLegs);
        break;

      case "continue_journey":
        // Journey continues with remaining legs
        fallbackResult = await handleContinueJourney(ctx, journey, failedLeg, pendingLegs);
        break;

      case "reroute_journey":
        fallbackResult = await handleJourneyReroute(ctx, journey, failedLeg, allLegs);
        break;
    }

    // Update journey status
    if (journeyStatus !== journey.status) {
      await ctx.db.patch(journey._id, {
        status: journeyStatus,
        updatedAt: Date.now(),
        ...(journeyStatus === "cancelled" && { cancelledAt: Date.now() }),
        ...(journeyStatus === "completed" && { completedAt: Date.now() })
      });
    }

    // Send appropriate notifications
    await sendFailureNotifications(ctx, journey, failedLeg, fallbackStrategy, fallbackResult);

    console.log(`✅ Failed leg handled with strategy: ${fallbackStrategy.action}`);

    return {
      success: true,
      fallbackStrategy: fallbackStrategy.action,
      journeyStatus,
      fallbackResult,
      message: fallbackStrategy.message
    };

  } catch (error) {
    console.error("❌ Error handling failed leg:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Determine the appropriate fallback strategy based on failure context
 */
function determineFallbackStrategy(failedLegIndex: number, allLegs: any[], completedLegs: any[], failedLegs: any[]) {
  const totalLegs = allLegs.length;
  const completionProgress = completedLegs.length / totalLegs;

  // If this is the first leg and it failed
  if (failedLegIndex === 0 && completedLegs.length === 0) {
    return {
      action: "cancel_journey",
      message: "Journey cancelled due to first leg failure",
      reason: "Cannot start journey without first leg"
    };
  }

  // If more than 75% of journey is complete
  if (completionProgress >= 0.75) {
    return {
      action: "partial_completion",
      message: "Journey marked as partially completed",
      reason: "Significant progress made, marking as successful"
    };
  }

  // If we're halfway through and multiple legs have failed
  if (failedLegs.length > 1 && completionProgress < 0.5) {
    return {
      action: "cancel_journey",
      message: "Journey cancelled due to multiple failures",
      reason: "Too many failed legs to continue safely"
    };
  }

  // If this is the last leg
  if (failedLegIndex === totalLegs - 1) {
    return {
      action: "partial_completion",
      message: "Journey completed to penultimate destination",
      reason: "Final leg failed but journey mostly successful"
    };
  }

  // If only one or two legs remain and progress is good
  const remainingLegs = totalLegs - completedLegs.length - failedLegs.length;
  if (remainingLegs <= 2 && completionProgress >= 0.5) {
    return {
      action: "reroute_journey",
      message: "Attempting to reroute remaining journey",
      reason: "Few legs remaining, rerouting possible"
    };
  }

  // Default: continue with remaining legs
  return {
    action: "continue_journey",
    message: "Continuing journey with remaining legs",
    reason: "Journey can continue despite this failure"
  };
}

/**
 * Cancel all remaining legs of a journey
 */
async function cancelRemainingLegs(ctx: any, journeyId: string, pendingLegs: any[]) {
  for (const leg of pendingLegs) {
    await ctx.db.patch(leg._id, {
      status: "cancelled",
      cancelledAt: Date.now(),
      updatedAt: Date.now()
    });
  }
  console.log(`🚫 Cancelled ${pendingLegs.length} remaining legs for journey ${journeyId}`);
}

/**
 * Handle journey cancellation due to leg failure
 */
async function handleJourneyCancellation(ctx: any, journey: any, failedLeg: any, failureReason: string) {
  console.log(`🚫 Cancelling journey ${journey.journeyId} due to leg failure`);

  // Create cancellation record in feedback table for tracking
  await ctx.db.insert("feedback", {
    rideId: failedLeg.rideId || null,
    passengerId: journey.passengerId,
    driverId: journey.passengerId, // Use passenger as placeholder
    rating: 1, // Low rating for cancelled journey
    comment: JSON.stringify({
      type: "journey_cancellation",
      journeyId: journey.journeyId,
      failedLegIndex: failedLeg.legIndex,
      failureReason,
      cancelledAt: Date.now(),
      partialProgress: {
        totalLegs: journey.totalLegs,
        completedLegs: failedLeg.legIndex // Legs completed before failure
      }
    }),
    startLocation: journey.originAddress,
    endLocation: journey.destinationAddress,
    createdAt: Date.now()
  });

  return {
    type: "cancellation",
    reason: failureReason,
    completedLegs: failedLeg.legIndex,
    refundEligible: failedLeg.legIndex === 0 // Refund if no progress made
  };
}

/**
 * Handle partial completion of journey
 */
async function handlePartialCompletion(ctx: any, journey: any, completedLegs: any[], failedLegs: any[]) {
  console.log(`✅ Marking journey ${journey.journeyId} as partially completed`);

  const totalFare = completedLegs.reduce((sum, leg) => sum + (leg.actualFare || leg.estimatedFare || 0), 0);
  const completionRate = completedLegs.length / journey.totalLegs;

  // Create partial completion record
  await ctx.db.insert("feedback", {
    rideId: completedLegs[0]?.rideId || null,
    passengerId: journey.passengerId,
    driverId: journey.passengerId,
    rating: Math.ceil(completionRate * 5), // Rating based on completion rate
    comment: JSON.stringify({
      type: "journey_partial_completion",
      journeyId: journey.journeyId,
      completedLegs: completedLegs.length,
      failedLegs: failedLegs.length,
      totalLegs: journey.totalLegs,
      completionRate,
      totalFare,
      partiallyCompletedAt: Date.now()
    }),
    startLocation: journey.originAddress,
    endLocation: completedLegs[completedLegs.length - 1]?.toAddress || journey.destinationAddress,
    createdAt: Date.now()
  });

  return {
    type: "partial_completion",
    completedLegs: completedLegs.length,
    totalLegs: journey.totalLegs,
    completionRate,
    totalFare,
    finalDestination: completedLegs[completedLegs.length - 1]?.toAddress
  };
}

/**
 * Handle continuing journey despite leg failure
 */
async function handleContinueJourney(ctx: any, journey: any, failedLeg: any, pendingLegs: any[]) {
  console.log(`➡️ Continuing journey ${journey.journeyId} despite leg ${failedLeg.legIndex} failure`);

  // Log the continuation decision
  await ctx.db.insert("feedback", {
    rideId: failedLeg.rideId || null,
    passengerId: journey.passengerId,
    driverId: journey.passengerId,
    rating: 3, // Neutral rating for continued journey
    comment: JSON.stringify({
      type: "journey_continuation",
      journeyId: journey.journeyId,
      failedLegIndex: failedLeg.legIndex,
      remainingLegs: pendingLegs.length,
      continuedAt: Date.now(),
      reason: "Journey continues with remaining legs"
    }),
    startLocation: failedLeg.fromAddress,
    endLocation: failedLeg.toAddress,
    createdAt: Date.now()
  });

  return {
    type: "continuation",
    remainingLegs: pendingLegs.length,
    nextLegIndex: pendingLegs.length > 0 ? Math.min(...pendingLegs.map(leg => leg.legIndex)) : null
  };
}

/**
 * Handle journey rerouting
 */
async function handleJourneyReroute(ctx: any, journey: any, failedLeg: any, allLegs: any[]) {
  console.log(`🔄 Attempting to reroute journey ${journey.journeyId} after leg ${failedLeg.legIndex} failure`);

  // For now, this is a placeholder - actual rerouting would require route planning
  // In a real implementation, this would call route planning services

  return {
    type: "reroute",
    message: "Rerouting service not implemented - continuing with existing route",
    originalLegIndex: failedLeg.legIndex,
    requiresManualIntervention: true
  };
}

/**
 * Send appropriate notifications for leg failures
 */
async function sendFailureNotifications(ctx: any, journey: any, failedLeg: any, strategy: any, result: any) {
  try {
    const notificationType = strategy.action === "cancel_journey" ? "ride_cancelled" : "system_maintenance";

    await ctx.runMutation(
      internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId: failedLeg.rideId || "",
        type: notificationType,
        driverId: undefined,
        passengerId: journey.passengerId,
        metadata: {
          journeyId: journey.journeyId,
          failedLegIndex: failedLeg.legIndex,
          fallbackAction: strategy.action,
          message: strategy.message,
          result
        }
      }
    );
  } catch (error) {
    console.warn("Failed to send failure notification:", error);
  }
}

/**
 * Handle failed leg completion
 */
export const handleFailedLeg = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    passengerId: v.id("taxiTap_users"),
    failureReason: v.optional(v.string()),
    rideId: v.optional(v.string())
  },
  handler: handleFailedLegHandler
});

/**
 * Handler function for getting journey recovery options
 */
export async function getJourneyRecoveryOptionsHandler(ctx: any, args: any): Promise<any> {
  try {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      return { success: false, message: "Journey not found" };
    }

    const allLegs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    const completedLegs = allLegs.filter(leg => leg.status === "completed");
    const failedLegs = allLegs.filter(leg => leg.status === "failed");
    const pendingLegs = allLegs.filter(leg => leg.status === "pending" || leg.status === "requesting");

    const options = [];

    // Option 1: Cancel remaining journey
    if (pendingLegs.length > 0) {
      options.push({
        action: "cancel_remaining",
        title: "Cancel Remaining Journey",
        description: "End the journey here and mark as partially completed",
        impact: `${completedLegs.length}/${allLegs.length} legs completed`,
        recommended: completedLegs.length / allLegs.length >= 0.75
      });
    }

    // Option 2: Continue with remaining legs
    if (pendingLegs.length > 0 && failedLegs.length <= 1) {
      options.push({
        action: "continue_journey",
        title: "Continue Journey",
        description: "Attempt to complete remaining legs of the journey",
        impact: `${pendingLegs.length} legs remaining`,
        recommended: failedLegs.length === 0
      });
    }

    // Option 3: Request assistance
    options.push({
      action: "request_assistance",
      title: "Request Support",
      description: "Get help from customer support for manual intervention",
      impact: "Manual resolution required",
      recommended: failedLegs.length > 1
    });

    return {
      success: true,
      options,
      journeyStatus: journey.status,
      completionRate: completedLegs.length / allLegs.length,
      stats: {
        total: allLegs.length,
        completed: completedLegs.length,
        failed: failedLegs.length,
        pending: pendingLegs.length
      }
    };

  } catch (error) {
    console.error("❌ Error getting recovery options:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Get recovery options for a failed journey
 */
export const getJourneyRecoveryOptions = query({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users")
  },
  handler: getJourneyRecoveryOptionsHandler
});