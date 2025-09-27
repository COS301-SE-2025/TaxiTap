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

          // Check if driver reached transfer point and ride is active
          if (ride.status === "in_progress" || ride.status === "accepted") {
            console.log(`🎯 Driver reached transfer point for ride ${alert.rideId}`);

            // Check if passenger has already paid
            if (ride.tripPaid) {
              console.log(`💰 Payment confirmed, auto-completing leg`);

              // Auto-complete the ride since payment is done
              await ctx.runMutation(internal.functions.rides.endRide.internalEndRide, {
                rideId: ride.rideId,
                userId: alert.passengerId,
              });

              // Trigger transfer point completion
              await ctx.runMutation(
                internal.functions.journeys.transferProximityMonitor.triggerTransferPointArrival,
                {
                  journeyId: alert.journeyId,
                  currentLegIndex: alert.currentLegIndex,
                  actualCost: ride.finalFare || ride.estimatedFare || 0,
                }
              );
            } else {
              console.log(`💳 Payment required - passenger must complete payment first`);

              // Note: Passenger will see the transfer point reached on their screen
              // They need to complete payment in SubmitFeedback before leg can be completed
              // The ride remains "in_progress" until payment is done
            }

            alertsProcessed++;
          } else {
            console.log(`⏳ Ride ${alert.rideId} status: ${ride.status}, waiting for payment completion`);
          }
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