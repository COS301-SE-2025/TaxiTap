import { Id } from "../../_generated/dataModel";

/**
 * Handle payment recovery scenarios for multi-leg journeys
 */
export const handlePaymentRecoveryHandler = async (
  ctx: any,
  journeyId: string,
  legIndex: number,
  recoveryAction: "retry" | "skip" | "cancel_journey" | "manual_override"
) => {
  // Get the journey leg
  const journeyLeg = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_and_leg", (q: any) =>
      q.eq("journeyId", journeyId).eq("legIndex", legIndex)
    )
    .first();

  if (!journeyLeg) {
    throw new Error("Journey leg not found");
  }

  // Get the journey record
  const journey = await ctx.db
    .query("multiLegJourneys")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .first();

  if (!journey) {
    throw new Error("Journey not found");
  }

  switch (recoveryAction) {
    case "retry":
      // Reset payment status to allow retry
      await ctx.db.patch(journeyLeg._id, {
        paymentStatus: "pending",
        paymentNotes: "Payment retry initiated",
      });

      if (journeyLeg.rideId) {
        const ride = await ctx.db.get(journeyLeg.rideId);
        if (ride) {
          await ctx.db.patch(ride._id, {
            legPaymentStatus: "pending",
            updatedAt: Date.now(),
          });
        }
      }

      return {
        success: true,
        action: "retry",
        message: `Payment retry enabled for leg ${legIndex + 1}`,
        canRetry: true,
      };

    case "skip":
      // This should generally not be allowed based on business rules
      // But included for emergency scenarios with manual override
      throw new Error("Skipping payment is not allowed. Payment is required for all legs.");

    case "cancel_journey":
      // Cancel the entire journey
      await ctx.db.patch(journey._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });

      // Mark all remaining legs as cancelled
      const remainingLegs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
        .filter((q: any) => q.gte(q.field("legIndex"), legIndex))
        .collect();

      for (const leg of remainingLegs) {
        await ctx.db.patch(leg._id, {
          paymentStatus: "cancelled",
          paymentNotes: "Journey cancelled due to payment failure",
        });
      }

      return {
        success: true,
        action: "cancel_journey",
        message: "Journey cancelled due to payment issues",
        canRetry: false,
      };

    case "manual_override":
      // For admin/support use - mark as completed with notes
      await ctx.db.patch(journeyLeg._id, {
        paymentStatus: "completed",
        paymentMethod: "other",
        paymentNotes: "Manual override - payment resolved through support",
        paymentConfirmedAt: Date.now(),
      });

      if (journeyLeg.rideId) {
        const ride = await ctx.db.get(journeyLeg.rideId);
        if (ride) {
          await ctx.db.patch(ride._id, {
            legPaymentStatus: "completed",
            legPaymentMethod: "other",
            tripPaid: true,
            paymentConfirmedAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      return {
        success: true,
        action: "manual_override",
        message: `Payment manually resolved for leg ${legIndex + 1}`,
        canRetry: false,
      };

    default:
      throw new Error(`Unknown recovery action: ${recoveryAction}`);
  }
};

/**
 * Get available recovery options for a failed payment
 */
export const getPaymentRecoveryOptionsHandler = async (
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

  const journey = await ctx.db
    .query("multiLegJourneys")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
    .first();

  if (!journey) {
    throw new Error("Journey not found");
  }

  // Determine available options based on journey state
  const options = [];

  // Always allow retry
  options.push({
    action: "retry",
    label: "Try Payment Again",
    description: "Retry the payment for this leg",
    severity: "low",
  });

  // Allow journey cancellation
  options.push({
    action: "cancel_journey",
    label: "Cancel Journey",
    description: "Cancel the entire multi-leg journey",
    severity: "high",
  });

  // Contact support option (not an action, but guidance)
  options.push({
    action: "contact_support",
    label: "Contact Support",
    description: "Get help with payment issues",
    severity: "medium",
  });

  return {
    journeyId,
    legIndex,
    currentStatus: journeyLeg.paymentStatus,
    availableOptions: options,
    emergencyContact: {
      phone: "+27 xxx xxx xxxx", // Replace with actual support number
      email: "support@taxitap.co.za",
    },
  };
};

/**
 * Log payment failure for monitoring and analysis
 */
export const logPaymentFailureHandler = async (
  ctx: any,
  journeyId: string,
  legIndex: number,
  rideId: string,
  errorDetails: {
    errorType: "network" | "validation" | "server" | "user_cancelled" | "other";
    errorMessage: string;
    attemptNumber: number;
    timestamp: number;
  }
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

  // Update leg with failure details
  const failureNote = `Attempt ${errorDetails.attemptNumber}: ${errorDetails.errorType} - ${errorDetails.errorMessage}`;
  const existingNotes = journeyLeg.paymentNotes || "";
  const updatedNotes = existingNotes ? `${existingNotes}\n${failureNote}` : failureNote;

  await ctx.db.patch(journeyLeg._id, {
    paymentStatus: "failed",
    paymentNotes: updatedNotes,
  });

  // Update ride record if available
  if (rideId) {
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
      .first();

    if (ride) {
      await ctx.db.patch(ride._id, {
        legPaymentStatus: "failed",
        updatedAt: Date.now(),
      });
    }
  }

  return {
    success: true,
    message: "Payment failure logged",
    attemptNumber: errorDetails.attemptNumber,
    nextSteps: errorDetails.attemptNumber >= 3
      ? ["Contact support", "Cancel journey"]
      : ["Retry payment", "Contact support", "Cancel journey"],
  };
};

/**
 * Emergency journey continuation (for support use)
 */
export const emergencyJourneyContinuationHandler = async (
  ctx: any,
  journeyId: string,
  legIndex: number,
  supportTicketId: string,
  reason: string
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

  // Mark payment as completed with support override
  await ctx.db.patch(journeyLeg._id, {
    paymentStatus: "completed",
    paymentMethod: "other",
    paymentNotes: `EMERGENCY OVERRIDE - Support Ticket: ${supportTicketId} - Reason: ${reason}`,
    paymentConfirmedAt: Date.now(),
  });

  if (journeyLeg.rideId) {
    const ride = await ctx.db.get(journeyLeg.rideId);
    if (ride) {
      await ctx.db.patch(ride._id, {
        legPaymentStatus: "completed",
        legPaymentMethod: "other",
        tripPaid: true,
        paymentConfirmedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  return {
    success: true,
    message: `Emergency continuation approved for leg ${legIndex + 1}`,
    supportTicketId,
    timestamp: Date.now(),
  };
};