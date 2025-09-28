// Journey state management for multi-leg journeys
import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * Create a new multi-leg journey
 */
export const createMultiLegJourney = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    journeyOption: v.object({
      journeyId: v.string(),
      leg1: v.object({
        routeName: v.string(),
        origin: v.object({
          coordinates: v.object({ latitude: v.number(), longitude: v.number() }),
          address: v.string(),
        }),
        destination: v.object({
          coordinates: v.object({ latitude: v.number(), longitude: v.number() }),
          address: v.string(),
        }),
        originStopId: v.string(),
        destinationStopId: v.string(),
        estimatedCost: v.number(),
      }),
      leg2: v.object({
        routeName: v.string(),
        origin: v.object({
          coordinates: v.object({ latitude: v.number(), longitude: v.number() }),
          address: v.string(),
        }),
        destination: v.object({
          coordinates: v.object({ latitude: v.number(), longitude: v.number() }),
          address: v.string(),
        }),
        originStopId: v.string(),
        destinationStopId: v.string(),
        estimatedCost: v.number(),
      }),
      totalEstimatedCost: v.number(),
      transferPoint: v.object({
        stop1_id: v.string(),
        stop2_id: v.string(),
        walkingDistance: v.number(),
        estimatedWalkingTime: v.number(),
      }),
    }),
  },
  handler: async (ctx: MutationCtx, { passengerId, journeyOption }) => {
    const now = Date.now();

    const journeyId = await ctx.db.insert("multiLegJourneys", {
      journeyId: journeyOption.journeyId,
      passengerId,
      status: "planned",
      currentLegIndex: 0,
      totalLegs: 2,

      originLocation: journeyOption.leg1.origin,
      finalDestination: journeyOption.leg2.destination,
      transferPoint: journeyOption.transferPoint,

      legs: [
        {
          legIndex: 0,
          routeName: journeyOption.leg1.routeName,
          origin: journeyOption.leg1.origin,
          destination: journeyOption.leg1.destination,
          originStopId: journeyOption.leg1.originStopId,
          destinationStopId: journeyOption.leg1.destinationStopId,
          estimatedCost: journeyOption.leg1.estimatedCost,
          status: "pending",
        },
        {
          legIndex: 1,
          routeName: journeyOption.leg2.routeName,
          origin: journeyOption.leg2.origin,
          destination: journeyOption.leg2.destination,
          originStopId: journeyOption.leg2.originStopId,
          destinationStopId: journeyOption.leg2.destinationStopId,
          estimatedCost: journeyOption.leg2.estimatedCost,
          status: "pending",
        },
      ],

      totalEstimatedCost: journeyOption.totalEstimatedCost,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Created multi-leg journey: ${journeyOption.journeyId}`);

    return { journeyId: journeyOption.journeyId, dbId: journeyId };
  },
});

/**
 * Start a specific leg of the journey
 */
export const startJourneyLeg = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    rideId: v.id("rides"),
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx: MutationCtx, { journeyId, legIndex, rideId, driverId }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    const now = Date.now();
    const updatedLegs = journey.legs.map((leg, index) => {
      if (index === legIndex) {
        return {
          ...leg,
          status: "in_progress" as const,
          rideId,
          driverId,
          startedAt: now,
        };
      }
      return leg;
    });

    await ctx.db.patch(journey._id, {
      status: "in_progress",
      currentLegIndex: legIndex,
      legs: updatedLegs,
      updatedAt: now,
      ...(legIndex === 0 && { startedAt: now }),
    });

    console.log(`Started leg ${legIndex + 1} of journey ${journeyId}`);

    return { success: true };
  },
});

/**
 * Complete a specific leg of the journey
 */
export const completeLegWithPayment = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    actualCost: v.number(),
  },
  handler: async (ctx: MutationCtx, { journeyId, legIndex, actualCost }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    const now = Date.now();
    const completedLeg = journey.legs[legIndex];

    const updatedLegs = journey.legs.map((leg, index) => {
      if (index === legIndex) {
        return {
          ...leg,
          status: "completed" as const,
          actualCost,
          completedAt: now,
        };
      }
      return leg;
    });

    const totalActualCost = updatedLegs
      .filter(leg => leg.actualCost !== undefined)
      .reduce((sum, leg) => sum + (leg.actualCost || 0), 0);

    // Update the corresponding ride and trip records for driver statistics
    if (completedLeg.rideId) {
      try {
        const ride = await ctx.db.get(completedLeg.rideId);
        if (ride) {
          // Verify that payment has been confirmed before completing the leg
          if (ride.tripPaid !== true) {
            console.warn(`Payment not confirmed for ride ${ride.rideId}, leg ${legIndex}. Auto-confirming payment.`);
            // Auto-confirm payment if actualCost is provided (coming from feedback submission)
            if (actualCost > 0) {
              console.log(`Auto-confirming payment: ${actualCost} for ride ${ride.rideId}`);
              await ctx.db.patch(completedLeg.rideId, {
                tripPaid: true,
                amountPaid: actualCost,
                paymentType: "exact",
                paymentConfirmedAt: now,
              });
              console.log(`Payment auto-confirmed for ride ${ride.rideId}`);
            } else {
              throw new Error("Payment must be confirmed before completing this leg of the journey. Please use the payment confirmation screen first.");
            }
          }

          // Use the actual payment amount from the ride record, not the passed actualCost
          const actualPaymentAmount = ride.amountPaid || actualCost;

          // Update ride with final cost information
          await ctx.db.patch(completedLeg.rideId, {
            finalFare: actualPaymentAmount,
            paymentConfirmedAt: now,
          });

          // Update the corresponding trip record for driver statistics
          if (ride.tripId) {
            const trip = await ctx.db.get(ride.tripId);
            if (trip) {
              await ctx.db.patch(ride.tripId, {
                fare: actualPaymentAmount,
                endTime: now,
              });
              console.log(`Updated multi-leg trip ${ride.tripId} fare to ${actualPaymentAmount} for leg ${legIndex + 1}`);
            }
          }

          // Update the actualCost to match the payment amount for consistency
          actualCost = actualPaymentAmount;
        }
      } catch (error) {
        console.error(`Error updating trip record for multi-leg journey leg ${legIndex}:`, error);
        throw error; // Re-throw payment verification errors
      }
    }

    const isLastLeg = legIndex === journey.totalLegs - 1;
    const isJourneyComplete = isLastLeg;

    console.log(`Journey completion check:`, {
      legIndex,
      totalLegs: journey.totalLegs,
      isLastLeg,
      isJourneyComplete,
      journeyId
    });

    await ctx.db.patch(journey._id, {
      legs: updatedLegs,
      totalActualCost,
      updatedAt: now,
      ...(isJourneyComplete && {
        status: "completed",
        completedAt: now,
      }),
      // REMOVED: Transfer timeout setup - manual flow doesn't use timeouts
      // ...(isLastLeg && legIndex < journey.totalLegs - 1 && {
      //   transferTimeoutAt: now + (5 * 60 * 1000), // 5 minutes from now
      // }),
    });

    console.log(`Completed leg ${legIndex + 1} of journey ${journeyId}${isJourneyComplete ? ' - Journey complete!' : ''}`);

    // Return information about next leg if journey continues
    if (!isJourneyComplete && legIndex + 1 < journey.totalLegs) {
      const nextLeg = journey.legs[legIndex + 1];
      console.log(`Journey continues - returning next leg info:`, {
        journeyComplete: false,
        nextLegIndex: legIndex + 1,
        nextLegRouteName: nextLeg.routeName
      });
      return {
        success: true,
        journeyComplete: false,
        nextLeg: {
          ...nextLeg,
          legIndex: legIndex + 1,
        },
        // REMOVED: transferTimeoutAt - manual flow doesn't use timeouts
      };
    }

    console.log(`Journey complete - returning completion result:`, {
      journeyComplete: true,
      totalActualCost,
      journeyId
    });
    return {
      success: true,
      journeyComplete: true,
      totalActualCost,
    };
  },
});

/**
 * Cancel a journey (passenger cancellation)
 */
export const cancelJourney = mutation({
  args: {
    journeyId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, { journeyId, reason }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    const now = Date.now();
    const updatedLegs = journey.legs.map(leg => {
      if (leg.status === "pending") {
        return { ...leg, status: "cancelled" as const };
      }
      return leg;
    });

    await ctx.db.patch(journey._id, {
      status: "cancelled",
      legs: updatedLegs,
      updatedAt: now,
    });

    console.log(`Cancelled journey ${journeyId}${reason ? `: ${reason}` : ''}`);

    return { success: true };
  },
});

/**
 * Handle transfer timeout (5-minute window expired)
 */
export const handleTransferTimeout = mutation({
  args: {
    journeyId: v.string(),
  },
  handler: async (ctx: MutationCtx, { journeyId }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    const now = Date.now();

    await ctx.db.patch(journey._id, {
      status: "timeout",
      transferWindowExpiredAt: now,
      updatedAt: now,
    });

    console.log(`Journey ${journeyId} timed out during transfer`);

    return { success: true };
  },
});

/**
 * Get current journey state
 */
export const getJourneyState = query({
  args: {
    journeyId: v.string(),
  },
  handler: async (ctx: QueryCtx, { journeyId }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      return null;
    }

    return journey;
  },
});

/**
 * Get active journey for a passenger
 */
export const getActiveJourneyForPassenger = query({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx: QueryCtx, { passengerId }) => {
    const activeJourney = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_passenger_and_status", (q) =>
        q.eq("passengerId", passengerId).eq("status", "in_progress")
      )
      .first();

    if (activeJourney) {
      return activeJourney;
    }

    // Also check for planned journeys
    const plannedJourney = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_passenger_and_status", (q) =>
        q.eq("passengerId", passengerId).eq("status", "planned")
      )
      .first();

    return plannedJourney;
  },
});

/**
 * Clean up expired transfer timeouts - DISABLED for manual multi-leg flow
 */
export const cleanupExpiredTransfers = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    // DISABLED: Transfer window timeouts are not used in the new manual flow
    // Passengers now control their own journey progression with "Continue to Next Leg" button
    console.log(`SKIP: Transfer window cleanup disabled for manual multi-leg flow`);
    
    // Note: With the new manual flow:
    // - No automatic timeouts during transfers
    // - Passengers manually choose when to continue to next leg
    // - Journey state remains stable until user action
    
    return { cleanedCount: 0, disabled: true, reason: "Manual multi-leg flow active" };
  },
});