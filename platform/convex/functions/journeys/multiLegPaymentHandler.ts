import { Id } from "../../_generated/dataModel";

/**
 * Process payment for a specific leg of a multi-leg journey
 * Each leg is independent with its own driver and cash payment
 */
export const processLegPaymentHandler = async (
  ctx: any,
  args: {
    rideId: string;
    journeyId: string;
    legIndex: number;
    amountPaid: number;
    isPaid: boolean;
    paymentNotes?: string;
  }
) => {
  const { rideId, journeyId, legIndex, amountPaid, isPaid, paymentNotes } = args;

  // Find the ride record
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }

  // Verify this is a multi-leg ride
  if (!ride.isMultiLegRide || ride.parentJourneyId !== journeyId) {
    throw new Error("Ride is not part of the specified multi-leg journey");
  }

  // Find the journey leg record
  const journeyLeg = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_and_leg", (q: any) =>
      q.eq("journeyId", journeyId).eq("legIndex", legIndex)
    )
    .first();

  if (!journeyLeg) {
    throw new Error("Journey leg not found");
  }

  // Calculate payment details for this leg only
  const fare = ride.finalFare ?? ride.estimatedFare ?? 0;
  let paymentType: "exact" | "overpaid" | "underpaid" | "not_paid" = "not_paid";
  let changeDue = 0;
  let amountOwed = 0;

  if (!isPaid) {
    paymentType = "not_paid";
  } else if (amountPaid === fare) {
    paymentType = "exact";
  } else if (amountPaid > fare) {
    paymentType = "overpaid";
    changeDue = amountPaid - fare;
  } else {
    paymentType = "underpaid";
    amountOwed = fare - amountPaid;
  }

  // Update ride record with payment details
  await ctx.db.patch(ride._id, {
    tripPaid: isPaid,
    amountPaid: isPaid ? amountPaid : 0,
    changeDue,
    amountOwed,
    paymentType,
    changeReceived: changeDue === 0,
    paymentConfirmedAt: isPaid ? Date.now() : undefined,

    // Multi-leg specific fields
    legPaymentStatus: isPaid ? "completed" : "pending",
    legPaymentMethod: "cash", // Always cash for multi-leg
    isPartialJourneyPayment: true,

    updatedAt: Date.now(),
  });

  // Update journey leg payment status
  await ctx.db.patch(journeyLeg._id, {
    paymentStatus: isPaid ? "completed" : "pending",
    paymentConfirmedAt: isPaid ? Date.now() : undefined,
    paymentAmount: isPaid ? amountPaid : 0,
    paymentMethod: "cash",
    paymentNotes: paymentNotes || null,
  });

  // If payment is completed, check if we can progress to next leg
  let canProgressToNextLeg = false;
  if (isPaid) {
    const result = await checkCanProgressToNextLegHandler(ctx, journeyId, legIndex);
    canProgressToNextLeg = result.canProgress;
  }

  return {
    success: true,
    legIndex,
    paymentType,
    changeDue,
    amountOwed,
    canProgressToNextLeg,
    message: isPaid ?
      `Leg ${legIndex + 1} payment confirmed - ${paymentType}` :
      `Leg ${legIndex + 1} payment required before continuing`,
  };
};

/**
 * Check if payment is complete for current leg and next leg can start
 */
export const checkCanProgressToNextLegHandler = async (
  ctx: any,
  journeyId: string,
  currentLegIndex: number
) => {
  // Get the current journey leg
  const currentLeg = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_and_leg", (q: any) =>
      q.eq("journeyId", journeyId).eq("legIndex", currentLegIndex)
    )
    .first();

  if (!currentLeg) {
    throw new Error("Current journey leg not found");
  }

  // Check if current leg payment is completed
  const isCurrentLegPaid = currentLeg.paymentStatus === "completed";

  if (!isCurrentLegPaid) {
    return {
      canProgress: false,
      reason: `Payment required for leg ${currentLegIndex + 1}`,
      currentLegStatus: currentLeg.paymentStatus,
    };
  }

  // Get total legs to check if there's a next leg
  const allLegs = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .collect();

  const nextLegIndex = currentLegIndex + 1;
  const hasNextLeg = nextLegIndex < allLegs.length;

  if (!hasNextLeg) {
    // This was the final leg - check if journey is complete
    await checkJourneyPaymentCompleteHandler(ctx, journeyId);
    return {
      canProgress: false,
      reason: "Journey completed - no more legs",
      isJourneyComplete: true,
    };
  }

  return {
    canProgress: true,
    nextLegIndex,
    reason: `Ready to start leg ${nextLegIndex + 1}`,
  };
};

/**
 * Validate that all previous legs are paid before starting a new leg
 */
export const validateLegStartRequirementsHandler = async (
  ctx: any,
  journeyId: string,
  legIndexToStart: number
) => {
  // If starting leg 0, no previous payments required
  if (legIndexToStart === 0) {
    return { canStart: true, reason: "First leg - no payment requirements" };
  }

  // Check all previous legs are paid
  const previousLegs = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .filter((q: any) => q.lt(q.field("legIndex"), legIndexToStart))
    .collect();

  const unpaidLegs = previousLegs.filter((leg: any) => leg.paymentStatus !== "completed");

  if (unpaidLegs.length > 0) {
    const unpaidLegNumbers = unpaidLegs.map((leg: any) => leg.legIndex + 1).join(", ");
    return {
      canStart: false,
      reason: `Payment required for previous leg(s): ${unpaidLegNumbers}`,
      unpaidLegs: unpaidLegs.map((leg: any) => ({
        legIndex: leg.legIndex,
        fromAddress: leg.fromAddress,
        toAddress: leg.toAddress,
        estimatedFare: leg.estimatedFare,
      })),
    };
  }

  return {
    canStart: true,
    reason: `All previous legs paid - can start leg ${legIndexToStart + 1}`,
  };
};

/**
 * Get payment summary for an entire multi-leg journey
 */
export const getJourneyPaymentSummaryHandler = async (
  ctx: any,
  journeyId: string
) => {
  // Get the journey record
  const journey = await ctx.db
    .query("multiLegJourneys")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .first();

  if (!journey) {
    throw new Error("Journey not found");
  }

  // Get all journey legs
  const journeyLegs = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .collect();

  let totalEstimatedFare = 0;
  let totalActualPaid = 0;
  const legSummaries = [];

  for (const leg of journeyLegs) {
    totalEstimatedFare += leg.estimatedFare;

    let legSummary = {
      legIndex: leg.legIndex,
      fromAddress: leg.fromAddress,
      toAddress: leg.toAddress,
      estimatedFare: leg.estimatedFare,
      actualFare: leg.actualFare || leg.estimatedFare,
      amountPaid: leg.paymentAmount || 0,
      paymentStatus: leg.paymentStatus || "pending",
      paymentConfirmedAt: leg.paymentConfirmedAt,
      rideId: leg.rideId,
      isPaymentRequired: true, // Always required
    };

    if (leg.rideId) {
      // Get the associated ride for more detailed payment info
      const ride = await ctx.db.get(leg.rideId);
      if (ride) {
        legSummary.actualFare = ride.finalFare || ride.estimatedFare || leg.estimatedFare;
        legSummary.amountPaid = ride.amountPaid || 0;
        totalActualPaid += ride.amountPaid || 0;
      }
    } else {
      totalActualPaid += leg.paymentAmount || 0;
    }

    legSummaries.push(legSummary);
  }

  const completedPayments = legSummaries.filter(leg => leg.paymentStatus === "completed");
  const pendingPayments = legSummaries.filter(leg => leg.paymentStatus === "pending");

  return {
    journeyId,
    totalLegs: journeyLegs.length,
    completedLegs: completedPayments.length,
    pendingLegs: pendingPayments.length,
    totalEstimatedFare,
    totalActualPaid,
    overallStatus: pendingPayments.length === 0 ? "completed" : "pending",
    legSummaries,
    journey: {
      originAddress: journey.originAddress,
      destinationAddress: journey.destinationAddress,
      status: journey.status,
      createdAt: journey.createdAt,
      completedAt: journey.completedAt,
    },
  };
};

/**
 * Check if entire journey payment is complete
 */
export const checkJourneyPaymentCompleteHandler = async (
  ctx: any,
  journeyId: string
) => {
  // Get all journey legs
  const journeyLegs = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .collect();

  const completedPayments = journeyLegs.filter((leg: any) => leg.paymentStatus === "completed");
  const isComplete = completedPayments.length === journeyLegs.length;

  // If all payments are complete, update the journey status
  if (isComplete) {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
      .first();

    if (journey && journey.status === "active") {
      await ctx.db.patch(journey._id, {
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  return {
    isComplete,
    totalLegs: journeyLegs.length,
    completedLegs: completedPayments.length,
    pendingLegs: journeyLegs.length - completedPayments.length,
  };
};

/**
 * Get payment status for a specific leg
 */
export const getLegPaymentStatusHandler = async (
  ctx: any,
  journeyId: string,
  legIndex: number
) => {
  const journeyLeg = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_and_leg", (q: any) =>
      q.eq("journeyId", journeyId).eq("legIndex", legIndex)
    )
    .first();

  if (!journeyLeg) {
    throw new Error("Journey leg not found");
  }

  let rideDetails = null;
  if (journeyLeg.rideId) {
    const ride = await ctx.db.get(journeyLeg.rideId);
    if (ride) {
      rideDetails = {
        rideId: ride.rideId,
        fare: ride.finalFare || ride.estimatedFare,
        amountPaid: ride.amountPaid || 0,
        paymentType: ride.paymentType || "not_paid",
        tripPaid: ride.tripPaid,
        changeDue: ride.changeDue || 0,
        amountOwed: ride.amountOwed || 0,
      };
    }
  }

  return {
    legIndex,
    fromAddress: journeyLeg.fromAddress,
    toAddress: journeyLeg.toAddress,
    estimatedFare: journeyLeg.estimatedFare,
    paymentStatus: journeyLeg.paymentStatus || "pending",
    paymentAmount: journeyLeg.paymentAmount || 0,
    paymentConfirmedAt: journeyLeg.paymentConfirmedAt,
    paymentNotes: journeyLeg.paymentNotes,
    rideDetails,
    isPaymentRequired: true, // Always required
  };
};