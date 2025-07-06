/**
 * displayRoutes.ts
 * 
 * Convex functions for displaying and managing route information.
 * Provides queries and actions for route display, 
 * converting from stop coordinates to stop names) etc.
 * 
 * @author Ann-Marí Oberholzer & Moyahabo Hamese 
 * 
 */

import { query, QueryCtx } from "../../_generated/server";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Capitalizes the first letter of each word
 * 
 * @param str - Input string to format
 * @returns Formatted string in title case
 */
const formatRouteName = (str: string): string => {
  if (!str) return str;
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Calculates fare based on estimated duration
 * Pricing: R15 per 10 minutes, minimum R15
 * 
 * @param estimatedDuration - Duration in seconds
 * @returns Calculated fare in Rands
 */
const calculateFare = (estimatedDuration: number): number => {
  if (!estimatedDuration || estimatedDuration <= 0) return 15; // Default minimum fare
  
  // R15 per 10 minutes, minimum R15
  return Math.max(15, Math.ceil(estimatedDuration / 600) * 15);
};

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Gets cleaned up stop name from coordinates using reverse geocoding
 * Falls back to "Unnamed Stop" if geocoding fails
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Stop name(from coordinates)
 */
export const getEnrichedStopName = action({
  args: {
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (ctx, { lat, lon }) => {
    try {
      const reverseGeocodeModule = internal.functions.routes.reverseGeocode as any;
      return await ctx.runAction(reverseGeocodeModule.getReadableStopName, { lat, lon });
    } catch (error) {
      console.error(`Failed to get enriched stop name for ${lat},${lon}:`, error);
      return "Unnamed Stop";
    }
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Gets cleaned up stops for a specific route
 * Filters out stops without meaningful names e.g. DROP OFF, N/A, etc.
 * 
 * @param routeId - ID of the route to get stops for
 * @returns Array of cleaned up stop objects
 */
export const getEnrichedStopsForRoute = query({
  args: { routeId: v.string() },
  handler: async (ctx, { routeId }) => {
    const enrichedStops = await ctx.db
      .query("enrichedRouteStops")
      .filter((q) => q.eq(q.field("routeId"), routeId))
      .first();
    
    if (!enrichedStops || !enrichedStops.stops || enrichedStops.stops.length === 0) {
      return [];
    }
    
    // Filter out stops that don't have meaningful names
    return enrichedStops.stops.filter((stop: any) => {
      return stop.name && 
             stop.name.trim() !== '' && 
             !stop.name.toLowerCase().includes('stop') &&
             !stop.name.toLowerCase().includes('bus stop') &&
             stop.name.length > 3;
    });
  },
});

/**
 * Core route display handler
 * Processes routes and extracts coordinate information
 * 
 * @param db - Database context
 * @returns Array of processed route objects
 */
export const displayRoutesHandler = async ({ db }: QueryCtx) => {
  const routes = await db.query("routes").collect();

  return routes.map(route => {
    const parts = route.name?.split("-").map(part => part.trim()) ?? ["Unknown", "Unknown"];
    const geometry = route.geometry;

    // Safely extract coordinates
    const coordinates = geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return {
        routeId: route.routeId,
        start: formatRouteName(parts[0]) ?? "Unknown",
        destination: formatRouteName(parts[1]) ?? "Unknown",
        startCoords: null,
        destinationCoords: null,
        stops: [], // No stops available
        fare: 15, // Default fare
        estimatedDuration: route.estimatedDuration,
        taxiAssociation: route.taxiAssociation,
        hasStops: false, // Flag to indicate no stops
      };
    }

    const firstCoord = coordinates[0];
    const lastCoord = coordinates[coordinates.length - 1];

    if (!Array.isArray(firstCoord) || firstCoord.length < 2 || !Array.isArray(lastCoord) || lastCoord.length < 2) {
      return {
        routeId: route.routeId,
        start: formatRouteName(parts[0]) ?? "Unknown",
        destination: formatRouteName(parts[1]) ?? "Unknown",
        startCoords: null,
        destinationCoords: null,
        stops: [], // No stops available
        fare: 15, // Default fare
        estimatedDuration: route.estimatedDuration,
        taxiAssociation: route.taxiAssociation,
        hasStops: false, // Flag to indicate no stops
      };
    }

    const [startLatitude, startLongitude] = firstCoord;
    const [destLatitude, destLongitude] = lastCoord;

    const startCoords = {
      latitude: startLatitude,
      longitude: startLongitude,
    };

    const destinationCoords = {
      latitude: destLatitude,
      longitude: destLongitude,
    };

    // It currently returns empty stops - the passengeroute 
    // page will need to call getEnrichedStopsForRoute separately
    const processedStops: any[] = [];
    const hasStops = false;

    return {
      routeId: route.routeId,
      start: formatRouteName(parts[0]) ?? "Unknown",
      destination: formatRouteName(parts[1]) ?? "Unknown",
      startCoords,
      destinationCoords,
      stops: processedStops,
      fare: calculateFare(route.estimatedDuration),
      estimatedDuration: route.estimatedDuration,
      taxiAssociation: route.taxiAssociation,
      hasStops, // Flag to indicate if stops are available
    };
  });
};

/**
 * Displays the number of pages
 * Returns routes with pagination metadata
 * 
 * @param page - Current page number (default: 1)
 * @param limit - Number of routes per page (default: 10)
 * @returns Object containing routes and pagination information
 */
export const displayRoutesPaginated = query({
  args: { 
    page: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { page = 1, limit = 10 }) => {
    const allRoutes = await displayRoutesHandler(ctx);
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRoutes = allRoutes.slice(startIndex, endIndex);
    
    return {
      routes: paginatedRoutes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(allRoutes.length / limit),
        totalRoutes: allRoutes.length,
        hasNextPage: endIndex < allRoutes.length,
        hasPrevPage: page > 1,
        limit
      }
    };
  }
});

/**
 * Main route display query
 * Returns all available routes with processed information
 */
export const displayRoutes = query(displayRoutesHandler);