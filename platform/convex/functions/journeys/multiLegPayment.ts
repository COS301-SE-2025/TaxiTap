import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";
import {
  processLegPaymentHandler,
  checkCanProgressToNextLegHandler,
  validateLegStartRequirementsHandler,
  getJourneyPaymentSummaryHandler,
  checkJourneyPaymentCompleteHandler,
  getLegPaymentStatusHandler,
} from "./multiLegPaymentHandler";

/**
 * Process payment for a specific leg of a multi-leg journey
 */
export const processLegPayment = mutation({
  args: {
    rideId: v.string(),
    journeyId: v.string(),
    legIndex: v.number(),
    amountPaid: v.number(),
    isPaid: v.boolean(),
    paymentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return processLegPaymentHandler(ctx, args);
  },
});

/**
 * Check if current leg payment is complete and next leg can start
 */
export const checkCanProgressToNextLeg = query({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return checkCanProgressToNextLegHandler(ctx, args.journeyId, args.currentLegIndex);
  },
});

/**
 * Validate that all previous legs are paid before starting a new leg
 */
export const validateLegStartRequirements = query({
  args: {
    journeyId: v.string(),
    legIndexToStart: v.number(),
  },
  handler: async (ctx, args) => {
    return validateLegStartRequirementsHandler(ctx, args.journeyId, args.legIndexToStart);
  },
});

/**
 * Get payment summary for an entire multi-leg journey
 */
export const getJourneyPaymentSummary = query({
  args: {
    journeyId: v.string(),
  },
  handler: async (ctx, args) => {
    return getJourneyPaymentSummaryHandler(ctx, args.journeyId);
  },
});

/**
 * Check if entire journey payment is complete
 */
export const checkJourneyPaymentComplete = query({
  args: {
    journeyId: v.string(),
  },
  handler: async (ctx, args) => {
    return checkJourneyPaymentCompleteHandler(ctx, args.journeyId);
  },
});

/**
 * Get payment status for a specific leg
 */
export const getLegPaymentStatus = query({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return getLegPaymentStatusHandler(ctx, args.journeyId, args.legIndex);
  },
});