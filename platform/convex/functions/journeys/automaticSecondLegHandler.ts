import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * Automatically trigger second leg taxi search when passenger approaches transfer point
 */
export const triggerSecondLegTaxiSearch = mutation({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
    passengerLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    transferPoint: v.object({
      latitude: v.number(),
      longitude: v.number()
    })
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    nextLegRequested?: boolean;
    nextLegInfo?: any;
    error?: string;
  }> => {
    try {
      console.log(`🔄 Triggering second leg taxi search for journey ${args.journeyId}`, {
        currentLegIndex: args.currentLegIndex,
        passengerLocation: args.passengerLocation,
        transferPoint: args.transferPoint
      });

      // Get the journey record
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .unique();

      if (!journey) {
        return {
          success: false,
          error: "Journey not found"
        };
      }

      // Check if this is the last leg
      if (args.currentLegIndex >= journey.totalLegs - 1) {
        return {
          success: true,
          nextLegRequested: false,
          error: "This is the final leg of the journey"
        };
      }

      // Get the next leg
      const nextLegIndex = args.currentLegIndex + 1;
      const nextLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", nextLegIndex)
        )
        .unique();

      if (!nextLeg) {
        return {
          success: false,
          error: "Next leg not found"
        };
      }

      // Check if next leg taxi request is already in progress
      if (nextLeg.status === "requesting" || nextLeg.status === "active") {
        return {
          success: true,
          nextLegRequested: true,
          nextLegInfo: {
            legIndex: nextLeg.legIndex,
            fromAddress: nextLeg.fromAddress,
            toAddress: nextLeg.toAddress,
            status: nextLeg.status
          }
        };
      }

      // Update next leg status to requesting
      await ctx.db.patch(nextLeg._id, {
        status: "requesting",
        requestedAt: Date.now(),
        transferWindowStart: Date.now(),
        transferWindowEnd: Date.now() + (15 * 60 * 1000) // 15-minute window
      });

      // Find available drivers for the next leg
      const driverSearchResult = await ctx.runQuery(
        api.functions.routes.enhancedTaxiMatching.findAvailableDriversForLeg,
        {
          legIndex: nextLegIndex,
          journeyId: args.journeyId,
          originLat: args.transferPoint.latitude,
          originLng: args.transferPoint.longitude,
          destinationLat: nextLeg.toCoordinates.latitude,
          destinationLng: nextLeg.toCoordinates.longitude,
          routeId: nextLeg.routeId,
          maxOriginDistance: 2.0,
          maxTaxiDistance: 3.0,
          maxResults: 10
        }
      );

      if (driverSearchResult.success && driverSearchResult.availableTaxis.length > 0) {
        // Update next leg with available drivers
        await ctx.db.patch(nextLeg._id, {
          status: "drivers_available",
          availableDrivers: driverSearchResult.availableTaxis,
          driverSearchCompletedAt: Date.now()
        });

        console.log(`✅ Found ${driverSearchResult.availableTaxis.length} drivers for leg ${nextLegIndex}`);

        return {
          success: true,
          nextLegRequested: true,
          nextLegInfo: {
            legIndex: nextLeg.legIndex,
            fromAddress: nextLeg.fromAddress,
            toAddress: nextLeg.toAddress,
            fromCoordinates: nextLeg.fromCoordinates,
            toCoordinates: nextLeg.toCoordinates,
            routeId: nextLeg.routeId,
            estimatedFare: nextLeg.estimatedFare,
            availableDrivers: driverSearchResult.availableTaxis.length,
            status: "drivers_available"
          }
        };
      } else {
        // No drivers found, but request is still active
        await ctx.db.patch(nextLeg._id, {
          status: "no_drivers_found",
          driverSearchCompletedAt: Date.now()
        });

        return {
          success: true,
          nextLegRequested: true,
          nextLegInfo: {
            legIndex: nextLeg.legIndex,
            fromAddress: nextLeg.fromAddress,
            toAddress: nextLeg.toAddress,
            status: "no_drivers_found"
          }
        };
      }

    } catch (error) {
      console.error("❌ Error triggering second leg taxi search:", error);
      return {
        success: false,
        error: `Failed to trigger second leg search: ${error}`
      };
    }
  }
});

/**
 * Get the status of the next leg for a multi-leg journey
 */
export const getNextLegStatus = query({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number()
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    nextLegInfo?: any;
    error?: string;
  }> => {
    try {
      // Check if this is the last leg
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .unique();

      if (!journey) {
        return {
          success: false,
          error: "Journey not found"
        };
      }

      if (args.currentLegIndex >= journey.totalLegs - 1) {
        return {
          success: true,
          nextLegInfo: null // No next leg
        };
      }

      // Get the next leg
      const nextLegIndex = args.currentLegIndex + 1;
      const nextLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", nextLegIndex)
        )
        .unique();

      if (!nextLeg) {
        return {
          success: false,
          error: "Next leg not found"
        };
      }

      return {
        success: true,
        nextLegInfo: {
          legIndex: nextLeg.legIndex,
          fromAddress: nextLeg.fromAddress,
          toAddress: nextLeg.toAddress,
          fromCoordinates: nextLeg.fromCoordinates,
          toCoordinates: nextLeg.toCoordinates,
          routeId: nextLeg.routeId,
          estimatedFare: nextLeg.estimatedFare,
          status: nextLeg.status,
          availableDrivers: nextLeg.availableDrivers || 0,
          transferWindowStart: nextLeg.transferWindowStart,
          transferWindowEnd: nextLeg.transferWindowEnd
        }
      };

    } catch (error) {
      console.error("❌ Error getting next leg status:", error);
      return {
        success: false,
        error: `Failed to get next leg status: ${error}`
      };
    }
  }
});

/**
 * Automatically progress to second leg when passenger reaches transfer point
 */
export const autoProgressToSecondLeg = mutation({
  args: {
    journeyId: v.string(),
    completedLegIndex: v.number(),
    passengerLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    actualFare: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    nextLegInfo?: any;
    shouldNavigateToTaxiInfo?: boolean;
    error?: string;
  }> => {
    try {
      console.log(`🔄 Auto-progressing to second leg for journey ${args.journeyId}`, {
        completedLegIndex: args.completedLegIndex,
        passengerLocation: args.passengerLocation
      });

      // First, process the payment for the completed leg
      const paymentResult = await ctx.runMutation(
        api.functions.journeys.multiLegPaymentHandler.processLegPayment,
        {
          rideId: `leg_${args.journeyId}_${args.completedLegIndex}`, // This would be the actual ride ID
          journeyId: args.journeyId,
          legIndex: args.completedLegIndex,
          amountPaid: args.actualFare || 0,
          isPaid: true,
          paymentNotes: "Automatic payment processing for leg completion"
        }
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: "Failed to process leg payment"
        };
      }

      // Progress the journey to the next leg
      const progressResult = await ctx.runMutation(
        api.functions.journeys.journeyManagement.progressJourneyToNextLeg,
        {
          journeyId: args.journeyId,
          completedLegIndex: args.completedLegIndex,
          passengerLocation: args.passengerLocation,
          actualFare: args.actualFare
        }
      );

      if (!progressResult.success) {
        return {
          success: false,
          error: progressResult.error || "Failed to progress journey"
        };
      }

      // If journey is completed, return success without next leg info
      if (progressResult.journeyCompleted) {
        return {
          success: true,
          nextLegInfo: null
        };
      }

      // Get the next leg information
      const nextLegStatus = await ctx.runQuery(
        api.functions.journeys.automaticSecondLegHandler.getNextLegStatus,
        {
          journeyId: args.journeyId,
          currentLegIndex: args.completedLegIndex
        }
      );

      if (!nextLegStatus.success) {
        return {
          success: false,
          error: nextLegStatus.error || "Failed to get next leg status"
        };
      }

      return {
        success: true,
        nextLegInfo: nextLegStatus.nextLegInfo,
        shouldNavigateToTaxiInfo: nextLegStatus.nextLegInfo?.status === "drivers_available"
      };

    } catch (error) {
      console.error("❌ Error auto-progressing to second leg:", error);
      return {
        success: false,
        error: `Failed to auto-progress: ${error}`
      };
    }
  }
});

/**
 * Get transfer point walking instructions
 */
export const getTransferPointInstructions = query({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
    passengerLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    })
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    instructions?: any;
    error?: string;
  }> => {
    try {
      // Get the current leg to find the transfer point
      const currentLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.currentLegIndex)
        )
        .unique();

      if (!currentLeg) {
        return {
          success: false,
          error: "Current leg not found"
        };
      }

      // Calculate distance to transfer point
      const transferPoint = currentLeg.toCoordinates;
      const distance = calculateDistance(
        args.passengerLocation.latitude,
        args.passengerLocation.longitude,
        transferPoint.latitude,
        transferPoint.longitude
      );

      // Generate walking instructions
      const instructions = {
        transferPoint: {
          address: currentLeg.toAddress,
          coordinates: transferPoint
        },
        walkingDistance: Math.round(distance * 1000), // in meters
        estimatedWalkingTime: Math.round((distance * 1000) / 1.4), // 1.4 m/s average walking speed
        instructions: [
          "Walk to the transfer point",
          "Look for your next taxi",
          "Show your journey ID to the driver",
          "Board the taxi for the next leg"
        ],
        status: distance < 0.1 ? "arrived" : distance < 0.5 ? "approaching" : "walking"
      };

      return {
        success: true,
        instructions
      };

    } catch (error) {
      console.error("❌ Error getting transfer point instructions:", error);
      return {
        success: false,
        error: `Failed to get instructions: ${error}`
      };
    }
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}
