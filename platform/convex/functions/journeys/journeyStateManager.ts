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

    console.log(`🚀 Created multi-leg journey: ${journeyOption.journeyId}`);

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

    console.log(`🚗 Started leg ${legIndex + 1} of journey ${journeyId}`);

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

    const isLastLeg = legIndex === journey.totalLegs - 1;
    const isJourneyComplete = isLastLeg;

    await ctx.db.patch(journey._id, {
      legs: updatedLegs,
      totalActualCost,
      updatedAt: now,
      ...(isJourneyComplete && {
        status: "completed",
        completedAt: now,
      }),
      ...(isLastLeg && legIndex < journey.totalLegs - 1 && {
        // Set up transfer window for next leg
        transferTimeoutAt: now + (5 * 60 * 1000), // 5 minutes from now
      }),
    });

    console.log(`✅ Completed leg ${legIndex + 1} of journey ${journeyId}${isJourneyComplete ? ' - Journey complete!' : ''}`);

    // Return information about next leg if journey continues
    if (!isJourneyComplete && legIndex + 1 < journey.totalLegs) {
      const nextLeg = journey.legs[legIndex + 1];
      return {
        success: true,
        journeyComplete: false,
        nextLeg: {
          legIndex: legIndex + 1,
          ...nextLeg,
        },
        transferTimeoutAt: now + (5 * 60 * 1000),
      };
    }

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

    console.log(`❌ Cancelled journey ${journeyId}${reason ? `: ${reason}` : ''}`);

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

    console.log(`⏰ Journey ${journeyId} timed out during transfer`);

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
 * Clean up expired transfer timeouts
 */
export const cleanupExpiredTransfers = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const now = Date.now();

    const expiredJourneys = await ctx.db
      .query("multiLegJourneys")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "in_progress"),
          q.neq(q.field("transferTimeoutAt"), undefined),
          q.lt(q.field("transferTimeoutAt"), now)
        )
      )
      .collect();

    let cleanedCount = 0;

    for (const journey of expiredJourneys) {
      if (journey.transferTimeoutAt && journey.transferTimeoutAt < now) {
        await ctx.db.patch(journey._id, {
          status: "timeout",
          transferWindowExpiredAt: now,
          updatedAt: now,
        });
        cleanedCount++;
      }
    }

    console.log(`🧹 Cleaned up ${cleanedCount} expired transfer windows`);

    return { cleanedCount };
  },
});