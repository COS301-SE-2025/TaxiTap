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
 * Filter routes to only those with drivers available in the general area
 * This reduces computational load while keeping route planning separate from real-time availability
 */
async function getRoutesWithAvailableDrivers(
  ctx: QueryCtx,
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  maxTaxiDistance: number = 10.0 // Wider radius for general area coverage
): Promise<RouteWithStops[]> {
  try {
    // Get all active routes first
    const allRoutes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Find drivers in the general journey area (origin, destination, and corridor between)
    const locations = await ctx.db.query("locations").collect();
    const nearbyDriverLocations = locations.filter((loc) => {
      if (loc.role !== "driver" && loc.role !== "both") return false;

      // Check if driver is within range of origin, destination, or the corridor between them
      const distanceToOrigin = calculateDistance(originLat, originLng, loc.latitude, loc.longitude);
      const distanceToDestination = calculateDistance(destinationLat, destinationLng, loc.latitude, loc.longitude);

      // Also check midpoint for corridor coverage
      const midpointLat = (originLat + destinationLat) / 2;
      const midpointLng = (originLng + destinationLng) / 2;
      const distanceToMidpoint = calculateDistance(midpointLat, midpointLng, loc.latitude, loc.longitude);

      return distanceToOrigin <= maxTaxiDistance ||
             distanceToDestination <= maxTaxiDistance ||
             distanceToMidpoint <= maxTaxiDistance;
    });

    if (nearbyDriverLocations.length === 0) {
      console.log('No drivers found in general journey area');
      return [];
    }

    // Get driver profiles for nearby drivers
    const driverUserIds = nearbyDriverLocations.map(loc => loc.userId);
    const driverProfiles = await ctx.db
      .query("drivers")
      .filter((q) => q.or(...driverUserIds.map(id => q.eq(q.field("userId"), id))))
      .collect();

    if (driverProfiles.length === 0) {
      console.log('No driver profiles found for nearby drivers');
      return [];
    }

    // Get routes that have these drivers assigned
    const routeIdsWithDrivers = [...new Set(driverProfiles.map(d => d.assignedRoute))];
    const routesWithDrivers = allRoutes.filter(route =>
      routeIdsWithDrivers.includes(route._id)
    );

    console.log(`Filtered routes: ${allRoutes.length} → ${routesWithDrivers.length} (routes with drivers in journey area)`);

    return routesWithDrivers;
  } catch (error) {
    console.error('Error filtering routes by driver availability:', error);
    // Fallback to all routes if filtering fails
    return await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  }
}

/**
 * Find viable transfer points between routes
 */
async function findTransferPoints(
  ctx: QueryCtx,
  routes: RouteWithStops[],
  maxTransferDistance: number = 4.0, // 4km max walking distance
  originLat?: number,
  originLng?: number,
  destinationLat?: number,
  destinationLng?: number
): Promise<TransferPointCandidate[]> {
  const transferPoints: TransferPointCandidate[] = [];

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const routeA = routes[i];
      const routeB = routes[j];

      // Skip if same route or same taxi association (should have direct route)
      if (routeA.routeId === routeB.routeId || routeA.taxiAssociation === routeB.taxiAssociation) {
        continue;
      }

      // Get enriched stops or fall back to original
      const enrichedRouteA = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", routeA.routeId))
        .unique();

      const enrichedRouteB = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", routeB.routeId))
        .unique();

      const stopsA = enrichedRouteA ? enrichedRouteA.stops : routeA.stops;
      const stopsB = enrichedRouteB ? enrichedRouteB.stops : routeB.stops;

      // Determine which route should be origin route and which should be destination route
      let originRoute, destinationRoute, originStops, destinationStops;

      if (originLat !== undefined && originLng !== undefined && destinationLat !== undefined && destinationLng !== undefined) {
        // Calculate which route is closer to origin and which to destination
        const routeAToOrigin = Math.min(...stopsA.map(stop =>
          calculateDistance(originLat, originLng, stop.coordinates[0], stop.coordinates[1])
        ));
        const routeBToOrigin = Math.min(...stopsB.map(stop =>
          calculateDistance(originLat, originLng, stop.coordinates[0], stop.coordinates[1])
        ));

        const routeAToDestination = Math.min(...stopsA.map(stop =>
          calculateDistance(destinationLat, destinationLng, stop.coordinates[0], stop.coordinates[1])
        ));
        const routeBToDestination = Math.min(...stopsB.map(stop =>
          calculateDistance(destinationLat, destinationLng, stop.coordinates[0], stop.coordinates[1])
        ));

        // Assign routes based on which is closer to origin vs destination
        if (routeAToOrigin < routeBToOrigin && routeBToDestination < routeAToDestination) {
          // Route A is closer to origin, Route B is closer to destination
          originRoute = routeA;
          destinationRoute = routeB;
          originStops = stopsA;
          destinationStops = stopsB;
        } else if (routeBToOrigin < routeAToOrigin && routeAToDestination < routeBToDestination) {
          // Route B is closer to origin, Route A is closer to destination
          originRoute = routeB;
          destinationRoute = routeA;
          originStops = stopsB;
          destinationStops = stopsA;
        } else {
          // Ambiguous or neither route is clearly better - skip this pair
          continue;
        }
      } else {
        // Fallback to arbitrary assignment if no origin/destination provided
        originRoute = routeA;
        destinationRoute = routeB;
        originStops = stopsA;
        destinationStops = stopsB;
      }

      // Check all stop combinations between origin route and destination route
      for (const originStop of originStops) {
        for (const destinationStop of destinationStops) {
          const [lat1, lng1] = originStop.coordinates;
          const [lat2, lng2] = destinationStop.coordinates;

          const walkingDistance = calculateDistance(lat1, lng1, lat2, lng2);

          if (walkingDistance <= maxTransferDistance) {
            // Estimate walking time: ~5 km/h walking speed
            const estimatedWalkingTime = Math.ceil((walkingDistance / 5) * 60); // minutes

            transferPoints.push({
              stop1: { ...originStop, routeId: originRoute.routeId, routeName: originRoute.name },
              stop2: { ...destinationStop, routeId: destinationRoute.routeId, routeName: destinationRoute.name },
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
    console.log('Finding multi-leg journey options:', {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destinationLat, lng: destinationLng }
    });

    // Step 1: Filter routes to those with drivers in the journey area (performance optimization)
    const routesWithDrivers = await getRoutesWithAvailableDrivers(
      ctx,
      originLat,
      originLng,
      destinationLat,
      destinationLng
    );

    console.log(`Found ${routesWithDrivers.length} routes with drivers available in journey area`);

    if (routesWithDrivers.length < 2) {
      return {
        success: false,
        journeyOptions: [],
        message: "Insufficient routes with available drivers for multi-leg journey",
        searchCriteria: {
          origin: { latitude: originLat, longitude: originLng },
          destination: { latitude: destinationLat, longitude: destinationLng },
          maxWalkingDistance,
          maxTransferDistance,
        }
      };
    }

    // Step 2: Find transfer points between filtered routes (pure journey planning)
    const transferPoints = await findTransferPoints(
      ctx,
      routesWithDrivers,
      maxTransferDistance,
      originLat,
      originLng,
      destinationLat,
      destinationLng
    );

    console.log(`Found ${transferPoints.length} potential transfer points`);

    // Log the transfer points for debugging
    if (transferPoints.length > 0) {
      console.log('Transfer points found:', transferPoints.map(tp => ({
        route1: tp.stop1.routeName,
        route2: tp.stop2.routeName,
        stop1: tp.stop1.name,
        stop2: tp.stop2.name,
        walkingDistance: tp.walkingDistance.toFixed(3) + 'km'
      })));
    }

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
      console.log(`Processing transfer: ${transferPoint.stop1.name} → ${transferPoint.stop2.name}`);

      // Get route details for both legs from filtered routes
      const route1 = routesWithDrivers.find(r => r.routeId === transferPoint.stop1.routeId);
      const route2 = routesWithDrivers.find(r => r.routeId === transferPoint.stop2.routeId);

      if (!route1 || !route2) {
        console.log(`Route not found: route1=${!!route1}, route2=${!!route2}`);
        continue;
      }

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

      console.log(`Origin candidates (${route1.name}): ${originCandidates.length}, Destination candidates (${route2.name}): ${destinationCandidates.length}`);

      if (originCandidates.length === 0 || destinationCandidates.length === 0) {
        console.log(`Insufficient candidates: origin=${originCandidates.length}, dest=${destinationCandidates.length}`);
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

    console.log(`Found ${sortedOptions.length} valid multi-leg journey options`);

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
    console.error("Error in findMultiLegJourneyOptions:", error);
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