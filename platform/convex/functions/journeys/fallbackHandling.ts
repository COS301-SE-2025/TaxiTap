/**
 * fallbackHandling.ts
 *
 * Robust fallback system for multi-leg journey failures and edge cases.
 * Handles expanding search radius, alternative transfer points, journey modification,
 * and graceful degradation to manual booking.
 *
 * @author Moyahabo Hamese
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// FALLBACK CONFIGURATION AND CONSTANTS
// ============================================================================

const FALLBACK_CONFIG = {
  MAX_SEARCH_RADIUS: 5.0, // Maximum search radius in km
  RADIUS_INCREMENT: 0.5, // How much to expand radius each attempt
  MAX_ALTERNATIVE_POINTS: 3, // Maximum alternative transfer points to suggest
  MAX_RETRY_ATTEMPTS: 3, // Maximum retry attempts for taxi requests
  FALLBACK_WAIT_TIME: 30000, // 30 seconds wait between fallback attempts
  MANUAL_BOOKING_THRESHOLD: 10, // Minutes before suggesting manual booking
};

// ============================================================================
// CORE FALLBACK FUNCTIONS
// ============================================================================

/**
 * Handler function for expanding search radius when no taxis are found
 */
export async function expandSearchRadiusHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🔍 Expanding search radius for journey ${args.journeyId}, leg ${args.legIndex}`);

    const { journeyId, legIndex, currentRadius, maxRadius = FALLBACK_CONFIG.MAX_SEARCH_RADIUS } = args;

    // Get the journey leg
    const leg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", journeyId).eq("legIndex", legIndex)
      )
      .unique();

    if (!leg) {
      return {
        success: false,
        error: "Journey leg not found"
      };
    }

    // Calculate new search radius
    const newRadius = Math.min(
      currentRadius + FALLBACK_CONFIG.RADIUS_INCREMENT,
      maxRadius
    );

    // Check if we've reached maximum radius
    if (newRadius >= maxRadius) {
      return {
        success: false,
        error: "Maximum search radius reached",
        suggestedActions: [
          "Try alternative transfer points",
          "Wait for taxi availability",
          "Consider manual booking",
          "Modify journey route"
        ],
        currentRadius: newRadius
      };
    }

    // Try to find taxis with expanded radius
    const taxiSearchResult: any = await ctx.runQuery(
      internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney,
      {
        originLat: leg.fromCoordinates.latitude,
        originLng: leg.fromCoordinates.longitude,
        destinationLat: leg.toCoordinates.latitude,
        destinationLng: leg.toCoordinates.longitude,
        maxOriginDistance: 1.0,
        maxDestinationDistance: 1.0,
        maxTaxiDistance: newRadius,
        maxResults: 10
      }
    );

    if (taxiSearchResult.success && taxiSearchResult.availableTaxis.length > 0) {
      // Update leg with expanded search results
      await ctx.db.patch(leg._id, {
        status: "requesting",
        requestedAt: Date.now()
      });

      // Send notification about expanded search
      await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
        userId: leg.passengerId || "",
        type: "search_radius_expanded",
        title: "Search Radius Expanded",
        message: `No taxis found nearby. Expanded search to ${newRadius.toFixed(1)}km and found ${taxiSearchResult.availableTaxis.length} options.`,
        priority: "medium",
        metadata: {
          journeyId,
          legIndex,
          newRadius,
          availableTaxis: taxiSearchResult.availableTaxis.length,
          expandedSearch: true
        },
        scheduledFor: null,
        expiresAt: null
      });

      return {
        success: true,
        availableTaxis: taxiSearchResult.availableTaxis,
        newRadius,
        message: `Found ${taxiSearchResult.availableTaxis.length} taxis with expanded radius`
      };
    }

    // Still no taxis found, suggest next steps
    return {
      success: false,
      error: "No taxis found even with expanded radius",
      newRadius,
      suggestedActions: [
        "Try alternative transfer points",
        "Wait for taxi availability",
        "Consider manual booking",
        "Modify journey route"
      ],
      nextSteps: await suggestNextSteps(ctx, journeyId, legIndex, newRadius)
    };

  } catch (error) {
    console.error("❌ Error expanding search radius:", error);
    return {
      success: false,
      error: `Failed to expand search radius: ${error}`
    };
  }
}

/**
 * Handler function for finding alternative transfer points
 */
export async function findAlternativeTransferPointsHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🔄 Finding alternative transfer points for journey ${args.journeyId}`);

    const { journeyId, legIndex, maxAlternatives = FALLBACK_CONFIG.MAX_ALTERNATIVE_POINTS } = args;

    // Get journey and current leg
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      return {
        success: false,
        error: "Journey not found"
      };
    }

    const currentLeg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", journeyId).eq("legIndex", legIndex)
      )
      .unique();

    if (!currentLeg) {
      return {
        success: false,
        error: "Current leg not found"
      };
    }

    // Find nearby route intersections that could serve as alternative transfer points
    const alternativePoints = await findNearbyRouteIntersections(
      ctx,
      currentLeg.fromCoordinates,
      currentLeg.toCoordinates,
      maxAlternatives
    );

    if (alternativePoints.length === 0) {
      return {
        success: false,
        error: "No alternative transfer points found",
        suggestedActions: [
          "Wait for taxi availability",
          "Consider manual booking",
          "Modify journey route"
        ]
      };
    }

    // Test each alternative point for taxi availability
    const testedAlternatives = [];
    for (const point of alternativePoints) {
      const taxiTest = await ctx.runQuery(
        internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney,
        {
          originLat: point.coordinates.latitude,
          originLng: point.coordinates.longitude,
          destinationLat: currentLeg.toCoordinates.latitude,
          destinationLng: currentLeg.toCoordinates.longitude,
          maxOriginDistance: 1.0,
          maxDestinationDistance: 1.0,
          maxTaxiDistance: 2.0,
          maxResults: 5
        }
      );

      if (taxiTest.success && taxiTest.availableTaxis.length > 0) {
        testedAlternatives.push({
          ...point,
          availableTaxis: taxiTest.availableTaxis.length,
          estimatedWalkTime: calculateWalkTime(currentLeg.fromCoordinates, point.coordinates),
          taxiAvailability: "good"
        });
      } else {
        testedAlternatives.push({
          ...point,
          availableTaxis: 0,
          estimatedWalkTime: calculateWalkTime(currentLeg.fromCoordinates, point.coordinates),
          taxiAvailability: "limited"
        });
      }
    }

    // Sort by taxi availability and walk time
    testedAlternatives.sort((a, b) => {
      if (a.availableTaxis !== b.availableTaxis) {
        return b.availableTaxis - a.availableTaxis;
      }
      return a.estimatedWalkTime - b.estimatedWalkTime;
    });

    // Send notification about alternatives
    await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
      userId: journey.passengerId,
      type: "alternative_transfer_points",
      title: "Alternative Transfer Points Found",
      message: `Found ${testedAlternatives.length} alternative transfer points. ${testedAlternatives.filter(a => a.availableTaxis > 0).length} have taxi availability.`,
      priority: "high",
      metadata: {
        journeyId,
        legIndex,
        alternatives: testedAlternatives,
        currentLocation: currentLeg.fromCoordinates
      },
      scheduledFor: null,
      expiresAt: null
    });

    return {
      success: true,
      alternatives: testedAlternatives,
      message: `Found ${testedAlternatives.length} alternative transfer points`
    };

  } catch (error) {
    console.error("❌ Error finding alternative transfer points:", error);
    return {
      success: false,
      error: `Failed to find alternative transfer points: ${error}`
    };
  }
}

/**
 * Handler function for modifying journey mid-route
 */
export async function modifyJourneyMidRouteHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🔄 Modifying journey ${args.journeyId} mid-route`);

    const { journeyId, modificationType, newDestination, alternativeRoute, reason } = args;

    // Get journey
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      return {
        success: false,
        error: "Journey not found"
      };
    }

    switch (modificationType) {
      case "change_destination":
        return await handleDestinationChange(ctx, journey, newDestination, reason);

      case "skip_leg":
        return await handleLegSkipping(ctx, journey, args.legIndex, reason);

      case "add_leg":
        return await handleLegAddition(ctx, journey, args.newLeg, reason);

      case "reorder_legs":
        return await handleLegReordering(ctx, journey, args.newOrder, reason);

      case "split_journey":
        return await handleJourneySplitting(ctx, journey, args.splitPoint, reason);

      default:
        return {
          success: false,
          error: "Invalid modification type"
        };
    }

  } catch (error) {
    console.error("❌ Error modifying journey mid-route:", error);
    return {
      success: false,
      error: `Failed to modify journey: ${error}`
    };
  }
}

/**
 * Handler function for graceful degradation to manual booking
 */
export async function gracefulDegradationToManualHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`🔄 Gracefully degrading journey ${args.journeyId} to manual booking`);

    const { journeyId, reason, passengerLocation, fallbackOptions } = args;

    // Get journey
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      return {
        success: false,
        error: "Journey not found"
      };
    }

    // Mark journey as requiring manual intervention
    await ctx.db.patch(journey._id, {
      status: "paused",
      updatedAt: Date.now(),
      manualInterventionRequired: true,
      degradationReason: reason
    });

    // Get current leg
    const currentLeg = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_and_leg", (q: any) =>
        q.eq("journeyId", journeyId).eq("legIndex", journey.currentLegIndex)
      )
      .unique();

    if (currentLeg) {
      await ctx.db.patch(currentLeg._id, {
        status: "failed",
        failureReason: reason
      });
    }

    // Generate manual booking suggestions
    const manualSuggestions = await generateManualBookingSuggestions(
      ctx,
      journey,
      passengerLocation,
      fallbackOptions
    );

    // Send comprehensive notification about manual booking options
    await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
      userId: journey.passengerId,
      type: "manual_booking_required",
      title: "Manual Booking Required",
      message: `Automatic taxi matching failed. Here are your manual booking options: ${manualSuggestions.options.length} alternatives available.`,
      priority: "urgent",
      metadata: {
        journeyId,
        reason,
        manualSuggestions,
        fallbackOptions,
        currentLocation: passengerLocation,
        estimatedWaitTime: manualSuggestions.estimatedWaitTime
      },
      scheduledFor: null,
      expiresAt: null
    });

    return {
      success: true,
      manualSuggestions,
      message: "Journey degraded to manual booking mode",
      nextSteps: [
        "Review manual booking options",
        "Contact customer service if needed",
        "Consider alternative transportation",
        "Wait for system recovery"
      ]
    };

  } catch (error) {
    console.error("❌ Error in graceful degradation:", error);
    return {
      success: false,
      error: `Failed to degrade to manual booking: ${error}`
    };
  }
}

// ============================================================================
// PUBLIC MUTATION FUNCTIONS
// ============================================================================

/**
 * Expands search radius when no taxis are found
 */
export const expandSearchRadius = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    currentRadius: v.number(),
    maxRadius: v.optional(v.number())
  },
  handler: expandSearchRadiusHandler
});

/**
 * Finds alternative transfer points when current ones fail
 */
export const findAlternativeTransferPoints = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    maxAlternatives: v.optional(v.number())
  },
  handler: findAlternativeTransferPointsHandler
});

/**
 * Modifies journey mid-route when issues arise
 */
export const modifyJourneyMidRoute = mutation({
  args: {
    journeyId: v.string(),
    modificationType: v.union(
      v.literal("change_destination"),
      v.literal("skip_leg"),
      v.literal("add_leg"),
      v.literal("reorder_legs"),
      v.literal("split_journey")
    ),
    newDestination: v.optional(v.object({
      address: v.string(),
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number()
      })
    })),
    alternativeRoute: v.optional(v.any()),
    newLeg: v.optional(v.any()),
    newOrder: v.optional(v.array(v.number())),
    splitPoint: v.optional(v.number()),
    legIndex: v.optional(v.number()),
    reason: v.optional(v.string())
  },
  handler: modifyJourneyMidRouteHandler
});

/**
 * Gracefully degrades to manual booking when all else fails
 */
export const gracefulDegradationToManual = mutation({
  args: {
    journeyId: v.string(),
    reason: v.string(),
    passengerLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    fallbackOptions: v.optional(v.any())
  },
  handler: gracefulDegradationToManualHandler
});

/**
 * Handles fallback escalation when multiple strategies fail
 */
export const handleFallbackEscalation = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    escalationLevel: v.number(),
    previousAttempts: v.array(v.string())
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      console.log(`🚨 Handling fallback escalation for journey ${args.journeyId}, level ${args.escalationLevel}`);

      const { journeyId, legIndex, escalationLevel, previousAttempts } = args;

      // Get journey and leg
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journeyId))
        .unique();

      if (!journey) {
        return {
          success: false,
          error: "Journey not found"
        };
      }

      const leg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q: any) =>
          q.eq("journeyId", journeyId).eq("legIndex", legIndex)
        )
        .unique();

      if (!leg) {
        return {
          success: false,
          error: "Journey leg not found"
        };
      }

      let escalationResult: any = { success: false };

      switch (escalationLevel) {
        case 1:
          // Try expanding search radius
          if (!previousAttempts.includes("expand_radius")) {
            escalationResult = await expandSearchRadiusHandler(ctx, {
              journeyId,
              legIndex,
              currentRadius: 1.0
            });
          }
          break;

        case 2:
          // Try alternative transfer points
          if (!previousAttempts.includes("alternative_points")) {
            escalationResult = await findAlternativeTransferPointsHandler(ctx, {
              journeyId,
              legIndex
            });
          }
          break;

        case 3:
          // Try journey modification
          if (!previousAttempts.includes("modify_journey")) {
            escalationResult = await modifyJourneyMidRouteHandler(ctx, {
              journeyId,
              modificationType: "skip_leg",
              legIndex,
              reason: "Taxi availability issues"
            });
          }
          break;

        case 4:
          // Graceful degradation to manual booking
          if (!previousAttempts.includes("manual_booking")) {
            escalationResult = await gracefulDegradationToManualHandler(ctx, {
              journeyId,
              reason: "All automatic fallback strategies exhausted",
              passengerLocation: leg.fromCoordinates,
              fallbackOptions: {
                contactCustomerService: true,
                alternativeTransport: true,
                waitForRecovery: true
              }
            });
          }
          break;

        default:
          return {
            success: false,
            error: "Maximum escalation level reached",
            suggestedActions: [
              "Contact customer service immediately",
              "Consider alternative transportation",
              "Wait for system recovery"
            ]
          };
      }

      // Update leg with escalation attempt
      await ctx.db.patch(leg._id, {
        escalationLevel,
        lastEscalationAttempt: Date.now(),
        escalationHistory: [...((leg as any).escalationHistory || []), {
          level: escalationLevel,
          timestamp: Date.now(),
          result: escalationResult.success ? "success" : "failed",
          attempts: previousAttempts
        }]
      } as any);

      return {
        success: escalationResult.success,
        escalationLevel,
        result: escalationResult,
        nextLevel: escalationLevel + 1,
        message: escalationResult.success 
          ? `Escalation level ${escalationLevel} resolved the issue`
          : `Escalation level ${escalationLevel} failed, proceeding to level ${escalationLevel + 1}`
      };

    } catch (error) {
      console.error("❌ Error in fallback escalation:", error);
      return {
        success: false,
        error: `Failed to handle fallback escalation: ${error}`
      };
    }
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find nearby route intersections that could serve as alternative transfer points
 */
async function findNearbyRouteIntersections(
  ctx: any,
  fromCoords: { latitude: number; longitude: number },
  toCoords: { latitude: number; longitude: number },
  maxAlternatives: number
): Promise<Array<{
  coordinates: { latitude: number; longitude: number };
  address: string;
  routeIds: string[];
  distance: number;
}>> {
  try {
    // Get all routes that pass near the origin
    const nearbyRoutes = await ctx.db
      .query("routes")
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    const intersections = [];

    for (const route of nearbyRoutes) {
      // Check if route passes within 2km of origin
      const originDistance = calculateDistance(
        fromCoords.latitude,
        fromCoords.longitude,
        route.startLocation.coordinates.latitude,
        route.startLocation.coordinates.longitude
      );

      if (originDistance <= 2.0) {
        // Check if route also passes near destination
        const destDistance = calculateDistance(
          toCoords.latitude,
          toCoords.longitude,
          route.endLocation.coordinates.latitude,
          route.endLocation.coordinates.longitude
        );

        if (destDistance <= 2.0) {
          // This route could serve as an alternative
          intersections.push({
            coordinates: {
              latitude: (route.startLocation.coordinates.latitude + route.endLocation.coordinates.latitude) / 2,
              longitude: (route.startLocation.coordinates.longitude + route.endLocation.coordinates.longitude) / 2
            },
            address: `${route.startLocation.address} to ${route.endLocation.address}`,
            routeIds: [route.routeId],
            distance: Math.min(originDistance, destDistance)
          });
        }
      }
    }

    // Sort by distance and return top alternatives
    return intersections
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxAlternatives);

  } catch (error) {
    console.error("Error finding route intersections:", error);
    return [];
  }
}

/**
 * Calculate walking time between two points
 */
function calculateWalkTime(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const distance = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
  const walkingSpeed = 5; // km/h
  return (distance / walkingSpeed) * 60; // Return minutes
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Suggest next steps when fallback strategies fail
 */
async function suggestNextSteps(
  ctx: any,
  journeyId: string,
  legIndex: number,
  currentRadius: number
): Promise<string[]> {
  const steps = [
    "Try alternative transfer points",
    "Wait for taxi availability",
    "Consider manual booking"
  ];

  if (currentRadius >= FALLBACK_CONFIG.MAX_SEARCH_RADIUS) {
    steps.push("Contact customer service for assistance");
    steps.push("Consider alternative transportation methods");
  }

  return steps;
}

/**
 * Generate manual booking suggestions
 */
async function generateManualBookingSuggestions(
  ctx: any,
  journey: any,
  passengerLocation: { latitude: number; longitude: number },
  fallbackOptions: any
): Promise<{
  options: Array<{
    type: string;
    description: string;
    estimatedCost: number;
    estimatedTime: number;
    contactInfo?: string;
  }>;
  estimatedWaitTime: number;
}> {
  const options = [
    {
      type: "taxi_stand",
      description: "Walk to nearest taxi stand",
      estimatedCost: 0,
      estimatedTime: 5,
      contactInfo: "Find nearest taxi stand on map"
    },
    {
      type: "ride_hailing",
      description: "Use alternative ride-hailing app",
      estimatedCost: journey.estimatedTotalFare * 1.2,
      estimatedTime: 10,
      contactInfo: "Uber, Bolt, or other local services"
    },
    {
      type: "public_transport",
      description: "Use public transportation",
      estimatedCost: 15,
      estimatedTime: 30,
      contactInfo: "Check local bus/train schedules"
    },
    {
      type: "customer_service",
      description: "Contact TaxiTap customer service",
      estimatedCost: 0,
      estimatedTime: 15,
      contactInfo: "Call +27 11 123 4567"
    }
  ];

  return {
    options,
    estimatedWaitTime: 15 // minutes
  };
}

// ============================================================================
// JOURNEY MODIFICATION HANDLERS
// ============================================================================

async function handleDestinationChange(
  ctx: any,
  journey: any,
  newDestination: any,
  reason: string
): Promise<any> {
  // Update journey destination
  await ctx.db.patch(journey._id, {
    destinationAddress: newDestination.address,
    destinationCoordinates: newDestination.coordinates,
    updatedAt: Date.now(),
    modificationReason: reason
  });

  return {
    success: true,
    message: "Journey destination updated successfully",
    newDestination
  };
}

async function handleLegSkipping(
  ctx: any,
  journey: any,
  legIndex: number,
  reason: string
): Promise<any> {
  // Mark leg as skipped
  const leg = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_and_leg", (q: any) =>
      q.eq("journeyId", journey.journeyId).eq("legIndex", legIndex)
    )
    .unique();

  if (leg) {
    await ctx.db.patch(leg._id, {
      status: "skipped",
      skipReason: reason,
      skippedAt: Date.now()
    });
  }

  return {
    success: true,
    message: `Leg ${legIndex} skipped successfully`,
    reason
  };
}

async function handleLegAddition(
  ctx: any,
  journey: any,
  newLeg: any,
  reason: string
): Promise<any> {
  // Add new leg to journey
  const legRecord = await ctx.db.insert("journeyLegs", {
    journeyId: journey.journeyId,
    legIndex: journey.totalLegs,
    fromAddress: newLeg.fromAddress,
    toAddress: newLeg.toAddress,
    fromCoordinates: newLeg.fromCoordinates,
    toCoordinates: newLeg.toCoordinates,
    status: "pending",
    estimatedFare: newLeg.estimatedFare,
    estimatedDuration: newLeg.estimatedDuration,
    addedReason: reason
  });

  // Update journey total legs
  await ctx.db.patch(journey._id, {
    totalLegs: journey.totalLegs + 1,
    updatedAt: Date.now()
  });

  return {
    success: true,
    message: "New leg added to journey",
    newLegId: legRecord
  };
}

async function handleLegReordering(
  ctx: any,
  journey: any,
  newOrder: number[],
  reason: string
): Promise<any> {
  // Get all legs
  const legs = await ctx.db
    .query("journeyLegs")
    .withIndex("by_journey_id", (q: any) => q.eq("journeyId", journey.journeyId))
    .collect();

  // Reorder legs according to new order
  for (let i = 0; i < newOrder.length; i++) {
    const leg = legs.find((l: any) => l.legIndex === newOrder[i]);
    if (leg) {
      await ctx.db.patch(leg._id, {
        legIndex: i,
        reorderReason: reason
      });
    }
  }

  return {
    success: true,
    message: "Journey legs reordered successfully",
    newOrder
  };
}

async function handleJourneySplitting(
  ctx: any,
  journey: any,
  splitPoint: number,
  reason: string
): Promise<any> {
  // Create new journey for remaining legs
  const newJourneyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newJourney = await ctx.db.insert("multiLegJourneys", {
    journeyId: newJourneyId,
    passengerId: journey.passengerId,
    status: "planning",
    totalLegs: journey.totalLegs - splitPoint,
    currentLegIndex: 0,
    originAddress: journey.originAddress,
    destinationAddress: journey.destinationAddress,
    originCoordinates: journey.originCoordinates,
    destinationCoordinates: journey.destinationCoordinates,
    optimizationPreference: journey.optimizationPreference,
    estimatedTotalFare: journey.estimatedTotalFare * 0.5, // Rough estimate
    estimatedTotalDuration: journey.estimatedTotalDuration * 0.5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentJourneyId: journey.journeyId,
    splitReason: reason
  });

  // Mark original journey as completed at split point
  await ctx.db.patch(journey._id, {
    status: "completed",
    completedAt: Date.now(),
    splitAt: splitPoint,
    splitReason: reason
  });

  return {
    success: true,
    message: "Journey split successfully",
    newJourneyId,
    splitPoint
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get fallback status for a journey
 */
export const getFallbackStatus = query({
  args: {
    journeyId: v.string()
  },
  handler: async (ctx, args) => {
    try {
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

      // Get all legs with their fallback status
      const legs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
        .collect();

      const fallbackStatus = {
        journeyId: args.journeyId,
        status: journey.status,
        manualInterventionRequired: (journey as any).manualInterventionRequired || false,
        degradationReason: (journey as any).degradationReason,
        totalLegs: journey.totalLegs,
        legs: legs.map((leg: any) => ({
          legIndex: leg.legIndex,
          status: leg.status,
          escalationLevel: leg.escalationLevel || 0,
          lastEscalationAttempt: leg.lastEscalationAttempt,
          failureReason: leg.failureReason,
          skipReason: leg.skipReason
        }))
      };

      return {
        success: true,
        fallbackStatus
      };

    } catch (error) {
      console.error("❌ Error getting fallback status:", error);
      return {
        success: false,
        error: `Failed to get fallback status: ${error}`
      };
    }
  }
});

/**
 * Get available fallback strategies for a journey leg
 */
export const getAvailableFallbackStrategies = query({
  args: {
    journeyId: v.string(),
    legIndex: v.number()
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
          error: "Journey leg not found"
        };
      }

      const strategies = [];

      // Check if radius expansion is available
      if (((leg as any).escalationLevel || 0) < 1) {
        strategies.push({
          type: "expand_radius",
          description: "Expand search radius for taxi availability",
          estimatedTime: 2,
          successRate: 0.7
        });
      }

      // Check if alternative points are available
      if (((leg as any).escalationLevel || 0) < 2) {
        strategies.push({
          type: "alternative_points",
          description: "Find alternative transfer points",
          estimatedTime: 5,
          successRate: 0.6
        });
      }

      // Check if journey modification is available
      if (((leg as any).escalationLevel || 0) < 3) {
        strategies.push({
          type: "modify_journey",
          description: "Modify journey route or skip leg",
          estimatedTime: 10,
          successRate: 0.8
        });
      }

      // Manual booking is always available
      strategies.push({
        type: "manual_booking",
        description: "Switch to manual booking mode",
        estimatedTime: 15,
        successRate: 1.0
      });

      return {
        success: true,
        strategies,
        currentEscalationLevel: (leg as any).escalationLevel || 0
      };

    } catch (error) {
      console.error("❌ Error getting fallback strategies:", error);
      return {
        success: false,
        error: `Failed to get fallback strategies: ${error}`
      };
    }
  }
});
