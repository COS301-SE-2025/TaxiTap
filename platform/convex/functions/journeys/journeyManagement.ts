/**
 * journeyManagement.ts
 *
 * Convex functions for managing multi-leg journey lifecycle operations.
 * Handles creation, progression, monitoring, and completion of multi-leg journeys.
 *
 * @author Git It Done
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// JOURNEY LIFECYCLE FUNCTIONS
// ============================================================================

/**
 * Handler function for creating a new multi-leg journey
 */
export async function createMultiLegJourneyHandler(ctx: any, args: any): Promise<any> {
    try {
      console.log('🚀 Creating multi-leg journey for passenger:', args.passengerId);

      // Generate unique journey ID
      const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentTime = Date.now();

      // Validate input data
      if (!args.journeyPlan.legs || args.journeyPlan.legs.length === 0) {
        throw new Error("Journey must have at least one leg");
      }

      // Validate passenger exists
      const passenger = await ctx.db.get(args.passengerId);
      if (!passenger) {
        throw new Error("Passenger not found");
      }

      // Create main journey record
      const journeyRecord = await ctx.db.insert("multiLegJourneys", {
        journeyId,
        passengerId: args.passengerId,
        status: "planning",
        totalLegs: args.journeyPlan.legs.length,
        currentLegIndex: 0,
        originAddress: args.journeyPlan.originAddress,
        destinationAddress: args.journeyPlan.destinationAddress,
        originCoordinates: args.journeyPlan.originCoordinates,
        destinationCoordinates: args.journeyPlan.destinationCoordinates,
        optimizationPreference: args.journeyPlan.optimizationPreference as "shortest_time" | "fewest_transfers" | "most_reliable",
        estimatedTotalFare: args.journeyPlan.estimatedTotalFare,
        estimatedTotalDuration: args.journeyPlan.estimatedTotalDuration,
        createdAt: currentTime,
        updatedAt: currentTime
      });

      // Create individual leg records
      const legRecords = [];
      for (const leg of args.journeyPlan.legs) {
        const legRecord = await ctx.db.insert("journeyLegs", {
          journeyId,
          legIndex: leg.legIndex,
          fromAddress: leg.fromAddress,
          toAddress: leg.toAddress,
          fromCoordinates: leg.fromCoordinates,
          toCoordinates: leg.toCoordinates,
          routeId: leg.routeId,
          status: leg.legIndex === 0 ? "pending" : "pending",
          estimatedFare: leg.estimatedFare,
          estimatedDuration: leg.estimatedDuration
        });
        legRecords.push(legRecord);
      }

      console.log(`✅ Created multi-leg journey ${journeyId} with ${legRecords.length} legs`);

      // Return complete journey information
      return {
        success: true,
        journeyId,
        journeyRecordId: journeyRecord,
        totalLegs: args.journeyPlan.legs.length,
        legRecords,
        message: `Multi-leg journey created successfully with ${args.journeyPlan.legs.length} legs`
      };

    } catch (error) {
      console.error("❌ Error creating multi-leg journey:", error);
      return {
        success: false,
        error: `Failed to create multi-leg journey: ${error}`,
        journeyId: null
      };
    }
}

/**
 * Creates a new multi-leg journey with all associated leg records
 */
export const createMultiLegJourney = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    journeyPlan: v.object({
      originAddress: v.string(),
      destinationAddress: v.string(),
      originCoordinates: v.object({
        latitude: v.number(),
        longitude: v.number()
      }),
      destinationCoordinates: v.object({
        latitude: v.number(),
        longitude: v.number()
      }),
      legs: v.array(v.object({
        legIndex: v.number(),
        fromAddress: v.string(),
        toAddress: v.string(),
        fromCoordinates: v.object({
          latitude: v.number(),
          longitude: v.number()
        }),
        toCoordinates: v.object({
          latitude: v.number(),
          longitude: v.number()
        }),
        routeId: v.optional(v.string()),
        estimatedDuration: v.number(),
        estimatedFare: v.number()
      })),
      optimizationPreference: v.string(),
      estimatedTotalFare: v.number(),
      estimatedTotalDuration: v.number()
    })
  },
  handler: createMultiLegJourneyHandler
});

/**
 * Progresses a journey to the next leg and triggers taxi request for the next segment
 */
export const progressJourneyToNextLeg = mutation({
  args: {
    journeyId: v.string(),
    completedLegIndex: v.number(),
    passengerLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    actualFare: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      console.log(`🔄 Progressing journey ${args.journeyId} from leg ${args.completedLegIndex} to next leg`);

      // Get journey record
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

      // Get the completed leg
      const completedLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.completedLegIndex)
        )
        .unique();

      if (!completedLeg) {
        return {
          success: false,
          error: "Completed leg not found"
        };
      }

      // Mark current leg as completed
      await ctx.db.patch(completedLeg._id, {
        status: "completed",
        actualFare: args.actualFare,
        completedAt: Date.now()
      });

      // Check if this was the last leg
      if (args.completedLegIndex >= journey.totalLegs - 1) {
        await ctx.db.patch(journey._id, {
          status: "completed",
          completedAt: Date.now(),
          updatedAt: Date.now()
        });

        console.log(`🎯 Journey ${args.journeyId} completed successfully`);
        return {
          success: true,
          journeyCompleted: true,
          message: "Journey completed successfully"
        };
      }

      // Get next leg
      const nextLegIndex = args.completedLegIndex + 1;
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

      // Update journey to next leg
      await ctx.db.patch(journey._id, {
        currentLegIndex: nextLegIndex,
        status: "active",
        updatedAt: Date.now()
      });

      // Mark next leg as requesting
      await ctx.db.patch(nextLeg._id, {
        status: "requesting",
        requestedAt: Date.now(),
        transferWindowStart: Date.now(),
        transferWindowEnd: Date.now() + (15 * 60 * 1000) // 15 minute window
      });

      console.log(`✅ Journey ${args.journeyId} progressed to leg ${nextLegIndex}`);

      // Trigger automatic taxi request for next leg
      const nextLegRequestResult: any = await requestNextLegTaxiHandler(ctx, {
        journeyId: args.journeyId,
        legIndex: nextLegIndex,
        transferLocation: args.passengerLocation,
        destinationLocation: nextLeg.toCoordinates
      });

      return {
        success: true,
        journeyCompleted: false,
        nextLegIndex,
        nextLegStatus: nextLeg.status,
        taxiRequestResult: nextLegRequestResult,
        message: `Progressed to leg ${nextLegIndex}, taxi request initiated`
      };

    } catch (error) {
      console.error("❌ Error progressing journey to next leg:", error);
      return {
        success: false,
        error: `Failed to progress journey: ${error}`
      };
    }
  }
});

/**
 * Requests a taxi for the next leg of a multi-leg journey
 */
export const requestNextLegTaxi = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    transferLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    destinationLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    expandedRadius: v.optional(v.number())
  },
  handler: requestNextLegTaxiHandler
});

/**
 * Handler function for requesting next leg taxi
 */
async function requestNextLegTaxiHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🚕 Requesting taxi for journey ${args.journeyId}, leg ${args.legIndex}`);

    // Get the leg record
    const leg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
      )
      .unique();

    if (!leg) {
      return {
        success: false,
        error: "Leg not found"
      };
    }

    // Use enhanced taxi matching with expanded search radius for transfers
    const searchRadius = args.expandedRadius || 1.5; // 1.5km radius for transfer locations

    const taxiSearchResult: any = await ctx.runQuery(internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney, {
      originLat: args.transferLocation.latitude,
      originLng: args.transferLocation.longitude,
      destinationLat: args.destinationLocation.latitude,
      destinationLng: args.destinationLocation.longitude,
      maxOriginDistance: 1.0,
      maxDestinationDistance: 1.0,
      maxTaxiDistance: searchRadius,
      maxResults: 5 // Fewer results for transfer legs
    });

    if (!taxiSearchResult.success || taxiSearchResult.availableTaxis.length === 0) {
      // Mark leg as failed and suggest alternatives
      await ctx.db.patch(leg._id, {
        status: "failed"
      });

      return {
        success: false,
        error: "No taxis available for next leg",
        suggestedActions: [
          "Expand search radius",
          "Wait for taxi availability",
          "Consider alternative transfer points"
        ],
        searchRadius
      };
    }

    // Update leg with taxi options
    await ctx.db.patch(leg._id, {
      status: "requesting"
    });

    console.log(`✅ Found ${taxiSearchResult.availableTaxis.length} taxis for leg ${args.legIndex}`);

    return {
      success: true,
      availableTaxis: taxiSearchResult.availableTaxis,
      matchingRoutes: taxiSearchResult.matchingRoutes,
      searchRadius,
      message: `Found ${taxiSearchResult.availableTaxis.length} available taxis for next leg`
    };

  } catch (error) {
    console.error("❌ Error requesting next leg taxi:", error);
    return {
      success: false,
      error: `Failed to request taxi for next leg: ${error}`
    };
  }
}

/**
 * Gets the current status and details of a multi-leg journey
 */
export const getJourneyStatus = query({
  args: {
    journeyId: v.string()
  },
  handler: async (ctx, args) => {
    try {
      // Get journey record
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

      // Get all legs for this journey
      const legs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .collect();

      // Sort legs by index
      legs.sort((a: any, b: any) => a.legIndex - b.legIndex);

      // Get any active rides associated with legs
      const activeRides = [];
      for (const leg of legs) {
        if (leg.rideId) {
          const ride = await ctx.db.get(leg.rideId);
          if (ride) {
            activeRides.push({
              legIndex: leg.legIndex,
              ride
            });
          }
        }
      }

      return {
        success: true,
        journey,
        legs,
        activeRides,
        progress: {
          currentLeg: journey.currentLegIndex,
          totalLegs: journey.totalLegs,
          percentComplete: Math.round((journey.currentLegIndex / journey.totalLegs) * 100),
          completedLegs: legs.filter(l => l.status === "completed").length
        }
      };

    } catch (error) {
      console.error("❌ Error getting journey status:", error);
      return {
        success: false,
        error: `Failed to get journey status: ${error}`
      };
    }
  }
});

/**
 * Associates a ride with a specific leg of a journey
 */
export const associateRideWithLeg = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    rideId: v.id("rides")
  },
  handler: async (ctx, args) => {
    try {
      // Get the leg record
      const leg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
        )
        .unique();

      if (!leg) {
        return {
          success: false,
          error: "Leg not found"
        };
      }

      // Update leg with ride association
      await ctx.db.patch(leg._id, {
        rideId: args.rideId,
        status: "active"
      });

      // Update ride with journey information
      await ctx.db.patch(args.rideId, {
        parentJourneyId: args.journeyId,
        legIndex: args.legIndex,
        isMultiLegRide: true
      });

      console.log(`🔗 Associated ride ${args.rideId} with journey ${args.journeyId}, leg ${args.legIndex}`);

      return {
        success: true,
        message: "Ride associated with journey leg successfully"
      };

    } catch (error) {
      console.error("❌ Error associating ride with leg:", error);
      return {
        success: false,
        error: `Failed to associate ride with leg: ${error}`
      };
    }
  }
});

/**
 * Cancels a multi-leg journey and any associated active rides
 */
export const cancelMultiLegJourney = mutation({
  args: {
    journeyId: v.string(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    try {
      console.log(`❌ Cancelling multi-leg journey ${args.journeyId}`);

      // Get journey record
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

      // Get all legs
      const legs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .collect();

      // Cancel active rides and update leg statuses
      const cancelledRides = [];
      for (const leg of legs) {
        if (leg.rideId && (leg.status === "active" || leg.status === "requesting")) {
          const ride = await ctx.db.get(leg.rideId);
          if (ride && (ride.status === "requested" || ride.status === "accepted" || ride.status === "in_progress")) {
            await ctx.db.patch(leg.rideId, {
              status: "cancelled"
            });
            cancelledRides.push(leg.rideId);
          }
        }

        // Update leg status if not completed
        if (leg.status !== "completed") {
          await ctx.db.patch(leg._id, {
            status: "failed"
          });
        }
      }

      // Update journey status
      await ctx.db.patch(journey._id, {
        status: "cancelled",
        updatedAt: Date.now()
      });

      console.log(`✅ Cancelled journey ${args.journeyId}, cancelled ${cancelledRides.length} active rides`);

      return {
        success: true,
        cancelledRides: cancelledRides.length,
        message: `Journey cancelled successfully. ${cancelledRides.length} active rides were cancelled.`
      };

    } catch (error) {
      console.error("❌ Error cancelling multi-leg journey:", error);
      return {
        success: false,
        error: `Failed to cancel journey: ${error}`
      };
    }
  }
});

/**
 * Gets all journeys for a specific passenger
 */
export const getPassengerJourneys = query({
  args: {
    passengerId: v.id("taxiTap_users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    try {
      let query = ctx.db
        .query("multiLegJourneys")
        .withIndex("by_passenger", (q: any) => q.eq("passengerId", args.passengerId));

      // Filter by status if provided
      if (args.status) {
        query = query.filter((q) => q.eq(q.field("status"), args.status));
      }

      // Apply limit and sort by creation date (newest first)
      let journeys = await query.collect();
      journeys.sort((a, b) => b.createdAt - a.createdAt);

      if (args.limit) {
        journeys = journeys.slice(0, args.limit);
      }

      // Get leg details for each journey
      const journeysWithLegs = [];
      for (const journey of journeys) {
        const legs = await ctx.db
          .query("journeyLegs")
          .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journey.journeyId))
          .collect();

        legs.sort((a: any, b: any) => a.legIndex - b.legIndex);

        journeysWithLegs.push({
          ...journey,
          legs
        });
      }

      return {
        success: true,
        journeys: journeysWithLegs,
        totalFound: journeysWithLegs.length
      };

    } catch (error) {
      console.error("❌ Error getting passenger journeys:", error);
      return {
        success: false,
        error: `Failed to get passenger journeys: ${error}`,
        journeys: []
      };
    }
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculates the total actual cost of a completed journey
 */
export const calculateJourneyTotalCost = query({
  args: {
    journeyId: v.string()
  },
  handler: async (ctx, args) => {
    try {
      const legs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .collect();

      let totalActualCost = 0;
      let totalEstimatedCost = 0;
      let completedLegs = 0;

      for (const leg of legs) {
        totalEstimatedCost += leg.estimatedFare;

        if (leg.status === "completed" && leg.actualFare) {
          totalActualCost += leg.actualFare;
          completedLegs++;
        }
      }

      return {
        success: true,
        totalEstimatedCost,
        totalActualCost,
        completedLegs,
        totalLegs: legs.length,
        costVariance: totalActualCost - totalEstimatedCost
      };

    } catch (error) {
      console.error("❌ Error calculating journey total cost:", error);
      return {
        success: false,
        error: `Failed to calculate journey cost: ${error}`
      };
    }
  }
});

/**
 * Updates the estimated arrival time for a journey leg based on real-time factors
 */
export const updateLegEstimatedArrival = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    newEstimatedDuration: v.number(),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    try {
      const leg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
        )
        .unique();

      if (!leg) {
        return {
          success: false,
          error: "Leg not found"
        };
      }

      await ctx.db.patch(leg._id, {
        estimatedDuration: args.newEstimatedDuration
      });

      console.log(`⏱️ Updated leg ${args.legIndex} estimated duration to ${args.newEstimatedDuration}s`);

      return {
        success: true,
        message: "Leg estimated arrival updated successfully"
      };

    } catch (error) {
      console.error("❌ Error updating leg estimated arrival:", error);
      return {
        success: false,
        error: `Failed to update leg estimated arrival: ${error}`
      };
    }
  }
});

// Handler function exports for testing
export async function progressJourneyToNextLegHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🔄 Progressing journey ${args.journeyId} from leg ${args.completedLegIndex} to next leg`);

    // Get journey record
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

    // Get the completed leg
    const completedLeg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.completedLegIndex)
      )
      .unique();

    if (!completedLeg) {
      return {
        success: false,
        error: "Completed leg not found"
      };
    }

    // Update completed leg with actual fare if provided
    if (args.actualFare !== undefined) {
      await ctx.db.patch(completedLeg._id, {
        actualFare: args.actualFare,
        status: "completed"
      });
    } else {
      await ctx.db.patch(completedLeg._id, {
        status: "completed"
      });
    }

    // Check if this was the last leg
    const allLegs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    const nextLegIndex = args.completedLegIndex + 1;
    const isLastLeg = nextLegIndex >= allLegs.length;

    if (isLastLeg) {
      // Journey completed
      await ctx.db.patch(journey._id, {
        status: "completed",
        actualEndTime: Date.now()
      });

      console.log(`🎯 Journey ${args.journeyId} completed successfully`);

      return {
        success: true,
        journeyCompleted: true,
        nextLegIndex: null,
        message: "Journey completed successfully"
      };
    }

    // Get next leg
    const nextLeg = allLegs.find((leg: any) => leg.legIndex === nextLegIndex);
    if (!nextLeg) {
      return {
        success: false,
        error: "Next leg not found"
      };
    }

    // Update journey status to active if not already
    if (journey.status !== "active") {
      await ctx.db.patch(journey._id, {
        status: "active",
        actualStartTime: Date.now()
      });
    }

    // Update next leg status
    await ctx.db.patch(nextLeg._id, {
      status: "active"
    });

    console.log(`✅ Journey ${args.journeyId} progressed to leg ${nextLegIndex}`);

    // Try to request taxi for next leg
    const taxiRequestResult = await requestNextLegTaxiHandler(ctx, {
      journeyId: args.journeyId,
      legIndex: nextLegIndex,
      transferLocation: args.passengerLocation,
      destinationLocation: nextLeg.toCoordinates
    });

    return {
      success: true,
      journeyCompleted: false,
      nextLegIndex,
      taxiRequestResult,
      message: `Journey progressed to leg ${nextLegIndex}`
    };

  } catch (error) {
    console.error("❌ Error progressing journey to next leg:", error);
    return {
      success: false,
      error: `Failed to progress journey: ${error}`
    };
  }
}

export async function getJourneyStatusHandler(ctx: any, args: any): Promise<any> {
  try {
    // Get journey record
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

    // Get all legs for this journey
    const legs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    // Sort legs by index
    legs.sort((a: any, b: any) => a.legIndex - b.legIndex);

    // Get any active rides associated with legs
    const activeRides = [];
    for (const leg of legs) {
      if (leg.rideId) {
        const ride = await ctx.db.get(leg.rideId);
        if (ride && ride.status !== "completed" && ride.status !== "cancelled") {
          activeRides.push({
            legIndex: leg.legIndex,
            rideId: leg.rideId,
            status: ride.status
          });
        }
      }
    }

    // Calculate progress
    const completedLegs = legs.filter((leg: any) => leg.status === "completed").length;
    const totalLegs = legs.length;
    const percentComplete = totalLegs > 0 ? Math.round((completedLegs / totalLegs) * 100) : 0;
    const currentLegIndex = legs.findIndex((leg: any) => leg.status === "active");

    return {
      success: true,
      journey,
      legs,
      activeRides,
      progress: {
        completedLegs,
        totalLegs,
        percentComplete,
        currentLeg: currentLegIndex >= 0 ? currentLegIndex : completedLegs
      }
    };

  } catch (error) {
    console.error("❌ Error getting journey status:", error);
    return {
      success: false,
      error: `Failed to get journey status: ${error}`
    };
  }
}

export async function associateRideWithLegHandler(ctx: any, args: any): Promise<any> {
  try {
    // Get the leg record
    const leg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
      )
      .unique();

    if (!leg) {
      return {
        success: false,
        error: "Leg not found"
      };
    }

    // Update leg with ride association
    await ctx.db.patch(leg._id, {
      rideId: args.rideId,
      status: "active"
    });

    // Update ride with journey information
    await ctx.db.patch(args.rideId, {
      parentJourneyId: args.journeyId,
      legIndex: args.legIndex,
      isMultiLegRide: true
    });

    console.log(`🔗 Associated ride ${args.rideId} with journey ${args.journeyId}, leg ${args.legIndex}`);

    return {
      success: true,
      message: "Ride associated with journey leg successfully"
    };

  } catch (error) {
    console.error("❌ Error associating ride with leg:", error);
    return {
      success: false,
      error: `Failed to associate ride with leg: ${error}`
    };
  }
}

export async function cancelMultiLegJourneyHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`❌ Cancelling multi-leg journey ${args.journeyId}`);

    // Get journey
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

    // Get all legs
    const legs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    // Cancel any active rides
    let cancelledRides = 0;
    for (const leg of legs) {
      if (leg.rideId) {
        const ride = await ctx.db.get(leg.rideId);
        if (ride && ride.status !== "completed" && ride.status !== "cancelled") {
          await ctx.db.patch(leg.rideId, {
            status: "cancelled",
            cancellationReason: args.reason || "Multi-leg journey cancelled"
          });
          cancelledRides++;
        }
      }

      // Update leg status
      if (leg.status !== "completed") {
        await ctx.db.patch(leg._id, {
          status: "cancelled"
        });
      }
    }

    // Update journey status
    await ctx.db.patch(journey._id, {
      status: "cancelled",
      cancellationReason: args.reason || "Journey cancelled by passenger",
      actualEndTime: Date.now()
    });

    console.log(`❌ Journey ${args.journeyId} cancelled. Cancelled ${cancelledRides} rides`);

    return {
      success: true,
      cancelledRides,
      message: "Journey cancelled successfully"
    };

  } catch (error) {
    console.error("❌ Error cancelling multi-leg journey:", error);
    return {
      success: false,
      error: `Failed to cancel journey: ${error}`
    };
  }
}

export async function getPassengerJourneysHandler(ctx: any, args: any): Promise<any> {
  try {
    // Get all journeys for the passenger first
    const allJourneys = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_passenger", (q: any) => q.eq("passengerId", args.passengerId))
      .collect();

    // Apply status filter manually if provided
    let journeys = allJourneys;
    if (args.status) {
      journeys = allJourneys.filter((journey: any) => journey.status === args.status);
    }

    // Apply limit if provided
    const limit = args.limit || 20;

    // Sort by creation time (newest first) and apply limit
    const sortedJourneys = journeys
      .sort((a: any, b: any) => b._creationTime - a._creationTime)
      .slice(0, limit);

    // Get legs for each journey
    const journeysWithLegs = await Promise.all(
      sortedJourneys.map(async (journey: any) => {
        const legs = await ctx.db
          .query("journeyLegs")
          .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journey.journeyId))
          .collect();

        // Sort legs by index
        legs.sort((a: any, b: any) => a.legIndex - b.legIndex);

        return {
          ...journey,
          legs
        };
      })
    );

    console.log(`📋 Found ${journeysWithLegs.length} journeys for passenger ${args.passengerId}`);

    return {
      success: true,
      journeys: journeysWithLegs,
      totalFound: journeys.length,
      hasMore: journeys.length > limit
    };

  } catch (error) {
    console.error("❌ Error getting passenger journeys:", error);
    return {
      success: false,
      error: `Failed to get passenger journeys: ${error}`
    };
  }
}

export async function calculateJourneyTotalCostHandler(ctx: any, args: any): Promise<any> {
  try {
    // Get all legs for the journey
    const legs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    if (legs.length === 0) {
      return {
        success: false,
        error: "No legs found for journey"
      };
    }

    // Calculate totals
    let totalEstimatedCost = 0;
    let totalActualCost = 0;
    let completedLegs = 0;

    for (const leg of legs) {
      totalEstimatedCost += leg.estimatedFare || 0;

      if (leg.actualFare !== undefined && leg.status === "completed") {
        totalActualCost += leg.actualFare;
        completedLegs++;
      }
    }

    const totalLegs = legs.length;
    const costVariance = totalActualCost - (totalEstimatedCost * (completedLegs / totalLegs));

    console.log(`💰 Journey ${args.journeyId}: Est: ${totalEstimatedCost}, Actual: ${totalActualCost}, Variance: ${costVariance}`);

    return {
      success: true,
      totalEstimatedCost,
      totalActualCost,
      completedLegs,
      totalLegs,
      costVariance
    };

  } catch (error) {
    console.error("❌ Error calculating journey total cost:", error);
    return {
      success: false,
      error: `Failed to calculate total cost: ${error}`
    };
  }
}

export async function requestNextLegTaxiHandlerExported(ctx: any, args: any): Promise<any> {
  return await requestNextLegTaxiHandler(ctx, args);
}

export async function updateLegEstimatedArrivalHandler(ctx: any, args: any): Promise<any> {
  try {
    // Get the leg record
    const leg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
      )
      .unique();

    if (!leg) {
      return {
        success: false,
        error: "Leg not found"
      };
    }

    await ctx.db.patch(leg._id, {
      estimatedDuration: args.newEstimatedDuration
    });

    console.log(`⏱️ Updated leg ${args.legIndex} estimated duration to ${args.newEstimatedDuration}s`);

    return {
      success: true,
      message: "Leg estimated arrival updated successfully"
    };

  } catch (error) {
    console.error("❌ Error updating leg estimated arrival:", error);
    return {
      success: false,
      error: `Failed to update leg estimated arrival: ${error}`
    };
  }
}