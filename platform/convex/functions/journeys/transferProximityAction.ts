import { action, internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { v } from "convex/values";

/**
 * Cron action to monitor transfer point proximity for multi-leg journeys
 */
export const monitorTransferProximity = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    try {
      // Get proximity alerts for transfer points
      const proximityAlerts = await ctx.runQuery(
        internal.functions.journeys.transferProximityMonitor.checkTransferPointProximity,
        { limit }
      );

      if (proximityAlerts.length === 0) {
        console.log("🔍 No transfer point proximity alerts");
        return { alertsProcessed: 0 };
      }

      console.log(`🚨 Processing ${proximityAlerts.length} transfer proximity alerts`);

      let alertsProcessed = 0;

      for (const alert of proximityAlerts) {
        try {
          // Get ride details using internal query
          const ride = await ctx.runQuery(internal.functions.rides.getRideById.getRideByDocId, {
            rideDocId: alert.rideId,
          });

          if (!ride) {
            console.log(`⚠️ Ride ${alert.rideId} not found, skipping transfer alert`);
            continue;
          }

          // DISABLED: Automatic transfer logic removed for new manual flow
          // Passengers now manually choose "End Ride" or "Continue to Next Leg"
          console.log(`🛑 SKIP: Automatic transfer disabled for manual multi-leg flow (ride ${alert.rideId})`);
          
          // Note: With the new flow, passengers control when to end each leg
          // - "End Ride" button ends the journey completely 
          // - "Continue to Next Leg" button handles payment → feedback → next leg setup
        } catch (error) {
          console.error(`❌ Error processing transfer alert for journey ${alert.journeyId}:`, error);
        }
      }

      console.log(`✅ Processed ${alertsProcessed} transfer proximity alerts`);

      return { alertsProcessed };
    } catch (error) {
      console.error("❌ Error in transfer proximity monitoring:", error);
      return {
        alertsProcessed: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});