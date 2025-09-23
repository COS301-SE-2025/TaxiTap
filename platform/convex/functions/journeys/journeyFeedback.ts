/**
 * journeyFeedback.ts
 *
 * Specialized feedback system for multi-leg journeys.
 * Handles feedback collection for complete journey experiences including
 * per-leg ratings, overall journey satisfaction, and transfer experience.
 *
 * @author Git It Done
 */

import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

/**
 * Handler function for submitting comprehensive feedback for a completed multi-leg journey
 */
export async function submitJourneyFeedbackHandler(ctx: any, args: any): Promise<any> {
    try {
      console.log(`📝 Submitting feedback for journey ${args.journeyId}`);

      // Verify journey exists and belongs to passenger
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

      if (journey.status !== "completed") {
        throw new Error("Cannot submit feedback for incomplete journey");
      }

      // Get all journey legs for validation
      const legs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .collect();

      // Submit feedback for each leg to the existing feedback system
      const legFeedbackResults = [];
      for (const legFeedback of args.legFeedback) {
        const leg = legs.find((l: any) => l.legIndex === legFeedback.legIndex);
        if (leg && leg.rideId && legFeedback.driverId) {
          try {
            // Submit to existing ride feedback system
            const feedbackId = await ctx.db.insert("feedback", {
              rideId: leg.rideId,
              passengerId: args.passengerId,
              driverId: legFeedback.driverId,
              rating: legFeedback.rating,
              comment: legFeedback.comment || `Multi-leg journey leg ${legFeedback.legIndex + 1}`,
              startLocation: leg.fromAddress,
              endLocation: leg.toAddress,
              createdAt: Date.now()
            });

            legFeedbackResults.push({
              legIndex: legFeedback.legIndex,
              feedbackId,
              success: true
            });
          } catch (error) {
            console.error(`Failed to submit feedback for leg ${legFeedback.legIndex}:`, error);
            legFeedbackResults.push({
              legIndex: legFeedback.legIndex,
              success: false,
              error: String(error)
            });
          }
        }
      }

      // Get driver from first leg's ride
      let driverId = args.passengerId; // Fallback to passenger
      if (legs[0]?.rideId) {
        const firstRide = await ctx.db.get(legs[0].rideId);
        if (firstRide?.driverId) {
          driverId = firstRide.driverId;
        }
      }

      // Create comprehensive journey feedback record using existing feedback table
      const journeyFeedbackId = await ctx.db.insert("feedback", {
        rideId: legs[0]?.rideId, // Use first leg's rideId as reference
        passengerId: args.passengerId,
        driverId: driverId,
        rating: args.overallRating,
        comment: JSON.stringify({
          type: "journey_feedback",
          journeyId: args.journeyId,
          overallComment: args.overallComment,
          transferFeedback: args.transferFeedback || [],
          journeyMetrics: args.journeyMetrics,
          improvementSuggestions: args.improvementSuggestions,
          additionalComments: args.additionalComments,
          totalLegs: legs.length,
          feedbackSource: "journey_completion"
        }),
        startLocation: journey.originAddress,
        endLocation: journey.destinationAddress,
        createdAt: Date.now()
      });

      // Update journey record to mark feedback as submitted
      await ctx.db.patch(journey._id, {
        updatedAt: Date.now()
      });

      // Send feedback acknowledgment notification
      try {
        await ctx.runMutation(
          internal.functions.notifications.rideNotifications.sendRideNotification,
          {
            rideId: "", // No specific ride for journey-wide feedback
            type: "feedback_received",
            driverId: undefined,
            passengerId: args.passengerId,
            metadata: {
              journeyId: args.journeyId,
              overallRating: args.overallRating,
              totalLegs: legs.length,
              feedbackType: "journey_feedback"
            }
          }
        );
      } catch (notificationError) {
        console.warn("Failed to send feedback acknowledgment notification:", notificationError);
      }

      console.log(`✅ Feedback submitted successfully for journey ${args.journeyId}`);

      return {
        success: true,
        journeyFeedbackId,
        legFeedbackResults,
        message: "Journey feedback submitted successfully",
        feedbackSummary: {
          overallRating: args.overallRating,
          legsRated: args.legFeedback.length,
          transfersRated: args.transferFeedback?.length || 0
        }
      };

    } catch (error) {
      console.error("❌ Error submitting journey feedback:", error);
      return {
        success: false,
        error: String(error)
      };
    }
}

/**
 * Submit comprehensive feedback for a completed multi-leg journey
 */
export const submitJourneyFeedback = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    overallRating: v.number(), // 1-5 overall journey rating
    overallComment: v.optional(v.string()),

    // Per-leg feedback
    legFeedback: v.array(v.object({
      legIndex: v.number(),
      driverId: v.optional(v.id("taxiTap_users")),
      rideId: v.optional(v.id("rides")),
      rating: v.number(), // 1-5 rating for this specific leg
      comment: v.optional(v.string()),
      issues: v.optional(v.array(v.string())), // ["late_arrival", "route_deviation", etc.]
    })),

    // Transfer experience feedback
    transferFeedback: v.optional(v.array(v.object({
      transferIndex: v.number(), // Between leg X and leg X+1
      rating: v.number(), // 1-5 rating for transfer experience
      waitTime: v.optional(v.number()), // Minutes waited for next taxi
      issues: v.optional(v.array(v.string())), // ["long_wait", "confusing_location", etc.]
      suggestions: v.optional(v.string())
    }))),

    // Journey-wide feedback
    journeyMetrics: v.optional(v.object({
      totalDuration: v.number(), // Actual total duration in minutes
      expectedDuration: v.number(), // What user expected
      totalCost: v.number(), // Actual total cost
      expectedCost: v.number(), // What user expected
      wouldUseAgain: v.boolean(),
      wouldRecommend: v.boolean()
    })),

    improvementSuggestions: v.optional(v.string()),
    additionalComments: v.optional(v.string())
  },
  handler: submitJourneyFeedbackHandler
});

/**
 * Handler function for getting feedback summary for a journey (for admin/analytics)
 */
export async function getJourneyFeedbackSummaryHandler(ctx: any, args: any): Promise<any> {
  try {
    // Find journey feedback by looking for feedback with journey metadata
    const allFeedback = await ctx.db
      .query("feedback")
      .collect();

    const feedback = allFeedback.find((f: any) => {
      try {
        const comment = JSON.parse(f.comment || '{}');
        return comment.type === "journey_feedback" && comment.journeyId === args.journeyId;
      } catch {
        return false;
      }
    });

    if (!feedback) {
      return {
        success: false,
        message: "No feedback found for this journey"
      };
    }

    // Get journey details
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    return {
      success: true,
      feedback,
      journeyInfo: journey ? {
        status: journey.status,
        totalLegs: journey.totalLegs,
        completedAt: journey.completedAt
      } : null
    };

  } catch (error) {
    console.error("❌ Error getting journey feedback summary:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Get feedback summary for a journey (for admin/analytics)
 */
export const getJourneyFeedbackSummary = query({
  args: {
    journeyId: v.string()
  },
  handler: getJourneyFeedbackSummaryHandler
});

/**
 * Handler function for checking if passenger can submit feedback for a journey
 */
export async function canSubmitFeedbackHandler(ctx: any, args: any): Promise<any> {
  try {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      return {
        canSubmit: false,
        reason: "Journey not found"
      };
    }

    if (journey.passengerId !== args.passengerId) {
      return {
        canSubmit: false,
        reason: "Unauthorized"
      };
    }

    if (journey.status !== "completed") {
      return {
        canSubmit: false,
        reason: "Journey not completed yet"
      };
    }

    // Check if feedback already submitted
    const allFeedback = await ctx.db
      .query("feedback")
      .collect();

    const existingFeedback = allFeedback.find((f: any) => {
      try {
        const comment = JSON.parse(f.comment || '{}');
        return comment.type === "journey_feedback" && comment.journeyId === args.journeyId;
      } catch {
        return false;
      }
    });

    if (existingFeedback) {
      return {
        canSubmit: false,
        reason: "Feedback already submitted",
        existingFeedback: {
          submittedAt: existingFeedback.createdAt,
          overallRating: existingFeedback.rating
        }
      };
    }

    // Check feedback window (e.g., within 7 days of completion)
    const feedbackWindowDays = 7;
    const feedbackDeadline = journey.completedAt + (feedbackWindowDays * 24 * 60 * 60 * 1000);
    const now = Date.now();

    if (now > feedbackDeadline) {
      return {
        canSubmit: false,
        reason: "Feedback window expired",
        deadline: feedbackDeadline
      };
    }

    return {
      canSubmit: true,
      journey: {
        journeyId: journey.journeyId,
        totalLegs: journey.totalLegs,
        completedAt: journey.completedAt,
        estimatedTotalFare: journey.estimatedTotalFare,
        feedbackDeadline
      }
    };

  } catch (error) {
    console.error("❌ Error checking feedback eligibility:", error);
    return {
      canSubmit: false,
      reason: "System error",
      error: String(error)
    };
  }
}

/**
 * Check if passenger can submit feedback for a journey
 */
export const canSubmitFeedback = query({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users")
  },
  handler: canSubmitFeedbackHandler
});

/**
 * Handler function for getting journey details for feedback form
 */
export async function getJourneyForFeedbackHandler(ctx: any, args: any): Promise<any> {
  try {
    // Verify access
    const canSubmit = await canSubmitFeedbackHandler(ctx, args);
    if (!canSubmit.canSubmit) {
      return {
        success: false,
        reason: canSubmit.reason
      };
    }

    // Get journey details
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      return {
        success: false,
        reason: "Journey not found"
      };
    }

    // Get all legs with ride details
    const legs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    // Sort legs by index
    legs.sort((a: any, b: any) => a.legIndex - b.legIndex);

    // Get ride and driver details for each leg
    const enrichedLegs = [];
    for (const leg of legs) {
      let driverInfo = null;
      let rideInfo = null;

      if (leg.rideId) {
        const ride = await ctx.db.get(leg.rideId);
        if (ride && ride.driverId) {
          const driver = await ctx.db.get(ride.driverId);
          const driverUser = driver ? await ctx.db.get(driver.userId) : null;

          driverInfo = driverUser ? {
            driverId: ride.driverId,
            driverUserId: driver.userId,
            name: driverUser.name,
            phoneNumber: driverUser.phoneNumber
          } : null;

          rideInfo = {
            rideId: ride._id,
            status: ride.status,
            actualFare: ride.finalFare || ride.estimatedFare,
            estimatedFare: ride.estimatedFare
          };
        }
      }

      enrichedLegs.push({
        ...leg,
        driverInfo,
        rideInfo
      });
    }

    return {
      success: true,
      journey: {
        journeyId: journey.journeyId,
        status: journey.status,
        totalLegs: journey.totalLegs,
        originAddress: journey.originAddress,
        destinationAddress: journey.destinationAddress,
        estimatedTotalFare: journey.estimatedTotalFare,
        completedAt: journey.completedAt,
        createdAt: journey.createdAt
      },
      legs: enrichedLegs,
      feedbackWindow: canSubmit.journey?.feedbackDeadline
    };

  } catch (error) {
    console.error("❌ Error getting journey for feedback:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Get journey details for feedback form
 */
export const getJourneyForFeedback = query({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users")
  },
  handler: getJourneyForFeedbackHandler
});

/**
 * Handler function for requesting feedback from passenger after journey completion
 */
export async function requestJourneyFeedbackHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`📬 Requesting feedback for journey ${args.journeyId}`);

    // Verify journey is completed
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey || journey.status !== "completed") {
      return {
        success: false,
        reason: "Journey not completed"
      };
    }

    // Check if feedback request already sent by looking for recent notifications
    const recentNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.passengerId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("type"), "rating_request"),
          q.gt(q.field("createdAt"), Date.now() - (24 * 60 * 60 * 1000)) // Last 24 hours
        )
      )
      .collect();

    const existingRequest = recentNotifications.find((n: any) =>
      n.metadata?.journeyId === args.journeyId
    );

    if (existingRequest) {
      return {
        success: false,
        reason: "Feedback request already sent"
      };
    }

    // Send feedback request notification
    const delayMs = (args.delayMinutes || 5) * 60 * 1000; // Default 5 minute delay

    setTimeout(async () => {
      try {
        await ctx.runMutation(
          internal.functions.notifications.rideNotifications.sendRideNotification,
          {
            rideId: "", // No specific ride for journey feedback
            type: "rating_request",
            driverId: undefined,
            passengerId: args.passengerId,
            metadata: {
              journeyId: args.journeyId,
              requestType: "journey_feedback",
              totalLegs: journey.totalLegs,
              delayMinutes: args.delayMinutes || 5
            }
          }
        );
      } catch (notificationError) {
        console.error("Failed to send feedback request notification:", notificationError);
      }
    }, delayMs);

    console.log(`✅ Feedback request scheduled for journey ${args.journeyId} in ${args.delayMinutes || 5} minutes`);

    return {
      success: true,
      scheduledFor: Date.now() + delayMs,
      message: "Feedback request scheduled successfully"
    };

  } catch (error) {
    console.error("❌ Error requesting journey feedback:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Request feedback from passenger after journey completion
 * Called automatically by the journey completion system
 */
export const requestJourneyFeedback = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    delayMinutes: v.optional(v.number()) // Optional delay before sending request
  },
  handler: requestJourneyFeedbackHandler
});

