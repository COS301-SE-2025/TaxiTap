/**
 * queries.ts
 * 
 * Convex queries for route data retrieval and management.
 * Provides functions for fetching routes, stops, and driver assignments.
 * 
 * @author Moyahabo Hamese
 */

import { query } from "../../_generated/server";
import { v } from "convex/values";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if a location matches a route point
 * Performs case-insensitive substring matching
 * 
 * @param routePoint - Route point name
 * @param searchPoint - Search term
 * @returns True if locations match
 */
function locationMatches(routePoint: string, searchPoint: string): boolean {
  const routeLower = routePoint.toLowerCase();
  const searchLower = searchPoint.toLowerCase();
  
  return routeLower.includes(searchLower) || searchLower.includes(routeLower);
}

/**
 * Parses route names into start and destination components
 * Expects route names in format "Start - Destination"
 * 
 * @param routeName - Route name to parse
 * @returns Object with start and destination locations
 */
function parseRouteName(routeName: string) {
  const parts = routeName.split(' to ');
  return {
    start: parts[0]?.trim() || '',
    destination: parts[1]?.trim() || ''
  };
}

// ============================================================================
// ROUTE STOPS QUERIES
// ============================================================================

/**
 * Gets route stops with enrichment fallback
 * First attempts to get enriched stops, falls back to original stops if not available
 * 
 * @param routeId - ID of the route to get stops for
 * @returns Object containing stops and enrichment status
 * @throws Error if route not found
 */
export const getRouteStopsWithEnrichment = query({
  args: { routeId: v.string() },
  handler: async (ctx, { routeId }) => {
    // First, try to get enriched stops
    const enrichedRoute = await ctx.db
      .query("enrichedRouteStops")
      .withIndex("by_route_id", (q) => q.eq("routeId", routeId))
      .unique();

    if (enrichedRoute) {
      console.log(`Found enriched stops for route ${routeId}`);
      return {
        stops: enrichedRoute.stops,
        isEnriched: true,
        updatedAt: enrichedRoute.updatedAt,
      };
    }

    // Fallback to original route stops
    const originalRoute = await ctx.db
      .query("routes")
      .withIndex("by_route_id", (q) => q.eq("routeId", routeId))
      .unique();

    if (!originalRoute) {
      throw new Error(`Route ${routeId} not found`);
    }

    console.log(`Using original stops for route ${routeId}`);
    return {
      stops: originalRoute.stops,
      isEnriched: false,
      updatedAt: null,
    };
  },
});

// ============================================================================
// ROUTE LISTING QUERIES
// ============================================================================

/**
 * Gets all routes with enrichment status(cleaned up stops)
 * Returns routes with a flag indicating whether enriched stops are available
 * 
 * @returns Array of routes with enrichment status(cleaned up stops)
 */
export const getAllRoutesWithEnrichmentStatus = query({
  args: {},
  handler: async (ctx) => {
    const routes = await ctx.db.query("routes").collect();
    const enrichedRoutes = await ctx.db.query("enrichedRouteStops").collect();
    
    const enrichedRouteIds = new Set(enrichedRoutes.map(r => r.routeId));
    
    return routes.map(route => ({
      ...route,
      hasEnrichedStops: enrichedRouteIds.has(route.routeId),
    }));
  },
});

/**
 * Gets all available routes for passengers to browse
 * Returns only active routes with processed information
 * 
 * @returns Array of available routes sorted by start location
 */
export const getAllAvailableRoutesForPassenger = query({
  handler: async (ctx) => {
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    return routes.map(route => {
      const { start, destination } = parseRouteName(route.name);
      const sortedStops = route.stops.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
      
      return {
        routeId: route.routeId,
        routeName: route.name,
        start,
        destination,
        taxiAssociation: route.taxiAssociation,
        fare: route.fare,
        estimatedDuration: route.estimatedDuration,
        stops: sortedStops,
        totalStops: sortedStops.length
      };
    }).sort((a, b) => a.start.localeCompare(b.start));
  },
});

/**
 * Gets routes filtered by taxi association for passengers
 * Returns only active routes from the specified association
 * 
 * @param taxiAssociation - Taxi association name to filter by
 * @returns Array of routes for the specified association
 */
export const getRoutesByTaxiAssociationForPassenger = query({
  args: { taxiAssociation: v.string() },
  handler: async (ctx, args) => {
    const routes = await ctx.db
      .query("routes")
      .filter((q) => 
        q.and(
          q.eq(q.field("taxiAssociation"), args.taxiAssociation),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();
    
    return routes.map(route => {
      const { start, destination } = parseRouteName(route.name);
      const sortedStops = route.stops.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
      
      return {
        routeId: route.routeId,
        routeName: route.name,
        start,
        destination,
        taxiAssociation: route.taxiAssociation,
        fare: route.fare,
        estimatedDuration: route.estimatedDuration,
        stops: sortedStops,
        totalStops: sortedStops.length
      };
    });
  },
});

// ============================================================================
// ROUTE DETAIL QUERIES
// ============================================================================

/**
 * Gets detailed route information including active drivers
 * Provides comprehensive route data with driver information
 * 
 * @param routeId - ID of the route to get details for
 * @returns Object containing route details and active drivers
 */
export const getRouteDetailsWithDrivers = query({
  args: { routeId: v.string() },
  handler: async (ctx, args) => {
    // Get the route
    const route = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("routeId"), args.routeId))
      .first();
    
    if (!route) {
      return {
        success: false,
        message: "Route not found",
        route: null,
        activeDrivers: []
      };
    }
    
    // Get drivers assigned to this route
    const driversOnRoute = await ctx.db
      .query("drivers")
      .filter((q) => q.eq(q.field("assignedRoute"), route._id))
      .collect();
    
    // Get user details for the drivers
    const activeDrivers = await Promise.all(
      driversOnRoute.map(async (driver) => {
        const user = await ctx.db.get(driver.userId);
        return {
          driverId: driver.userId,
          driverName: user?.name || "Unknown",
          averageRating: driver.averageRating,
          totalRides: driver.numberOfRidesCompleted,
          isActive: user?.isActive || false
        };
      })
    );
    
    const { start, destination } = parseRouteName(route.name);
    const sortedStops = route.stops.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
    
    return {
      success: true,
      route: {
        routeId: route.routeId,
        routeName: route.name,
        start,
        destination,
        taxiAssociation: route.taxiAssociation,
        fare: route.fare,
        estimatedDuration: route.estimatedDuration,
        stops: sortedStops,
        geometry: route.geometry,
        totalStops: sortedStops.length,
        isActive: route.isActive
      },
      activeDrivers: activeDrivers.filter(driver => driver.isActive),
      message: `Route details retrieved successfully`
    };
  },
});

// ============================================================================
// DRIVER ASSIGNMENT QUERIES
// ============================================================================

/**
 * Gets a driver's assigned route
 * Returns the route object if the driver has an assigned route
 * 
 * @param userId - Driver's user ID
 * @returns Route object or null if no assignment
 */
export const getDriverAssignedRoute = query({
  args: { userId: v.id("taxiTap_users") },
  handler: async (ctx, args) => {
    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!driver || !driver.assignedRoute) {
      return null;
    }

    const route = await ctx.db.get(driver.assignedRoute);
    return route;
  },
});

/**
 * Gets all unique taxi associations
 * Returns a sorted list of all taxi associations in the system
 * 
 * @returns Array of unique taxi association names
 */
export const getAllTaxiAssociations = query({
  args: {},
  handler: async (ctx) => {
    const routes = await ctx.db.query("routes").collect();
    const associations = new Set<string>();
    
    routes.forEach(route => {
      if (route.taxiAssociation) {
        associations.add(route.taxiAssociation);
      }
    });
    
    return Array.from(associations).sort();
  },
}); 