// Multi-leg journey finder for routes unreachable by single taxi
import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

const EARTH_RADIUS_KM = 6371;

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS_KM * c;
}

function calculateFare(passengerDisplacement: number): number {
  const BASE_FARE = 20.0;
  const BASE_DISTANCE = 10.0;
  const OVERAGE_RATE = 2.5;
  const OVERAGE_BLOCK = 5.0;

  if (passengerDisplacement <= BASE_DISTANCE) {
    return BASE_FARE;
  }

  const overageDistance = passengerDisplacement - BASE_DISTANCE;
  const overageBlocks = Math.ceil(overageDistance / OVERAGE_BLOCK);
  const overageFee = overageBlocks * OVERAGE_RATE;

  return Math.ceil(BASE_FARE + overageFee);
}

type RouteStop = {
  id: string;
  name: string;
  coordinates: number[];
  order: number;
};

type RouteWithStops = {
  _id: Id<"routes">;
  routeId: string;
  name: string;
  stops: RouteStop[];
  isActive: boolean;
  taxiAssociation: string;
  fare: number;
  estimatedDuration: number;
};

interface TransferPointCandidate {
  stop1: RouteStop & { routeId: string; routeName: string };
  stop2: RouteStop & { routeId: string; routeName: string };
  walkingDistance: number;
  estimatedWalkingTime: number;
}

interface MultiLegOption {
  journeyId: string;
  leg1: {
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
  };
  leg2: {
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
  };
  totalEstimatedCost: number;
  transferPoint: {
    stop1_id: string;
    stop2_id: string;
    walkingDistance: number;
    estimatedWalkingTime: number;
  };
}

/**
 * Find viable transfer points between routes
 */
async function findTransferPoints(
  ctx: QueryCtx,
  routes: RouteWithStops[],
  maxTransferDistance: number = 4.0 // 4km max walking distance
): Promise<TransferPointCandidate[]> {
  const transferPoints: TransferPointCandidate[] = [];

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const route1 = routes[i];
      const route2 = routes[j];

      // Skip if same route or same taxi association (should have direct route)
      if (route1.routeId === route2.routeId || route1.taxiAssociation === route2.taxiAssociation) {
        continue;
      }

      // Get enriched stops or fall back to original
      const enrichedRoute1 = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", route1.routeId))
        .unique();

      const enrichedRoute2 = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", route2.routeId))
        .unique();

      const stops1 = enrichedRoute1 ? enrichedRoute1.stops : route1.stops;
      const stops2 = enrichedRoute2 ? enrichedRoute2.stops : route2.stops;

      // Check all stop combinations between the two routes
      for (const stop1 of stops1) {
        for (const stop2 of stops2) {
          const [lat1, lng1] = stop1.coordinates;
          const [lat2, lng2] = stop2.coordinates;

          const walkingDistance = calculateDistance(lat1, lng1, lat2, lng2);

          if (walkingDistance <= maxTransferDistance) {
            // Estimate walking time: ~5 km/h walking speed
            const estimatedWalkingTime = Math.ceil((walkingDistance / 5) * 60); // minutes

            transferPoints.push({
              stop1: { ...stop1, routeId: route1.routeId, routeName: route1.name },
              stop2: { ...stop2, routeId: route2.routeId, routeName: route2.name },
              walkingDistance,
              estimatedWalkingTime,
            });
          }
        }
      }
    }
  }

  return transferPoints.sort((a, b) => a.walkingDistance - b.walkingDistance);
}

/**
 * Find multi-leg journey options using transfer points
 */
export const findMultiLegJourneyOptionsHandler = async (
  ctx: QueryCtx,
  {
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    maxWalkingDistance = 1.0,  // 1km max walking from origin/to destination
    maxTransferDistance = 4.0, // 4km max walking between transfer points
  }: {
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    maxWalkingDistance?: number;
    maxTransferDistance?: number;
  }
) => {
  try {
    console.log('🔍 Finding multi-leg journey options:', {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destinationLat, lng: destinationLng }
    });

    // Get all active routes
    const allRoutes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    console.log(`📊 Found ${allRoutes.length} active routes to analyze`);

    if (allRoutes.length < 2) {
      return {
        success: false,
        journeyOptions: [],
        message: "Insufficient routes for multi-leg journey",
        searchCriteria: {
          origin: { latitude: originLat, longitude: originLng },
          destination: { latitude: destinationLat, longitude: destinationLng },
          maxWalkingDistance,
          maxTransferDistance,
        }
      };
    }

    // Find transfer points between different routes
    const transferPoints = await findTransferPoints(ctx, allRoutes, maxTransferDistance);

    console.log(`🔄 Found ${transferPoints.length} potential transfer points`);

    if (transferPoints.length === 0) {
      return {
        success: false,
        journeyOptions: [],
        message: "No viable transfer points found between routes",
        searchCriteria: {
          origin: { latitude: originLat, longitude: originLng },
          destination: { latitude: destinationLat, longitude: destinationLng },
          maxWalkingDistance,
          maxTransferDistance,
        }
      };
    }

    const journeyOptions: MultiLegOption[] = [];

    for (const transferPoint of transferPoints) {
      // Get route details for both legs
      const route1 = allRoutes.find(r => r.routeId === transferPoint.stop1.routeId);
      const route2 = allRoutes.find(r => r.routeId === transferPoint.stop2.routeId);

      if (!route1 || !route2) continue;

      // Get enriched stops for both routes
      const enrichedRoute1 = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", route1.routeId))
        .unique();

      const enrichedRoute2 = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", route2.routeId))
        .unique();

      const stops1 = enrichedRoute1 ? enrichedRoute1.stops : route1.stops;
      const stops2 = enrichedRoute2 ? enrichedRoute2.stops : route2.stops;

      // STEP 1: Find stops within 1km of origin that belong to Route 1
      const originCandidates = stops1.filter(stop => {
        const [stopLat, stopLng] = stop.coordinates;
        const distance = calculateDistance(originLat, originLng, stopLat, stopLng);
        return distance <= maxWalkingDistance;
      });

      // STEP 2: Find stops within 1km of destination that belong to Route 2
      const destinationCandidates = stops2.filter(stop => {
        const [stopLat, stopLng] = stop.coordinates;
        const distance = calculateDistance(destinationLat, destinationLng, stopLat, stopLng);
        return distance <= maxWalkingDistance;
      });

      if (originCandidates.length === 0 || destinationCandidates.length === 0) {
        continue;
      }

      // STEP 3: Validate stop order (borrowed from hasDirectRoute logic)
      const leg1Transfer = transferPoint.stop1; // Stop_4 (leg 1 destination)
      const leg2Transfer = transferPoint.stop2; // Stop_2 (leg 2 origin)

      for (const originStop of originCandidates) { // Stop_1
        // Check if originStop comes before leg1Transfer in route order
        if (originStop.order >= leg1Transfer.order) continue;

        for (const destStop of destinationCandidates) { // Stop_3
          // Check if leg2Transfer comes before destStop in route order
          if (leg2Transfer.order >= destStop.order) continue;

          // Calculate costs for each leg
          const leg1Distance = calculateDistance(originLat, originLng, destinationLat, destinationLng) / 2; // rough estimate
          const leg2Distance = leg1Distance; // rough estimate for leg 2

          const leg1Cost = calculateFare(leg1Distance);
          const leg2Cost = calculateFare(leg2Distance);
          const totalCost = leg1Cost + leg2Cost;

          const journeyId = `multileg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const option: MultiLegOption = {
            journeyId,
            leg1: {
              routeName: route1.name,
              origin: {
                coordinates: { latitude: originLat, longitude: originLng },
                address: `Near ${originStop.name}`,
              },
              destination: {
                coordinates: {
                  latitude: leg1Transfer.coordinates[0],
                  longitude: leg1Transfer.coordinates[1]
                },
                address: leg1Transfer.name,
              },
              originStopId: originStop.id,
              destinationStopId: leg1Transfer.id,
              estimatedCost: leg1Cost,
            },
            leg2: {
              routeName: route2.name,
              origin: {
                coordinates: {
                  latitude: leg2Transfer.coordinates[0],
                  longitude: leg2Transfer.coordinates[1]
                },
                address: leg2Transfer.name,
              },
              destination: {
                coordinates: { latitude: destinationLat, longitude: destinationLng },
                address: `Near ${destStop.name}`,
              },
              originStopId: leg2Transfer.id,
              destinationStopId: destStop.id,
              estimatedCost: leg2Cost,
            },
            totalEstimatedCost: totalCost,
            transferPoint: {
              stop1_id: leg1Transfer.id,
              stop2_id: leg2Transfer.id,
              walkingDistance: transferPoint.walkingDistance,
              estimatedWalkingTime: transferPoint.estimatedWalkingTime,
            },
          };

          journeyOptions.push(option);
        }
      }
    }

    // Sort by total cost and limit results
    const sortedOptions = journeyOptions
      .sort((a, b) => a.totalEstimatedCost - b.totalEstimatedCost)
      .slice(0, 5); // Limit to top 5 options

    console.log(`✅ Found ${sortedOptions.length} valid multi-leg journey options`);

    return {
      success: true,
      journeyOptions: sortedOptions,
      message: `Found ${sortedOptions.length} multi-leg journey options`,
      searchCriteria: {
        origin: { latitude: originLat, longitude: originLng },
        destination: { latitude: destinationLat, longitude: destinationLng },
        maxWalkingDistance,
        maxTransferDistance,
      }
    };

  } catch (error) {
    console.error("❌ Error in findMultiLegJourneyOptions:", error);
    return {
      success: false,
      journeyOptions: [],
      message: `Error finding multi-leg journey options: ${error}`,
      searchCriteria: {
        origin: { latitude: originLat, longitude: originLng },
        destination: { latitude: destinationLat, longitude: destinationLng },
        maxWalkingDistance,
        maxTransferDistance,
      }
    };
  }
};

/**
 * Public query for finding multi-leg journey options
 */
export const findMultiLegJourneyOptions = query({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    maxWalkingDistance: v.optional(v.number()),
    maxTransferDistance: v.optional(v.number()),
  },
  handler: findMultiLegJourneyOptionsHandler
});