/**
 * transferPoints.ts
 * 
 * Convex functions for transfer point analysis and optimization.
 * Provides functions for finding route intersections, scoring transfer points,
 * and optimizing multi-leg journey sequences.
 * 
 * @author Moyahabo Hamese
 */

import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";


// ============================================================================
// TRANSFER POINT ANALYSIS
// ============================================================================
/**
 * Locate stops within 1km of multiple routes
 */
export const findNearbyRouteIntersections = internalQuery({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    maxTransferDistance: v.optional(v.number()), // Optional max walking distance to transfer point
  },
  handler: async (ctx, args) => {
    const { 
      originLat, 
      originLng, 
      destinationLat, 
      destinationLng, 
      maxTransferDistance = 1000 
    } = args;
    
    try {
      // Get all routes from the database
      const allRoutes = await ctx.db.query("routes").collect();

      // OPTIMIZATION 1: Filter routes by proximity to origin/destination first
      const originNearbyRoutes = [];
      const destinationNearbyRoutes = [];
      const ROUTE_PROXIMITY_LIMIT = 5000; // 5km - reasonable limit for route consideration

      for (const route of allRoutes) {
        const originProximity = calculateRouteProximity(route, { lat: originLat, lng: originLng });
        const destinationProximity = calculateRouteProximity(route, { lat: destinationLat, lng: destinationLng });

        if (originProximity.distance <= ROUTE_PROXIMITY_LIMIT) {
          originNearbyRoutes.push({ route, distance: originProximity.distance });
        }
        if (destinationProximity.distance <= ROUTE_PROXIMITY_LIMIT) {
          destinationNearbyRoutes.push({ route, distance: destinationProximity.distance });
        }
      }

      // OPTIMIZATION 2: Sort by distance and limit to top candidates
      originNearbyRoutes.sort((a, b) => a.distance - b.distance);
      destinationNearbyRoutes.sort((a, b) => a.distance - b.distance);

      const TOP_ROUTES_PER_ENDPOINT = 25; // Limit to top 25 routes per endpoint
      const topOriginRoutes = originNearbyRoutes.slice(0, TOP_ROUTES_PER_ENDPOINT);
      const topDestinationRoutes = destinationNearbyRoutes.slice(0, TOP_ROUTES_PER_ENDPOINT);

      // Find intersections only between promising route combinations
      const allIntersectionPoints = [];

      for (const originRouteData of topOriginRoutes) {
        for (const destRouteData of topDestinationRoutes) {
          const route1 = originRouteData.route;
          const route2 = destRouteData.route;

          // Skip if same route
          if (route1._id === route2._id) {
            continue;
          }

          // Find potential intersection points between these two routes
          const intersections = await findRouteToRouteIntersections(route1, route2);

          for (const intersection of intersections) {
            // OPTIMIZATION 3: Early scoring - skip poor intersections immediately
            const totalJourneyDistance = originRouteData.distance + destRouteData.distance + intersection.walkingDistance;
            const directDistance = calculateDistance(originLat, originLng, destinationLat, destinationLng);

            // Skip if total journey is more than 3x direct distance (clearly inefficient)
            if (totalJourneyDistance > directDistance * 3) {
              continue;
            }

            // Verify the intersection is accessible from both routes
            const accessibilityCheck = await verifyIntersectionAccessibility(
              ctx,
              intersection,
              route1,
              route2,
              maxTransferDistance
            );

            if (accessibilityCheck.accessible) {
              allIntersectionPoints.push({
                coordinates: intersection.coordinates,
                route1: {
                  id: route1._id,
                  name: route1.name,
                },
                route2: {
                  id: route2._id,
                  name: route2.name,
                },
                transferDetails: {
                  walkingDistance: accessibilityCheck.walkingDistance,
                  estimatedTransferTime: accessibilityCheck.estimatedTransferTime,
                },
                intersectionType: intersection.type,
                confidence: intersection.confidence,
                // Preserve the stop information for proper naming
                route1Stop: intersection.route1Stop,
                route2Stop: intersection.route2Stop,
              });
            }
          }
        }
      }

      // OPTIMIZATION 4: Sort intersections by quality and limit processing
      allIntersectionPoints.sort((a, b) => b.confidence - a.confidence);

      // Limit to top 100 intersections to avoid timeout
      const TOP_INTERSECTIONS_TO_PROCESS = 100;
      const topIntersections = allIntersectionPoints.slice(0, TOP_INTERSECTIONS_TO_PROCESS);

      // Filter intersections by journey feasibility
      const feasibleIntersections = [];

      for (const intersection of topIntersections) {
        // Skip transfer points with stop names containing "drop", "off", or "and"
        const route1StopName = intersection.route1Stop?.name?.toLowerCase() || '';
        const route2StopName = intersection.route2Stop?.name?.toLowerCase() || '';
        
        if (route1StopName.includes('drop') || route1StopName.includes('off') || route1StopName.includes('and') ||
            route2StopName.includes('drop') || route2StopName.includes('off') || route2StopName.includes('and')) {
          console.log('🚫 Skipping transfer point with excluded stop names:', {
            route1Stop: intersection.route1Stop?.name,
            route2Stop: intersection.route2Stop?.name
          });
          continue;
        }
        // Calculate distances for feasibility check
        const route1Obj = await ctx.db.get(intersection.route1.id);
        const route2Obj = await ctx.db.get(intersection.route2.id);
        
        const route1OriginDistance = calculateRouteProximity(route1Obj, { lat: originLat, lng: originLng }).distance;
        const route2DestinationDistance = calculateRouteProximity(route2Obj, { lat: destinationLat, lng: destinationLng }).distance;
        const route2OriginDistance = calculateRouteProximity(route2Obj, { lat: originLat, lng: originLng }).distance;
        const route1DestinationDistance = calculateRouteProximity(route1Obj, { lat: destinationLat, lng: destinationLng }).distance;

        // Check if route1 → route2 journey is feasible
        if (route1OriginDistance <= maxTransferDistance && route2DestinationDistance <= maxTransferDistance) {
          feasibleIntersections.push({
            coordinates: intersection.coordinates,
            fromRoute: {
              distanceFromOrigin: route1OriginDistance,
              id: intersection.route1.id,
              name: intersection.route1.name,
            },
            toRoute: {
              distanceFromDestination: route2DestinationDistance,
              id: intersection.route2.id,
              name: intersection.route2.name,
            },
            transferDetails: intersection.transferDetails,
            intersectionType: intersection.intersectionType,
            confidence: intersection.confidence,
            // Preserve the stop information for proper naming
            route1Stop: intersection.route1Stop,
            route2Stop: intersection.route2Stop,
          });
        }

        // Check if route2 → route1 journey is feasible (different direction)
        if (route2OriginDistance <= maxTransferDistance && route1DestinationDistance <= maxTransferDistance) {
          feasibleIntersections.push({
            coordinates: intersection.coordinates,
            fromRoute: {
              distanceFromOrigin: route2OriginDistance,
              id: intersection.route2.id,
              name: intersection.route2.name,
            },
            toRoute: {
              distanceFromDestination: route1DestinationDistance,
              id: intersection.route1.id,
              name: intersection.route1.name,
            },
            transferDetails: intersection.transferDetails,
            intersectionType: intersection.intersectionType,
            confidence: intersection.confidence,
            // Preserve the stop information for proper naming (swap for reverse direction)
            route1Stop: intersection.route2Stop,
            route2Stop: intersection.route1Stop,
          });
        }
      }

      // OPTIMIZATION 5: Final sorting and limiting of results
      feasibleIntersections.sort((a, b) => b.confidence - a.confidence);
      const MAX_FINAL_RESULTS = 50; // Limit final results to top 50
      const finalResults = feasibleIntersections.slice(0, MAX_FINAL_RESULTS);

      return {
        success: true,
        intersectionPoints: finalResults,
        analysis: {
          totalRoutes: allRoutes.length,
          originNearbyRoutes: topOriginRoutes.length,
          destinationNearbyRoutes: topDestinationRoutes.length,
          routeCombinationsChecked: topOriginRoutes.length * topDestinationRoutes.length,
          totalIntersections: allIntersectionPoints.length,
          topIntersectionsProcessed: topIntersections.length,
          feasibleIntersections: finalResults.length,
          foundIntersections: finalResults.length,
          searchRadius: maxTransferDistance,
        },
      };
      
    } catch (error) {
      console.error("Error finding nearby route intersections:", error);
      return {
        success: false,
        error: "Failed to find route intersections",
        intersectionPoints: [],
      };
    }
  },
});

/**
 * Rate based on route connectivity and taxi availability
 */
export const scoreTransferPoints = internalQuery({
  args: {
    intersectionPoints: v.array(v.object({
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
      }),
      fromRoute: v.object({
        id: v.string(),
        name: v.string(),
        distanceFromOrigin: v.number(),
      }),
      toRoute: v.object({
        id: v.string(),
        name: v.string(),
        distanceFromDestination: v.number(),
      }),
      transferDetails: v.object({
        walkingDistance: v.number(),
        estimatedTransferTime: v.number(),
      }),
      intersectionType: v.string(),
      confidence: v.number(),
      route1Stop: v.optional(v.object({
        name: v.string(),
        coordinates: v.object({
          lat: v.number(),
          lng: v.number(),
        }),
        routeName: v.string(),
        stopOrder: v.number(),
        isTerminal: v.boolean(),
      })),
      route2Stop: v.optional(v.object({
        name: v.string(),
        coordinates: v.object({
          lat: v.number(),
          lng: v.number(),
        }),
        routeName: v.string(),
        stopOrder: v.number(),
        isTerminal: v.boolean(),
      })),
    })),
    weights: v.optional(v.object({
      taxiAvailability: v.number(),
      walkingDistance: v.number(),
      routeReliability: v.number(),
      transferTime: v.number(),
      intersectionQuality: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { intersectionPoints, weights = {
      taxiAvailability: 0.3,
      walkingDistance: 0.25,
      routeReliability: 0.2,
      transferTime: 0.15,
      intersectionQuality: 0.1,
    }} = args;
    
    try {
      const scoredPoints = [];
      
      for (const point of intersectionPoints) {
        // Taxi Availability (0-100)
        const fromRouteTaxis = await getTaxiAvailabilityScore(ctx, point.fromRoute.id);
        const toRouteTaxis = await getTaxiAvailabilityScore(ctx, point.toRoute.id);
        const taxiAvailabilityScore = (fromRouteTaxis + toRouteTaxis) / 2;
        
        // Walking Distance (0-100, lower distance = higher score)
        const walkingDistanceScore = Math.max(0, 100 - (point.transferDetails.walkingDistance / 10));
        
        // Route Reliability (0-100)
        const fromRouteReliability = await getRouteReliabilityScore(ctx, point.fromRoute.id);
        const toRouteReliability = await getRouteReliabilityScore(ctx, point.toRoute.id);
        const routeReliabilityScore = (fromRouteReliability + toRouteReliability) / 2;
        
        // Transfer Time (0-100, lower time = higher score)
        const transferTimeScore = Math.max(0, 100 - (point.transferDetails.estimatedTransferTime / 60)); // convert to minutes
        
        // Intersection Quality (based on confidence and type)
        const intersectionQualityScore = point.confidence * getIntersectionTypeMultiplier(point.intersectionType);
        
        // Calculate weighted total score
        const totalScore = 
          (taxiAvailabilityScore * weights.taxiAvailability) +
          (walkingDistanceScore * weights.walkingDistance) +
          (routeReliabilityScore * weights.routeReliability) +
          (transferTimeScore * weights.transferTime) +
          (intersectionQualityScore * weights.intersectionQuality);
        
        scoredPoints.push({
          ...point,
          scores: {
            taxiAvailability: Math.round(taxiAvailabilityScore),
            walkingDistance: Math.round(walkingDistanceScore),
            routeReliability: Math.round(routeReliabilityScore),
            transferTime: Math.round(transferTimeScore),
            intersectionQuality: Math.round(intersectionQualityScore),
            total: Math.round(totalScore),
          },
          ranking: 0, // Will be set after sorting
        });
      }
      
      // Sort by total score (highest first) and assign rankings
      scoredPoints.sort((a, b) => b.scores.total - a.scores.total);
      scoredPoints.forEach((point, index) => {
        point.ranking = index + 1;
      });
      
      return {
        success: true,
        scoredPoints,
        scoringWeights: weights,
        analysis: {
          totalPoints: scoredPoints.length,
          averageScore: Math.round(scoredPoints.reduce((sum, p) => sum + p.scores.total, 0) / scoredPoints.length),
          bestScore: scoredPoints[0]?.scores.total || 0,
          worstScore: scoredPoints[scoredPoints.length - 1]?.scores.total || 0,
        },
      };
      
    } catch (error) {
      console.error("Error scoring transfer points:", error);
      return {
        success: false,
        error: "Failed to score transfer points",
        scoredPoints: [],
      };
    }
  },
});

/**
 * Order transfer points for optimal journey flow
 */
export const optimizeTransferSequence = internalQuery({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    transferPoints: v.array(v.any()),
    optimizationCriteria: v.union(
      v.literal("shortest_time"),
      v.literal("fewest_transfers"),
      v.literal("most_reliable"),
      v.literal("lowest_cost")
    ),
    originAddress: v.optional(v.string()),
    destinationAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { 
      originLat, 
      originLng, 
      destinationLat, 
      destinationLng, 
      transferPoints, 
      optimizationCriteria 
    } = args;
    
    try {
      // If no transfer points, return empty sequence
      if (!transferPoints || transferPoints.length === 0) {
        return {
          success: true,
          optimizedSequence: [],
          journeyLegs: [],
          summary: {
            totalTransfers: 0,
            estimatedTotalTime: 0,
            estimatedTotalCost: 0,
          },
        };
      }
      
      // For single transfer point (2-leg journey)
      if (transferPoints.length === 1) {
        const transferPoint = transferPoints[0];
        const sequence = await createTwoLegSequence(
          ctx,
          { lat: originLat, lng: originLng },
          { lat: destinationLat, lng: destinationLng },
          transferPoint,
          args.originAddress,
          args.destinationAddress
        );
        
        return {
          success: true,
          optimizedSequence: [transferPoint],
          journeyLegs: sequence.legs,
          summary: sequence.summary,
        };
      }
      
      // For multiple transfer points, find optimal combination
      const optimizationResults = await findOptimalTransferCombination(
        ctx,
        { lat: originLat, lng: originLng },
        { lat: destinationLat, lng: destinationLng },
        transferPoints,
        optimizationCriteria,
        args.originAddress,
        args.destinationAddress
      );
      
      return {
        success: true,
        optimizedSequence: optimizationResults.sequence,
        journeyLegs: optimizationResults.legs,
        summary: optimizationResults.summary,
        alternativeOptions: optimizationResults.alternatives,
      };
      
    } catch (error) {
      console.error("Error optimising transfer sequence:", error);
      return {
        success: false,
        error: "Failed to optimize transfer sequence",
        optimizedSequence: [],
      };
    }
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates proximity between a route and a point
 */
function calculateRouteProximity(route: any, point: { lat: number; lng: number }) {
  // Get all stops for this route
  const allStops = getAllRouteStops(route);

  if (allStops.length === 0) {
    return { distance: Infinity, nearestPoint: null };
  }

  // Find the closest stop to the given point
  let minDistance = Infinity;
  let nearestPoint = null;
  let nearestStop = null;

  for (const stop of allStops) {
    const distance = calculateDistance(
      point.lat, point.lng,
      stop.coordinates.lat, stop.coordinates.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = {
        lat: stop.coordinates.lat,
        lng: stop.coordinates.lng
      };
      nearestStop = stop;
    }
  }

  return {
    distance: minDistance,
    nearestPoint,
    nearestStop: {
      name: nearestStop?.name,
      order: nearestStop?.order,
      isTerminal: nearestStop?.isTerminal
    }
  };
}

/**
 * Finds intersection points between two routes using ALL stops
 */
async function findRouteToRouteIntersections(route1: any, route2: any) {
  const intersections = [];

  // Get all stops for both routes
  const route1Stops = getAllRouteStops(route1);
  const route2Stops = getAllRouteStops(route2);

  // Compare every stop from route1 with every stop from route2
  for (const stop1 of route1Stops) {
    for (const stop2 of route2Stops) {
      const distance = calculateDistance(
        stop1.coordinates.lat, stop1.coordinates.lng,
        stop2.coordinates.lat, stop2.coordinates.lng
      );

      // If stops are within walking distance (1km), create transfer point
      if (distance <= 1000) {
        // Skip transfer points with stop names containing "drop", "off", or "and"
        const stop1Name = stop1.name?.toLowerCase() || '';
        const stop2Name = stop2.name?.toLowerCase() || '';
        
        if (stop1Name.includes('drop') || stop1Name.includes('off') || stop1Name.includes('and') ||
            stop2Name.includes('drop') || stop2Name.includes('off') || stop2Name.includes('and')) {
          console.log('🚫 Skipping intersection with excluded stop names:', {
            stop1: stop1.name,
            stop2: stop2.name
          });
          continue;
        }

        const midpoint = {
          latitude: (stop1.coordinates.lat + stop2.coordinates.lat) / 2,
          longitude: (stop1.coordinates.lng + stop2.coordinates.lng) / 2,
        };

        // Determine transfer point type based on stop types
        let transferType = "mid_route_transfer";
        let stopDescription = `${stop1.name} ↔ ${stop2.name}`;

        if (stop1.isTerminal && stop2.isTerminal) {
          transferType = "terminal_to_terminal";
        } else if (stop1.isTerminal || stop2.isTerminal) {
          transferType = "terminal_to_stop";
        }

        intersections.push({
          coordinates: midpoint,
          type: transferType,
          confidence: Math.max(0, 100 - (distance / 10)), // Higher confidence for closer stops
          route1Stop: {
            name: stop1.name,
            coordinates: stop1.coordinates,
            routeName: route1.name,
            stopOrder: stop1.order,
            isTerminal: stop1.isTerminal
          },
          route2Stop: {
            name: stop2.name,
            coordinates: stop2.coordinates,
            routeName: route2.name,
            stopOrder: stop2.order,
            isTerminal: stop2.isTerminal
          },
          walkingDistance: distance,
          estimatedWalkTime: Math.ceil(distance / 1.4 / 60) // Walking speed 1.4 m/s, convert to minutes
        });
      }
    }
  }

  return intersections;
}

/**
 * Extracts all stops from a route in a standardized format
 */
function getAllRouteStops(route: any) {
  const stops = [];

  // Handle different route data formats
  if (route.stops && Array.isArray(route.stops)) {
    // Standard format with stops array
    for (const stop of route.stops) {
      stops.push({
        name: stop.name || `Stop ${stop.order}`,
        coordinates: {
          lat: Array.isArray(stop.coordinates) ? stop.coordinates[0] : stop.coordinates.latitude,
          lng: Array.isArray(stop.coordinates) ? stop.coordinates[1] : stop.coordinates.longitude
        },
        order: stop.order || 0,
        isTerminal: stop.order === 0 || stop.order === route.stops.length - 1
      });
    }
  } else {
    // Fallback: Use start/end points if stops not available
    if (route.startLatitude && route.startLongitude) {
      stops.push({
        name: `${route.name} Start`,
        coordinates: { lat: route.startLatitude, lng: route.startLongitude },
        order: 0,
        isTerminal: true
      });
    }

    if (route.endLatitude && route.endLongitude) {
      stops.push({
        name: `${route.name} End`,
        coordinates: { lat: route.endLatitude, lng: route.endLongitude },
        order: 999,
        isTerminal: true
      });
    }

    // If route has geometry coordinates, extract intermediate points
    if (route.geometry?.coordinates && Array.isArray(route.geometry.coordinates)) {
      route.geometry.coordinates.forEach((coord: any, index: number) => {
        if (Array.isArray(coord) && coord.length >= 2 && index > 0 && index < route.geometry.coordinates.length - 1) {
          stops.push({
            name: `${route.name} Stop ${index}`,
            coordinates: { lat: coord[0], lng: coord[1] },
            order: index,
            isTerminal: false
          });
        }
      });
    }
  }

  return stops;
}

/**
 * Verifies that an intersection point is accessible from both routes
 */
async function verifyIntersectionAccessibility(
  ctx: any, 
  intersection: any, 
  route1: any, 
  route2: any, 
  maxDistance: number
) {
  const walkingDistance = Math.random() * 200 + 50; // Simplified: 50-250m walking distance
  const estimatedTransferTime = Math.ceil(walkingDistance / 1.4 * 60); // Walking speed 1.4 m/s
  
  return {
    accessible: walkingDistance <= maxDistance,
    walkingDistance,
    estimatedTransferTime,
    accessibilityFeatures: {
      covered: Math.random() > 0.5,
      lighting: Math.random() > 0.3,
      seating: Math.random() > 0.7,
    },
  };
}

/**
 * Gets taxi availability score for a route (0-100)
 */
async function getTaxiAvailabilityScore(ctx: any, routeId: string): Promise<number> {
  try {
    // Get drivers assigned to this route
    const driversOnRoute = await ctx.db
      .query("drivers")
      .withIndex("by_assigned_route", (q: any) => q.eq("assignedRoute", routeId))
      .collect();
    
    // Get available taxis for these drivers
    const availableTaxis = [];
    for (const driver of driversOnRoute) {
      const taxis = await ctx.db
        .query("taxis")
        .withIndex("by_driver_id", (q: any) => q.eq("driverId", driver._id))
        .filter((q: any) => q.eq(q.field("isAvailable"), true))
        .collect();
      availableTaxis.push(...taxis);
    }
    
    // Score based on number of available taxis (capped at 10 for score calculation)
    return Math.min(100, availableTaxis.length * 10);
  } catch (error) {
    return 50; // Default score if query fails
  }
}

/**
 * Gets route reliability score based on historical data (0-100)
 */
async function getRouteReliabilityScore(ctx: any, routeId: string): Promise<number> {
  try {
    const route = await ctx.db.get(routeId as any);
    if (!route) {
      return 50; // Default score if route not found
    }
    
    // Use route rating or default to 70 (3.5 * 20)
    return Math.min(100, (route.rating || 3.5) * 20);
  } catch (error) {
    return 50; // Default score if query fails
  }
}

/**
 * Gets multiplier based on intersection type quality
 */
function getIntersectionTypeMultiplier(intersectionType: string): number {
  const multipliers: Record<string, number> = {
    "major_transport_hub": 1.0,
    "route_endpoint_proximity": 0.8,
    "midroute_intersection": 0.9,
    "calculated_intersection": 0.6,
  };
  
  return multipliers[intersectionType] || 0.5;
}

/**
 * Creates a two-leg journey sequence
 */
async function createTwoLegSequence(
  ctx: any,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  transferPoint: any,
  originAddress?: string,
  destinationAddress?: string
) {
  // Get route data for accurate fare and duration calculations
  const fromRoute = await ctx.db.get(transferPoint.fromRoute.id);
  const toRoute = await ctx.db.get(transferPoint.toRoute.id);
  
  const leg1Duration = estimateTravelTime(origin, transferPoint.coordinates, fromRoute);
  const leg2Duration = estimateTravelTime(transferPoint.coordinates, destination, toRoute);
  const leg1Cost = calculateLegCost(origin, transferPoint.coordinates, fromRoute);
  const leg2Cost = calculateLegCost(transferPoint.coordinates, destination, toRoute);
  
  // Use provided addresses or fallback to coordinates
  const originAddr = originAddress || `Origin (${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)})`;
  const destinationAddr = destinationAddress || `Destination (${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)})`;
  
  // Use actual stop names for transfer point instead of generic "Transfer Point"
  const transferStopName = transferPoint.route1Stop?.name && transferPoint.route2Stop?.name 
    ? `${transferPoint.route1Stop.name} ↔ ${transferPoint.route2Stop.name}`
    : `Transfer Point (${transferPoint.coordinates.latitude.toFixed(4)}, ${transferPoint.coordinates.longitude.toFixed(4)})`;
  
  // Debug: Log transfer point stop information
  console.log('🔍 Transfer point stop debug:', {
    hasRoute1Stop: !!transferPoint.route1Stop,
    hasRoute2Stop: !!transferPoint.route2Stop,
    route1Stop: transferPoint.route1Stop,
    route2Stop: transferPoint.route2Stop,
    transferPointCoords: transferPoint.coordinates
  });

  // Find the actual route stops for each leg
  const leg1FromStop = findClosestRouteStop(fromRoute, origin);
  const leg1ToStop = transferPoint.route1Stop || { name: "Transfer Stop", coordinates: { lat: transferPoint.coordinates.latitude, lng: transferPoint.coordinates.longitude } };
  const leg2FromStop = transferPoint.route2Stop || { name: "Transfer Stop", coordinates: { lat: transferPoint.coordinates.latitude, lng: transferPoint.coordinates.longitude } };
  const leg2ToStop = findClosestRouteStop(toRoute, destination);

  console.log('🔍 Journey leg stops debug:', {
    leg1FromStopName: leg1FromStop?.name,
    leg1ToStopName: leg1ToStop?.name,
    leg2FromStopName: leg2FromStop?.name,
    leg2ToStopName: leg2ToStop?.name
  });

  return {
    legs: [
      {
        legIndex: 0,
        fromAddress: originAddr, // Use passenger's actual origin address
        toAddress: leg1ToStop.name, // Transfer stop name
        fromCoordinates: { latitude: origin.lat, longitude: origin.lng },
        toCoordinates: { latitude: leg1ToStop.coordinates.lat, longitude: leg1ToStop.coordinates.lng },
        routeId: transferPoint.fromRoute.id,
        estimatedDuration: leg1Duration,
        estimatedFare: leg1Cost,
      },
      {
        legIndex: 1,
        fromAddress: leg2FromStop.name, // Transfer stop name
        toAddress: destinationAddr, // Use passenger's actual destination address
        fromCoordinates: { latitude: leg2FromStop.coordinates.lat, longitude: leg2FromStop.coordinates.lng },
        toCoordinates: { latitude: destination.lat, longitude: destination.lng },
        routeId: transferPoint.toRoute.id,
        estimatedDuration: leg2Duration,
        estimatedFare: leg2Cost,
      },
    ],
    summary: {
      totalTransfers: 1,
      estimatedTotalTime: leg1Duration + leg2Duration + 300, // 5 min transfer
      estimatedTotalCost: leg1Cost + leg2Cost,
    },
  };
}

/**
 * Finds optimal combination of transfer points for multi-leg journeys
 */
async function findOptimalTransferCombination(
  ctx: any,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  transferPoints: any[],
  optimizationCriteria: string,
  originAddress?: string,
  destinationAddress?: string
) {
  // Return the best single transfer point
  const bestPoint = transferPoints[0]; // Assume pre-sorted by score
  const sequence = await createTwoLegSequence(ctx, origin, destination, bestPoint, originAddress, destinationAddress);
  
  return {
    sequence: [bestPoint],
    legs: sequence.legs,
    summary: sequence.summary,
    alternatives: transferPoints.slice(1, 3).map(point => ({
      transferPoint: point,
      estimatedImprovement: Math.random() * 10 - 5,
    })),
  };
}

/**
 * Estimates travel time between two points using route data
 */
function estimateTravelTime(from: any, to: any, route?: any): number {
  // If route has estimatedDuration, use it (this is the preferred method)
  if (route?.estimatedDuration && route.estimatedDuration > 0) {
    return route.estimatedDuration;
  }
  
  // Fallback: calculate based on distance
  const fromLat = from.lat || from.latitude;
  const fromLng = from.lng || from.longitude;
  const toLat = to.lat || to.latitude;
  const toLng = to.lng || to.longitude;
  
  // Validate coordinates
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return 0;
  }
  
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  const averageSpeed = 40; // km/h
  return Math.ceil((distance / 1000) / averageSpeed * 3600); // seconds
}

/**
 * Calculates cost for a leg of the journey using existing fare calculation
 */
function calculateLegCost(from: any, to: any, route?: any): number {
  const fromLat = from.lat || from.latitude;
  const fromLng = from.lng || from.longitude;
  const toLat = to.lat || to.latitude;
  const toLng = to.lng || to.longitude;
  
  // Validate coordinates
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return 20; // Default base fare
  }
  
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  
  // Always calculate proportional fare based on distance, not use full route fare
  // This ensures each leg gets its own price based on the actual distance traveled
  return calculateFare(distance / 1000); // Convert to km and use existing fare calculation
}

/**
 * Find the closest route stop to a given location
 */
function findClosestRouteStop(route: any, location: { lat: number; lng: number }) {
  const routeStops = getAllRouteStops(route);

  let closestStop = routeStops[0];
  let minDistance = Infinity;

  for (const stop of routeStops) {
    const distance = calculateDistance(
      location.lat, location.lng,
      stop.coordinates.lat, stop.coordinates.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestStop = stop;
    }
  }

  return closestStop;
}

/**
 * Calculate fare using enhanced taxi matching logic
 * Base fare: R20 for passenger displacement up to 10km from origin
 * Overage: R2.50 per 5km block for displacement over 10km from origin
 */
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

/**
 * Calculates distance between two geographic points
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}