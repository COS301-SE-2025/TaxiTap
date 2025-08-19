/**
 * Enhanced route matching with distance-based calculations
 * Finds the best routes based on proximity to start and end locations
 */

import { query } from "../../_generated/server";
import { v } from "convex/values";

// ============================================================================
// DISTANCE CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find the closest stop in a route to a given location
 * @param stops - Array of route stops
 * @param targetLat - Target latitude
 * @param targetLon - Target longitude
 * @returns Object with closest stop and distance
 */
function findClosestStop(
  stops: Array<{ coordinates: number[]; name: string; order: number; id: string }>,
  targetLat: number,
  targetLon: number
) {
  let closestStop = null;
  let minDistance = Infinity;
  
  for (const stop of stops) {
    const [stopLat, stopLon] = stop.coordinates;
    const distance = calculateDistance(targetLat, targetLon, stopLat, stopLon);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestStop = stop;
    }
  }
  
  return { stop: closestStop, distance: minDistance };
}

/**
 * Calculate route score based on proximity to start and end locations
 * Lower score is better
 * @param route - Route object
 * @param startLat - Start location latitude
 * @param startLon - Start location longitude
 * @param endLat - End location latitude
 * @param endLon - End location longitude
 * @returns Route score object
 */
async function calculateRouteScore(
  ctx: any,
  route: any,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
) {
  // Get enriched stops or fall back to original stops
  const enrichedRoute = await ctx.db
    .query("enrichedRouteStops")
    .withIndex("by_route_id", (q: { eq: (arg0: string, arg1: any) => any; }) => q.eq("routeId", route.routeId))
    .unique();
  
  const stops = enrichedRoute ? enrichedRoute.stops : route.stops;
  
  if (!stops || stops.length === 0) {
    return {
      totalScore: Infinity,
      startProximity: Infinity,
      endProximity: Infinity,
      startStop: null,
      endStop: null,
      hasDirectRoute: false
    };
  }
  
  // Find closest stops to start and end locations
  const closestToStart = findClosestStop(stops, startLat, startLon);
  const closestToEnd = findClosestStop(stops, endLat, endLon);
  
  // Calculate weights (you can adjust these)
  const START_WEIGHT = 0.6; // Prioritize proximity to start location
  const END_WEIGHT = 0.4;   // Secondary priority for end location
  
  const startProximity = closestToStart.distance;
  const endProximity = closestToEnd.distance;
  
  // Total score (lower is better)
  const totalScore = (startProximity * START_WEIGHT) + (endProximity * END_WEIGHT);
  
  // Check if this could be a direct route (start stop comes before end stop)
  const hasDirectRoute = closestToStart.stop && closestToEnd.stop &&
    closestToStart.stop.order < closestToEnd.stop.order;
  
  return {
    totalScore,
    startProximity,
    endProximity,
    startStop: closestToStart.stop,
    endStop: closestToEnd.stop,
    hasDirectRoute
  };
}

// ============================================================================
// ENHANCED ROUTE MATCHING QUERY
// ============================================================================

/**
 * Find the best matching routes based on start and end coordinates
 * Returns routes sorted by proximity and suitability
 */
export const findBestMatchingRoutes = query({
  args: {
    startLat: v.number(),
    startLon: v.number(),
    endLat: v.number(),
    endLon: v.number(),
    maxStartDistance: v.optional(v.number()), // Max distance from start location (km)
    maxEndDistance: v.optional(v.number()),   // Max distance from end location (km)
    maxResults: v.optional(v.number())        // Maximum number of results to return
  },
  handler: async (ctx, {
    startLat,
    startLon,
    endLat,
    endLon,
    maxStartDistance = 2.0,  // Default 5km radius
    maxEndDistance = 8.0,   // Default 10km radius
    maxResults = 10
  }) => {
    try {
      // Get all active routes
      const routes = await ctx.db
        .query("routes")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      
      console.log(`Checking ${routes.length} active routes`);
      
      // Calculate scores for all routes
      const routeScores = await Promise.all(
        routes.map(async (route) => {
          const score = await calculateRouteScore(ctx, route, startLat, startLon, endLat, endLon);
          return {
            route,
            ...score
          };
        })
      );
      
      // Filter routes based on maximum distances
      const validRoutes = routeScores.filter(routeScore => 
        routeScore.startProximity <= maxStartDistance &&
        routeScore.endProximity <= maxEndDistance &&
        routeScore.totalScore < Infinity
      );
      
      console.log(`Found ${validRoutes.length} routes within distance limits`);
      
      // Sort by total score (lower is better) and prioritize direct routes
      const sortedRoutes = validRoutes.sort((a, b) => {
        // Prioritize direct routes
        if (a.hasDirectRoute && !b.hasDirectRoute) return -1;
        if (!a.hasDirectRoute && b.hasDirectRoute) return 1;
        
        // Then sort by total score
        return a.totalScore - b.totalScore;
      });
      
      // Limit results and format output
      const bestRoutes = sortedRoutes.slice(0, maxResults).map(routeScore => {
        const route = routeScore.route;
        
        return {
          routeId: route.routeId,
          routeName: route.name,
          taxiAssociation: route.taxiAssociation,
          fare: route.fare,
          estimatedDuration: route.estimatedDuration,
          
          // Distance information
          startProximity: Math.round(routeScore.startProximity * 100) / 100, // Round to 2 decimal places
          endProximity: Math.round(routeScore.endProximity * 100) / 100,
          totalScore: Math.round(routeScore.totalScore * 100) / 100,
          
          // Closest stops
          closestStartStop: routeScore.startStop ? {
            id: routeScore.startStop.id,
            name: routeScore.startStop.name,
            coordinates: routeScore.startStop.coordinates,
            order: routeScore.startStop.order,
            distanceFromUser: Math.round(routeScore.startProximity * 100) / 100
          } : null,
          
          closestEndStop: routeScore.endStop ? {
            id: routeScore.endStop.id,
            name: routeScore.endStop.name,
            coordinates: routeScore.endStop.coordinates,
            order: routeScore.endStop.order,
            distanceFromDestination: Math.round(routeScore.endProximity * 100) / 100
          } : null,
          
          // Route suitability
          hasDirectRoute: routeScore.hasDirectRoute,
          isRecommended: routeScore.startProximity <= 2.0 && routeScore.hasDirectRoute,
          
          // Additional route info
          totalStops: route.stops.length,
          isActive: route.isActive
        };
      });
      
      return {
        success: true,
        matchingRoutes: bestRoutes,
        totalRoutesChecked: routes.length,
        routesWithinRange: validRoutes.length,
        searchCriteria: {
          startLocation: { latitude: startLat, longitude: startLon },
          endLocation: { latitude: endLat, longitude: endLon },
          maxStartDistance,
          maxEndDistance,
          maxResults
        },
        message: `Found ${bestRoutes.length} matching routes`
      };
      
    } catch (error) {
      console.error("Error in findBestMatchingRoutes:", error);
      return {
        success: false,
        matchingRoutes: [],
        totalRoutesChecked: 0,
        routesWithinRange: 0,
        message: `Error finding routes: ${error}`,
        searchCriteria: {
          startLocation: { latitude: startLat, longitude: startLon },
          endLocation: { latitude: endLat, longitude: endLon },
          maxStartDistance,
          maxEndDistance,
          maxResults
        }
      };
    }
  }
});

// ============================================================================
// ROUTE DETAILS WITH FULL STOPS
// ============================================================================

/**
 * Get detailed route information including all stops with distances
 */
export const getRouteWithStopsDetails = query({
  args: { 
    routeId: v.string(),
    userLat: v.optional(v.number()),
    userLon: v.optional(v.number())
  },
  handler: async (ctx, { routeId, userLat, userLon }) => {
    try {
      // Get the route
      const route = await ctx.db
        .query("routes")
        .withIndex("by_route_id", (q) => q.eq("routeId", routeId))
        .unique();
      
      if (!route) {
        return {
          success: false,
          message: "Route not found",
          route: null
        };
      }
      
      // Get enriched stops or fall back to original stops
      const enrichedRoute = await ctx.db
        .query("enrichedRouteStops")
        .withIndex("by_route_id", (q) => q.eq("routeId", routeId))
        .unique();
      
      const stops = enrichedRoute ? enrichedRoute.stops : route.stops;
      
      // Calculate distances from user location if provided
      const stopsWithDistances = stops.map(stop => {
        const stopData = {
          id: stop.id,
          name: stop.name,
          coordinates: stop.coordinates,
          order: stop.order
        };
        
        if (userLat && userLon) {
          const [stopLat, stopLon] = stop.coordinates;
          const distance = calculateDistance(userLat, userLon, stopLat, stopLon);
          return {
            ...stopData,
            distanceFromUser: Math.round(distance * 100) / 100
          };
        }
        
        return stopData;
      }).sort((a, b) => a.order - b.order);
      
      return {
        success: true,
        route: {
          routeId: route.routeId,
          name: route.name,
          taxiAssociation: route.taxiAssociation,
          fare: route.fare,
          estimatedDuration: route.estimatedDuration,
          isActive: route.isActive,
          stops: stopsWithDistances,
          totalStops: stopsWithDistances.length,
          isEnriched: !!enrichedRoute
        },
        message: "Route details retrieved successfully"
      };
      
    } catch (error) {
      console.error("Error getting route details:", error);
      return {
        success: false,
        message: `Error retrieving route details: ${error}`,
        route: null
      };
    }
  }
});

// ============================================================================
// NEARBY STOPS FINDER
// ============================================================================

/**
 * Find all stops within a certain radius of a location across all routes
 */
export const findNearbyStops = query({
  args: {
    lat: v.number(),
    lon: v.number(),
    radiusKm: v.optional(v.number()),
    maxResults: v.optional(v.number())
  },
  handler: async (ctx, { 
    lat, 
    lon, 
    radiusKm = 2.0, 
    maxResults = 20 
  }) => {
    try {
      const allRoutes = await ctx.db
        .query("routes")
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      
      const nearbyStops: Array<{
        stop: any;
        route: any;
        distance: number;
      }> = [];
      
      // Check all stops in all routes
      for (const route of allRoutes) {
        // Try to get enriched stops first
        const enrichedRoute = await ctx.db
          .query("enrichedRouteStops")
          .withIndex("by_route_id", (q) => q.eq("routeId", route.routeId))
          .unique();
        
        const stops = enrichedRoute ? enrichedRoute.stops : route.stops;
        
        for (const stop of stops) {
          const [stopLat, stopLon] = stop.coordinates;
          const distance = calculateDistance(lat, lon, stopLat, stopLon);
          
          if (distance <= radiusKm) {
            nearbyStops.push({
              stop: {
                id: stop.id,
                name: stop.name,
                coordinates: stop.coordinates,
                order: stop.order
              },
              route: {
                routeId: route.routeId,
                name: route.name,
                taxiAssociation: route.taxiAssociation,
                fare: route.fare
              },
              distance: Math.round(distance * 100) / 100
            });
          }
        }
      }
      
      // Sort by distance and limit results
      const sortedStops = nearbyStops
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults);
      
      return {
        success: true,
        nearbyStops: sortedStops,
        searchLocation: { latitude: lat, longitude: lon },
        radiusKm,
        totalFound: sortedStops.length,
        message: `Found ${sortedStops.length} stops within ${radiusKm}km`
      };
      
    } catch (error) {
      console.error("Error finding nearby stops:", error);
      return {
        success: false,
        nearbyStops: [],
        message: `Error finding nearby stops: ${error}`
      };
    }
  }
});