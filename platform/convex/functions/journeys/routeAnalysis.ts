/**
 * routeAnalysis.ts
 * 
 * Convex functions for route analysis and multi-leg journey planning.
 * Provides functions for analyzing direct routes, finding intersections,
 * and calculating optimal paths for passenger journeys.
 * 
 * @author Moyahabo Hamese
 */

import { query } from "../../_generated/server";
import { v } from "convex/values";

// ============================================================================
// ROUTE ANALYSIS
// ============================================================================
/**
 * Check if single route exists between origin and destination
 */
export const analyzeDirectRouteAvailability = query({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
  },
  handler: async (ctx, args) => {
    const { originLat, originLng, destinationLat, destinationLng } = args;
    
    try {
      // Get all available routes from the database
      const routes = await ctx.db.query("routes").collect();
      
      const proximityThreshold = 1000; // 1km in meters
      const availableRoutes = [];
      
      for (const route of routes) {
        // Check if route passes within proximity of both origin and destination
        const originProximity = await checkRouteProximity(
          route,
          { lat: originLat, lng: originLng },
          proximityThreshold
        );
        
        const destinationProximity = await checkRouteProximity(
          route,
          { lat: destinationLat, 
            lng: destinationLng },
          proximityThreshold
        );
        
        if (originProximity.withinRange && destinationProximity.withinRange) {
          // Check if there are available taxis on this route
          const availableTaxis = await ctx.db
            .query("taxis")
            .withIndex("by_is_available", (q) => q.eq("isAvailable", true))
            .collect();
          
          // Filter taxis whose drivers are assigned to this route
          const routeTaxis = [];
          for (const taxi of availableTaxis) {
            const driver = await ctx.db.get(taxi.driverId);
            if (driver && (driver.activeRoute === route._id || driver.assignedRoute === route._id)) {
              routeTaxis.push(taxi);
            }
          }
          
          if (routeTaxis.length > 0) {
            availableRoutes.push({
              route,
              availableTaxis: routeTaxis.length,
              originDistance: originProximity.distance,
              destinationDistance: destinationProximity.distance,
            });
          }
        }
      }
      
      return {
        hasDirectRoute: availableRoutes.length > 0,
        availableRoutes,
        analysis: {
          totalRoutesChecked: routes.length,
          routesWithinProximity: availableRoutes.length,
        },
      };
    } catch (error) {
      console.error("Error analysing direct route availability:", error);
      return {
        hasDirectRoute: false,
        availableRoutes: [],
        error: "Failed to analyse direct route availability",
      };
    }
  },
});
/**
 * Identify transfer points within 1km of multiple routes
 */
export const findRouteIntersections = query({
    args: {
      originLat: v.number(),
      originLng: v.number(),
      destinationLat: v.number(),
      destinationLng: v.number(),
    },
    handler: async (ctx, args) => {
      const { originLat, originLng, destinationLat, destinationLng } = args;
      
      try {
        const routes = await ctx.db.query("routes").collect();
        const intersections = [];
        const proximityThreshold = 1000; // 1km
        
        // Find routes that can serve origin
        const originRoutes: any[] = [];
        for (const route of routes) {
          const proximity = await checkRouteProximity(
            route,
            { lat: originLat, lng: originLng },
            proximityThreshold
          );
          if (proximity.withinRange) {
            originRoutes.push({ route, distance: proximity.distance });
          }
        }
        
        // Find routes that can serve destination
        const destinationRoutes: any[] = [];
        for (const route of routes) {
          const proximity = await checkRouteProximity(
            route,
            { lat: destinationLat, lng: destinationLng },
            proximityThreshold
          );
          if (proximity.withinRange) {
            destinationRoutes.push({ route, distance: proximity.distance });
          }
        }
        
        // Find intersection points between origin and destination routes
        for (const originRoute of originRoutes) {
          for (const destRoute of destinationRoutes) {
            if (originRoute.route._id !== destRoute.route._id) {
              const intersectionPoints = await findRouteIntersectionPoints(
                originRoute.route,
                destRoute.route
              );
              
              intersections.push(...intersectionPoints.map(point => ({
                ...point,
                fromRoute: originRoute.route,
                toRoute: destRoute.route,
                originDistance: originRoute.distance,
                destinationDistance: destRoute.distance,
              })));
            }
          }
        }
        
        return {
          intersections,
          originRoutes: originRoutes.length,
          destinationRoutes: destinationRoutes.length,
          totalIntersections: intersections.length,
        };
      } catch (error) {
        console.error("Error finding route intersections:", error);
        return {
          intersections: [],
          error: "Failed to find route intersections",
        };
      }
    },
  });
    

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function analyseDirectRouteAvailabilityHandler(ctx: any, args: any) {
  const { originLat, originLng, destinationLat, destinationLng } = args;
  
  try {
    // Get all available routes from the database
    const routes = await ctx.db.query("routes").collect();
    
    const proximityThreshold = 1000; // 1km in meters
    const availableRoutes = [];
    
    for (const route of routes) {
      // Check if route passes within proximity of both origin and destination
      const originProximity = await checkRouteProximity(
        route,
        { lat: originLat, lng: originLng },
        proximityThreshold
      );
      
      const destinationProximity = await checkRouteProximity(
        route,
        { lat: destinationLat, 
          lng: destinationLng },
        proximityThreshold
      );
      
      if (originProximity.withinRange && destinationProximity.withinRange) {
        // Check if there are available taxis on this route
        const availableTaxis = await ctx.db
          .query("taxis")
          .withIndex("by_is_available", (q: any) => q.eq("isAvailable", true))
          .collect();
        
        // Filter taxis whose drivers are assigned to this route
        const routeTaxis = [];
        for (const taxi of availableTaxis) {
          const driver = await ctx.db.get(taxi.driverId);
          if (driver && (driver.activeRoute === route._id || driver.assignedRoute === route._id)) {
            routeTaxis.push(taxi);
          }
        }
        
        if (routeTaxis.length > 0) {
          availableRoutes.push({
            route,
            availableTaxis: routeTaxis.length,
            originDistance: originProximity.distance,
            destinationDistance: destinationProximity.distance,
          });
        }
      }
    }
    
    return {
      hasDirectRoute: availableRoutes.length > 0,
      availableRoutes,
      analysis: {
        totalRoutesChecked: routes.length,
        routesWithinProximity: availableRoutes.length,
      },
    };
  } catch (error) {
    console.error("Error analysing direct route availability:", error);
    return {
      hasDirectRoute: false,
      availableRoutes: [],
      error: "Failed to analyse direct route availability",
    };
  }
}

async function checkRouteProximity(route: any, point: { lat: number; lng: number }, threshold: number) {
  // Check if point is within threshold distance of route
  // Using route stops to determine proximity
  if (!route.stops || route.stops.length === 0) {
    return { withinRange: false, distance: Infinity };
  }
  
  let minDistance = Infinity;
  
  // Check distance to each stop on the route
  for (const stop of route.stops) {
    if (stop.coordinates && stop.coordinates.length >= 2) {
      const stopLat = stop.coordinates[0];
      const stopLng = stop.coordinates[1];
      const distance = calculateDistance(point.lat, point.lng, stopLat, stopLng);
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  return {
    withinRange: minDistance <= threshold,
    distance: minDistance,
  };
}


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