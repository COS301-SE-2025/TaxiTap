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
    const isMultiLegRide = ride.isMultiLegRide && ride.parentJourneyId;
    let journeyCompletionResult = null;

    if (isMultiLegRide) {
      console.log(`🚗 Completing leg ${ride.legIndex} of multi-leg journey ${ride.parentJourneyId}`);

      try {
        // Handle multi-leg journey completion logic
        journeyCompletionResult = await handleMultiLegJourneyCompletion(ctx, {
          journeyId: ride.parentJourneyId,
          completedLegIndex: ride.legIndex,
          rideId: args.rideId,
          actualFare: ride.finalFare || ride.estimatedFare,
          passengerId: args.userId,
          driverId: ride.driverId
        });
      } catch (journeyError: any) {
        console.error("❌ Error handling multi-leg journey completion:", journeyError);
        // Don't fail the ride completion, but log the error
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

    // Return enhanced response with journey information
    const response = {
      _id: ride._id,
      message: isMultiLegRide ?
        (journeyCompletionResult?.journeyCompleted ?
          "Multi-leg journey completed successfully!" :
          "Journey leg completed successfully.") :
        "Ride ended successfully.",
      isMultiLegRide,
      journeyInfo: journeyCompletionResult
    };

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

    // Get the journey record
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      throw new Error("Journey not found");
    }

    // Get the completed leg record
    const completedLeg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.completedLegIndex)
      )
      .unique();

    if (!completedLeg) {
      throw new Error("Completed leg not found");
    }

    // Update the completed leg with actual fare and completion status
    await ctx.db.patch(completedLeg._id, {
      status: "completed",
      actualFare: args.actualFare,
      completedAt: Date.now(),
      rideId: args.rideId
    });

    // Get all legs to check if journey is complete
    const allLegs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    const completedLegs = allLegs.filter(leg => leg.status === "completed");
    const isJourneyComplete = completedLegs.length === allLegs.length;

    if (isJourneyComplete) {
      console.log(`🎯 Journey ${args.journeyId} completed successfully!`);

      // Update journey status to completed
      await ctx.db.patch(journey._id, {
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now()
      });

      // Generate journey completion summary
      const journeySummary = await generateJourneySummary(ctx, args.journeyId, allLegs);

      // Send journey completion notification
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
      } catch (notificationError) {
        console.warn("Failed to send journey completion notification:", notificationError);
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