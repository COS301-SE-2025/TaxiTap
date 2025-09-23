import { checkAndAwardMarathonDriverBadge } from "../badges/badgeService";
import { internal } from "../../_generated/api";

export const endRideHandler = async (ctx: any, args: any) => {
  try {
    // Validate input parameters
    if (!args.rideId || !args.userId) {
      throw new Error("Missing required parameters: rideId and userId");
    }

    // Find the ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    if (ride.passengerId !== args.userId) {
      throw new Error("Only the assigned passenger can end this ride");
    }

    // Fix: Include "in_progress" status in the check
    if (ride.status !== "accepted" && ride.status !== "started" && ride.status !== "in_progress") {
      throw new Error("Ride is not in progress or started");
    }

    // Update the ride status
    await ctx.db.patch(ride._id, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Check if this ride is part of a multi-leg journey
    const isMultiLegRide = !!(ride.isMultiLegRide && ride.parentJourneyId);
    let journeyCompletionResult = null;

    if (isMultiLegRide) {
      console.log(`🚗 Completing leg ${ride.legIndex} of multi-leg journey ${ride.parentJourneyId}`);

      try {
        // Validate journey completion prerequisites
        if (!ride.parentJourneyId) {
          throw new Error("Missing parentJourneyId for multi-leg ride");
        }
        if (ride.legIndex === undefined || ride.legIndex === null) {
          throw new Error("Missing legIndex for multi-leg ride");
        }

        // Handle multi-leg journey completion logic
        journeyCompletionResult = await handleMultiLegJourneyCompletion(ctx, {
          journeyId: ride.parentJourneyId,
          completedLegIndex: ride.legIndex,
          rideId: args.rideId,
          actualFare: ride.finalFare || ride.estimatedFare,
          passengerId: args.userId,
          driverId: ride.driverId
        });

        // If journey completion succeeded, log success
        if (journeyCompletionResult) {
          console.log(`✅ Journey completion handled successfully for ${ride.parentJourneyId}`);
        }

      } catch (journeyError: any) {
        console.error("❌ Error handling multi-leg journey completion:", journeyError);

        // Record the error for later analysis/recovery
        try {
          await ctx.runMutation(
            internal.functions.notifications.rideNotifications.sendRideNotification,
            {
              rideId: args.rideId,
              type: "system_maintenance",
              driverId: undefined,
              passengerId: args.userId,
              metadata: {
                errorType: "journey_completion_failed",
                journeyId: ride.parentJourneyId,
                legIndex: ride.legIndex,
                error: journeyError.message,
                rideId: args.rideId,
                needsManualReview: true
              }
            }
          );
        } catch (notificationError) {
          console.error("Failed to send error notification:", notificationError);
        }

        // Set a partial result to indicate the issue
        journeyCompletionResult = {
          journeyCompleted: false,
          error: journeyError.message,
          partialCompletion: true,
          legCompleted: true // The individual ride leg was still completed
        };
      }
    }

    // Check and award Marathon Driver badge if eligible
    if (ride.driverId) {
      try {
        await checkAndAwardMarathonDriverBadge(ctx, ride.driverId);
      } catch (error) {
        console.warn("Failed to check Marathon Driver badge eligibility:", error);
      }
    }

    // Send appropriate notification based on ride type
    try {
      const notificationType = isMultiLegRide ?
        (journeyCompletionResult?.journeyCompleted ? "journey_completed" : "journey_leg_completed") :
        "ride_completed";

      await ctx.runMutation(
        require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
        {
          rideId: args.rideId,
          type: notificationType,
          driverId: ride.driverId,
          passengerId: args.userId,
          metadata: isMultiLegRide ? {
            journeyId: ride.parentJourneyId,
            legIndex: ride.legIndex,
            journeyCompleted: journeyCompletionResult?.journeyCompleted || false,
            totalLegs: journeyCompletionResult?.totalLegs || 0
          } : null,
        }
      );
    } catch (notificationError: any) {
      // Log the error but don't fail the ride ending
      console.warn("Failed to send ride completion notification:",
        notificationError.message);
    }

    // Return response with journey information only for multi-leg rides
    const response: any = {
      _id: ride._id,
      message: isMultiLegRide ?
        (journeyCompletionResult?.journeyCompleted ?
          "Multi-leg journey completed successfully!" :
          "Journey leg completed successfully.") :
        "Ride ended successfully."
    };

    // Only add multi-leg fields for multi-leg rides
    if (isMultiLegRide) {
      response.isMultiLegRide = isMultiLegRide;
      response.journeyInfo = journeyCompletionResult;
    } else if (ride.isMultiLegRide === false) {
      // Explicitly show isMultiLegRide: false when the ride property exists and is false
      response.isMultiLegRide = false;
      response.journeyInfo = null;
    }

    return response;
  } catch (error: any) {
    throw new Error(`Failed to end ride: ${error.message}`);
  }
};

/**
 * Handles the completion of a multi-leg journey when a ride ends
 */
async function handleMultiLegJourneyCompletion(ctx: any, args: {
  journeyId: string;
  completedLegIndex: number;
  rideId: string;
  actualFare?: number;
  passengerId: string;
  driverId?: string;
}) {
  try {
    console.log(`🔄 Processing journey completion for ${args.journeyId}, leg ${args.completedLegIndex}`);

    // Validate input parameters
    if (!args.journeyId || args.journeyId.trim() === "") {
      throw new Error("Invalid journeyId provided");
    }
    if (args.completedLegIndex < 0) {
      throw new Error("Invalid legIndex: must be non-negative");
    }
    if (!args.passengerId) {
      throw new Error("Missing passengerId for journey completion");
    }

    // Get the journey record
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey not found: ${args.journeyId}`);
    }

    // Validate journey state
    if (journey.status === "completed") {
      console.warn(`⚠️ Journey ${args.journeyId} already marked as completed`);
      return {
        journeyCompleted: true,
        alreadyCompleted: true,
        message: "Journey was already completed"
      };
    }

    if (journey.status === "cancelled") {
      throw new Error(`Cannot complete leg for cancelled journey: ${args.journeyId}`);
    }

    // Verify the passenger matches
    if (journey.passengerId !== args.passengerId) {
      throw new Error(`Passenger mismatch for journey ${args.journeyId}`);
    }

    // Get the completed leg record
    const completedLeg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.completedLegIndex)
      )
      .unique();

    if (!completedLeg) {
      throw new Error(`Completed leg not found: journey ${args.journeyId}, leg ${args.completedLegIndex}`);
    }

    // Validate leg state
    if (completedLeg.status === "completed") {
      console.warn(`⚠️ Leg ${args.completedLegIndex} of journey ${args.journeyId} already completed`);
      // Continue processing to check overall journey status
    }

    // Validate leg index consistency
    if (args.completedLegIndex >= journey.totalLegs) {
      throw new Error(`Invalid leg index ${args.completedLegIndex} for journey with ${journey.totalLegs} legs`);
    }

    // Update the completed leg with actual fare and completion status
    try {
      await ctx.db.patch(completedLeg._id, {
        status: "completed",
        actualFare: args.actualFare || completedLeg.estimatedFare, // Fallback to estimated fare
        completedAt: Date.now(),
        rideId: args.rideId
      });
      console.log(`✅ Updated leg ${args.completedLegIndex} status to completed`);
    } catch (updateError: any) {
      throw new Error(`Failed to update leg status: ${updateError.message}`);
    }

    // Get all legs to check if journey is complete
    const allLegs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    if (allLegs.length === 0) {
      throw new Error(`No legs found for journey ${args.journeyId}`);
    }

    if (allLegs.length !== journey.totalLegs) {
      console.warn(`⚠️ Leg count mismatch: expected ${journey.totalLegs}, found ${allLegs.length}`);
    }

    const completedLegs = allLegs.filter((leg: any) => leg.status === "completed");
    const failedLegs = allLegs.filter((leg: any) => leg.status === "failed");
    const isJourneyComplete = completedLegs.length === allLegs.length;

    console.log(`📊 Journey progress: ${completedLegs.length}/${allLegs.length} legs completed, ${failedLegs.length} failed`);

    if (isJourneyComplete) {
      console.log(`🎯 Journey ${args.journeyId} completed successfully!`);

      try {
        // Update journey status to completed
        await ctx.db.patch(journey._id, {
          status: "completed",
          completedAt: Date.now(),
          updatedAt: Date.now()
        });
        console.log(`✅ Journey ${args.journeyId} marked as completed`);
      } catch (statusUpdateError: any) {
        console.error(`❌ Failed to update journey status:`, statusUpdateError);
        throw new Error(`Failed to mark journey as completed: ${statusUpdateError.message}`);
      }

      // Generate journey completion summary with error handling
      let journeySummary;
      try {
        journeySummary = await generateJourneySummary(ctx, args.journeyId, allLegs);
        console.log(`📊 Journey summary generated successfully`);
      } catch (summaryError) {
        console.error(`❌ Failed to generate journey summary:`, summaryError);
        // Create a basic summary with available data
        journeySummary = {
          journeyId: args.journeyId,
          totalLegs: allLegs.length,
          totalEstimatedFare: allLegs.reduce((sum: any, leg: any) => sum + (leg.estimatedFare || 0), 0),
          totalActualFare: completedLegs.reduce((sum: any, leg: any) => sum + (leg.actualFare || leg.estimatedFare || 0), 0),
          fareVariance: 0,
          totalDuration: 0,
          completedAt: Date.now(),
          error: "Failed to generate complete summary",
          partialData: true
        };
      }

      // Send journey completion notification with enhanced error handling
      try {
        await ctx.runMutation(
          internal.functions.notifications.rideNotifications.sendRideNotification,
          {
            rideId: args.rideId,
            type: "journey_completed",
            driverId: args.driverId,
            passengerId: args.passengerId,
            metadata: {
              journeyId: args.journeyId,
              totalLegs: allLegs.length,
              totalFare: journeySummary.totalActualFare,
              totalDuration: journeySummary.totalDuration
            }
          }
        );
        console.log(`📢 Journey completion notification sent successfully`);
      } catch (notificationError) {
        console.error("❌ Failed to send journey completion notification:", notificationError);
        // Don't throw - this is non-critical
      }

      // Request feedback for completed journey
      try {
        await ctx.runMutation(
          internal.functions.journeys.journeyFeedback.requestJourneyFeedback,
          {
            journeyId: args.journeyId,
            passengerId: args.passengerId,
            delayMinutes: 5 // Request feedback after 5 minutes
          }
        );
        console.log(`📬 Feedback request scheduled for completed journey ${args.journeyId}`);
      } catch (feedbackError) {
        console.warn("Failed to request journey feedback:", feedbackError);
      }

      // Collect journey analytics and metrics
      try {
        await ctx.runMutation(
          internal.functions.journeys.journeyAnalytics.collectJourneyMetrics,
          {
            journeyId: args.journeyId,
            triggeredBy: "journey_completion"
          }
        );
        console.log(`📊 Journey analytics collected for ${args.journeyId}`);
      } catch (analyticsError) {
        console.warn("Failed to collect journey analytics:", analyticsError);
        // Don't throw - this is non-critical
      }

      // Check and award journey badges
      try {
        await ctx.runMutation(
          internal.functions.badges.journeyBadges.checkAndAwardJourneyBadges,
          {
            userId: args.passengerId,
            journeyId: args.journeyId,
            triggeredBy: "journey_completion"
          }
        );
        console.log(`🏆 Journey badges checked for user ${args.passengerId}`);
      } catch (badgeError) {
        console.warn("Failed to check journey badges:", badgeError);
        // Don't throw - this is non-critical
      }

      return {
        journeyCompleted: true,
        totalLegs: allLegs.length,
        completedLegs: completedLegs.length,
        journeySummary,
        message: "Multi-leg journey completed successfully!"
      };
    } else {
      console.log(`✅ Leg ${args.completedLegIndex} completed. Journey continues: ${completedLegs.length}/${allLegs.length} legs done`);

      // Update journey progress
      await ctx.db.patch(journey._id, {
        currentLegIndex: Math.max(journey.currentLegIndex, args.completedLegIndex + 1),
        updatedAt: Date.now()
      });

      return {
        journeyCompleted: false,
        totalLegs: allLegs.length,
        completedLegs: completedLegs.length,
        nextLegIndex: args.completedLegIndex + 1,
        message: `Leg ${args.completedLegIndex + 1} completed. ${allLegs.length - completedLegs.length} legs remaining.`
      };
    }

  } catch (error) {
    console.error("❌ Error in handleMultiLegJourneyCompletion:", error);
    throw error;
  }
}

/**
 * Generates a comprehensive summary of the completed journey
 */
async function generateJourneySummary(ctx: any, journeyId: string, legs: any[]) {
  try {
    let totalEstimatedFare = 0;
    let totalActualFare = 0;
    let totalDuration = 0;
    let startTime = Infinity;
    let endTime = 0;

    for (const leg of legs) {
      totalEstimatedFare += leg.estimatedFare || 0;
      totalActualFare += leg.actualFare || leg.estimatedFare || 0;

      if (leg.requestedAt && leg.requestedAt < startTime) {
        startTime = leg.requestedAt;
      }
      if (leg.completedAt && leg.completedAt > endTime) {
        endTime = leg.completedAt;
      }
    }

    totalDuration = endTime - startTime;

    const summary = {
      journeyId,
      totalLegs: legs.length,
      totalEstimatedFare: Math.round(totalEstimatedFare * 100) / 100,
      totalActualFare: Math.round(totalActualFare * 100) / 100,
      fareVariance: Math.round((totalActualFare - totalEstimatedFare) * 100) / 100,
      totalDuration: totalDuration,
      completedAt: Date.now(),
      legDetails: legs.map(leg => ({
        legIndex: leg.legIndex,
        fromAddress: leg.fromAddress,
        toAddress: leg.toAddress,
        estimatedFare: leg.estimatedFare,
        actualFare: leg.actualFare || leg.estimatedFare,
        status: leg.status,
        completedAt: leg.completedAt
      }))
    };

    console.log(`📊 Journey ${journeyId} summary:`, {
      totalFare: summary.totalActualFare,
      totalLegs: summary.totalLegs,
      duration: `${Math.round(summary.totalDuration / 60000)}min`
    });

    return summary;
  } catch (error) {
    console.error("❌ Error generating journey summary:", error);
    return {
      journeyId,
      totalLegs: legs.length,
      totalEstimatedFare: 0,
      totalActualFare: 0,
      fareVariance: 0,
      totalDuration: 0,
      completedAt: Date.now(),
      error: "Failed to generate complete summary"
    };
  }
}