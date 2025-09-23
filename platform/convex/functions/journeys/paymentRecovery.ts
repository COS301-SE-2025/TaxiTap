import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";
import {
  handlePaymentRecoveryHandler,
  getPaymentRecoveryOptionsHandler,
  logPaymentFailureHandler,
  emergencyJourneyContinuationHandler,
} from "./paymentRecoveryHandler";

/**
 * Handle payment recovery scenarios
 */
export const handlePaymentRecovery = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    recoveryAction: v.union(
      v.literal("retry"),
      v.literal("skip"),
      v.literal("cancel_journey"),
      v.literal("manual_override")
    ),
  },
  handler: async (ctx, args) => {
    return handlePaymentRecoveryHandler(ctx, args.journeyId, args.legIndex, args.recoveryAction);
  },
});

/**
 * Get available recovery options for a failed payment
 */
export const getPaymentRecoveryOptions = query({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return getPaymentRecoveryOptionsHandler(ctx, args.journeyId, args.legIndex);
  },
});

/**
 * Log payment failure for monitoring
 */
export const logPaymentFailure = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    rideId: v.string(),
    errorDetails: v.object({
      errorType: v.union(
        v.literal("network"),
        v.literal("validation"),
        v.literal("server"),
        v.literal("user_cancelled"),
        v.literal("other")
      ),
      errorMessage: v.string(),
      attemptNumber: v.number(),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return logPaymentFailureHandler(
      ctx,
      args.journeyId,
      args.legIndex,
      args.rideId,
      args.errorDetails
    );
  },
});

/**
 * Emergency journey continuation (for support use)
 */
export const emergencyJourneyContinuation = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    supportTicketId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    return emergencyJourneyContinuationHandler(
      ctx,
      args.journeyId,
      args.legIndex,
      args.supportTicketId,
      args.reason
    );
  },
});