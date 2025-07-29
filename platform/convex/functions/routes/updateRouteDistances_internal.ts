// convex/functions/updateRouteDistances.ts
import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Function to calculate total distance for a route
function calculateRouteDistance(stops: Array<{
  id: string;
  name: string;
  coordinates: number[];
  order: number;
}>): number {
  if (stops.length < 2) return 0;
  
  // Sort stops by order to ensure correct sequence
  const sortedStops = [...stops].sort((a, b) => a.order - b.order);
  
  let totalDistance = 0;
  
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const currentStop = sortedStops[i];
    const nextStop = sortedStops[i + 1];
    
    // Coordinates are in [latitude, longitude] format
    const [lat1, lon1] = currentStop.coordinates;
    const [lat2, lon2] = nextStop.coordinates;
    
    const segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
    totalDistance += segmentDistance;
  }
  
  return Math.round(totalDistance * 100) / 100; // Round to 2 decimal places
}

// Mutation to update estimated distance for a specific route
export const updateRouteDistance = mutation({
  args: {
    routeId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the route by routeId
    const route = await ctx.db
      .query("routes")
      .withIndex("by_route_id", (q) => q.eq("routeId", args.routeId))
      .first();
    
    if (!route) {
      throw new Error(`Route with ID ${args.routeId} not found`);
    }
    
    // Calculate the estimated distance
    const estimatedDistance = calculateRouteDistance(route.stops);
    
    // Update the route with the calculated distance
    await ctx.db.patch(route._id, {
      estimatedDistance: estimatedDistance
    });
    
    return {
      routeId: args.routeId,
      estimatedDistance: estimatedDistance,
      message: `Updated route ${args.routeId} with estimated distance of ${estimatedDistance} km`
    };
  },
});

// Mutation to update estimated distances for all routes
export const updateAllRouteDistances = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all routes
    const routes = await ctx.db.query("routes").collect();
    
    const updates = [];
    
    for (const route of routes) {
      // Calculate the estimated distance
      const estimatedDistance = calculateRouteDistance(route.stops);
      
      // Update the route with the calculated distance
      await ctx.db.patch(route._id, {
        estimatedDistance: estimatedDistance
      });
      
      updates.push({
        routeId: route.routeId,
        estimatedDistance: estimatedDistance
      });
    }
    
    return {
      totalUpdated: updates.length,
      updates: updates,
      message: `Updated ${updates.length} routes with estimated distances`
    };
  },
});

// Query to get route with distance information
export const getRouteWithDistance = query({
  args: {
    routeId: v.string(),
  },
  handler: async (ctx, args) => {
    const route = await ctx.db
      .query("routes")
      .withIndex("by_route_id", (q) => q.eq("routeId", args.routeId))
      .first();
    
    if (!route) {
      return null;
    }
    
    return route;
  },
});

// Query to get all routes with their distances
export const getAllRoutesWithDistances = query({
  args: {},
  handler: async (ctx) => {
    const routes = await ctx.db.query("routes").collect();
    return routes;
  },
});