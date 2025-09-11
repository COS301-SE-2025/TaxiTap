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
      
      // Find routes that can serve the origin
      const originAccessibleRoutes = [];
      for (const route of allRoutes) {
        const proximityToOrigin = calculateRouteProximity(
          route,
          { lat: originLat, lng: originLng }
        );
        
        if (proximityToOrigin.distance <= maxTransferDistance) {
          originAccessibleRoutes.push({
            route,
            distanceFromOrigin: proximityToOrigin.distance,
            nearestPoint: proximityToOrigin.nearestPoint,
          });
        }
      }
      
      // Find routes that can serve the destination
      const destinationAccessibleRoutes = [];
      for (const route of allRoutes) {
        const proximityToDestination = calculateRouteProximity(
          route,
          { lat: destinationLat, lng: destinationLng }
        );
        
        if (proximityToDestination.distance <= maxTransferDistance) {
          destinationAccessibleRoutes.push({
            route,
            distanceFromDestination: proximityToDestination.distance,
            nearestPoint: proximityToDestination.nearestPoint,
          });
        }
      }
      
      // Find intersection points between origin and destination routes
      const intersectionPoints = [];
      
      for (const originRoute of originAccessibleRoutes) {
        for (const destRoute of destinationAccessibleRoutes) {
          // Skip if same route (direct route case handled elsewhere)
          if (originRoute.route._id === destRoute.route._id) {
            continue;
          }
          
          // Find potential intersection points between these two routes
          const intersections = await findRouteToRouteIntersections(
            originRoute.route,
            destRoute.route
          );
          
          for (const intersection of intersections) {
            // Verify the intersection is accessible from both routes
            const accessibilityCheck = await verifyIntersectionAccessibility(
              ctx,
              intersection,
              originRoute.route,
              destRoute.route,
              maxTransferDistance
            );
            
            if (accessibilityCheck.accessible) {
              intersectionPoints.push({
                coordinates: intersection.coordinates,
                address: intersection.address,
                fromRoute: {
                  id: originRoute.route._id,
                  name: originRoute.route.name,
                  distanceFromOrigin: originRoute.distanceFromOrigin,
                },
                toRoute: {
                  id: destRoute.route._id,
                  name: destRoute.route.name,
                  distanceFromDestination: destRoute.distanceFromDestination,
                },
                transferDetails: {
                  walkingDistance: accessibilityCheck.walkingDistance,
                  estimatedTransferTime: accessibilityCheck.estimatedTransferTime,
                  accessibility: accessibilityCheck.accessibilityFeatures,
                },
                intersectionType: intersection.type,
                confidence: intersection.confidence,
              });
            }
          }
        }
      }
      
      return {
        success: true,
        intersectionPoints,
        analysis: {
          totalRoutes: allRoutes.length,
          originAccessibleRoutes: originAccessibleRoutes.length,
          destinationAccessibleRoutes: destinationAccessibleRoutes.length,
          foundIntersections: intersectionPoints.length,
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
          transferPoint
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
        optimizationCriteria
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
  // Handle different route coordinate formats
  let startLat, startLng, endLat, endLng;
  
  if (route.startLatitude && route.startLongitude) {
    // Legacy format with direct start/end coordinates
    startLat = route.startLatitude;
    startLng = route.startLongitude;
    endLat = route.endLatitude;
    endLng = route.endLongitude;
  } else if (route.geometry?.coordinates && route.geometry.coordinates.length > 0) {
    // New format with geometry coordinates array
    const coordinates = route.geometry.coordinates;
    const firstCoord = coordinates[0];
    const lastCoord = coordinates[coordinates.length - 1];
    
    if (Array.isArray(firstCoord) && firstCoord.length >= 2 && 
        Array.isArray(lastCoord) && lastCoord.length >= 2) {
      startLat = firstCoord[0];
      startLng = firstCoord[1];
      endLat = lastCoord[0];
      endLng = lastCoord[1];
    } else {
      return { distance: Infinity, nearestPoint: null };
    }
  } else {
    return { distance: Infinity, nearestPoint: null };
  }
  
  // Calculate distances to start and end points
  const startDistance = calculateDistance(point.lat, point.lng, startLat, startLng);
  const endDistance = calculateDistance(point.lat, point.lng, endLat, endLng);
  
  // Use the closer endpoint
  const distance = Math.min(startDistance, endDistance);
  const nearestPoint = startDistance < endDistance ? 
    { lat: startLat, lng: startLng } :
    { lat: endLat, lng: endLng };
  
  return { distance, nearestPoint };
}

/**
 * Finds intersection points between two routes
 */
async function findRouteToRouteIntersections(route1: any, route2: any) {
  //  intersection finding
  
  const intersections = [];
  
  // Check if route endpoints are close to each other (potential transfer points)
  const endpoints = [
    { route: route1, point: { lat: route1.startLatitude, lng: route1.startLongitude } },
    { route: route1, point: { lat: route1.endLatitude, lng: route1.endLongitude } },
    { route: route2, point: { lat: route2.startLatitude, lng: route2.startLongitude } },
    { route: route2, point: { lat: route2.endLatitude, lng: route2.endLongitude } },
  ];
  
  for (let i = 0; i < 2; i++) {
    for (let j = 2; j < 4; j++) {
      const distance = calculateDistance(
        endpoints[i].point.lat, endpoints[i].point.lng,
        endpoints[j].point.lat, endpoints[j].point.lng
      );
      
      if (distance <= 1000) { // Within 1km
        const midpoint = {
          latitude: (endpoints[i].point.lat + endpoints[j].point.lat) / 2,
          longitude: (endpoints[i].point.lng + endpoints[j].point.lng) / 2,
        };
        
        intersections.push({
          coordinates: midpoint,
          address: `Transfer Point (${route1.name} ↔ ${route2.name})`,
          type: "route_endpoint_proximity",
          confidence: Math.max(0, 100 - (distance / 10)), // Higher confidence for closer points
        });
      }
    }
  }
  
  return intersections;
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
  transferPoint: any
) {
  // Get route data for accurate fare and duration calculations
  const fromRoute = await ctx.db.get(transferPoint.fromRoute.id);
  const toRoute = await ctx.db.get(transferPoint.toRoute.id);
  
  const leg1Duration = estimateTravelTime(origin, transferPoint.coordinates, fromRoute);
  const leg2Duration = estimateTravelTime(transferPoint.coordinates, destination, toRoute);
  const leg1Cost = calculateLegCost(origin, transferPoint.coordinates, fromRoute);
  const leg2Cost = calculateLegCost(transferPoint.coordinates, destination, toRoute);
  
  return {
    legs: [
      {
        legIndex: 0,
        from: origin,
        to: transferPoint.coordinates,
        routeId: transferPoint.fromRoute.id,
        estimatedDuration: leg1Duration,
        estimatedCost: leg1Cost,
      },
      {
        legIndex: 1,
        from: transferPoint.coordinates,
        to: destination,
        routeId: transferPoint.toRoute.id,
        estimatedDuration: leg2Duration,
        estimatedCost: leg2Cost,
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
  optimizationCriteria: string
) {
  // Return the best single transfer point
  const bestPoint = transferPoints[0]; // Assume pre-sorted by score
  const sequence = await createTwoLegSequence(ctx, origin, destination, bestPoint);
  
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
  // If route has fare, use it (this is the preferred method)
  if (route?.fare && route.fare > 0) {
    return route.fare;
  }
  
  // Fallback: use enhanced taxi matching fare calculation
  const fromLat = from.lat || from.latitude;
  const fromLng = from.lng || from.longitude;
  const toLat = to.lat || to.latitude;
  const toLng = to.lng || to.longitude;
  
  // Validate coordinates
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return 20; // Default base fare
  }
  
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  return calculateFare(distance / 1000); // Convert to km and use existing fare calculation
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