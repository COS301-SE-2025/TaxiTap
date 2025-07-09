import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";

// Helper function to calculate distance from geometry
function calculateDistanceFromGeometry(geometry: any): number {
  if (!geometry || !geometry.coordinates) {
    return 0;
  }

  let totalDistance = 0;
  
  // Handle different geometry types
  if (geometry.type === "LineString") {
    const coordinates = geometry.coordinates;
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += calculateHaversineDistance(
        coordinates[i][1], coordinates[i][0],
        coordinates[i + 1][1], coordinates[i + 1][0]
      );
    }
  } else if (geometry.type === "MultiLineString") {
    geometry.coordinates.forEach((lineString: number[][]) => {
      for (let i = 0; i < lineString.length - 1; i++) {
        totalDistance += calculateHaversineDistance(
          lineString[i][1], lineString[i][0],
          lineString[i + 1][1], lineString[i + 1][0]
        );
      }
    });
  }

  return totalDistance;
}

// Haversine formula to calculate distance between two points
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Function to calculate fare based on distance (R12 per 10km)
function calculateFare(distanceKm: number): number {
  const farePerKm = 12 / 10; // R1.2 per km
  return Math.max(12, distanceKm * farePerKm); // Minimum fare of R12
}

// Function to calculate estimated duration based on distance (60km/hr)
function calculateEstimatedDuration(distanceKm: number): number {
  const speedKmPerHour = 60;
  const durationHours = distanceKm / speedKmPerHour;
  return Math.round(durationHours * 60); // Return duration in minutes
}

// Function to calculate distance from stops
function calculateDistanceFromStops(stops: Array<{
  id: string;
  name: string;
  coordinates: number[];
  order: number;
}>): number {
  if (!stops || stops.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  const sortedStops = stops.sort((a, b) => a.order - b.order);
  
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const currentStop = sortedStops[i];
    const nextStop = sortedStops[i + 1];
    
    if (currentStop.coordinates && nextStop.coordinates) {
      totalDistance += calculateHaversineDistance(
        currentStop.coordinates[1], currentStop.coordinates[0],
        nextStop.coordinates[1], nextStop.coordinates[0]
      );
    }
  }

  return totalDistance;
}

export const updateRouteFares = mutation({
  args: {
    useStopsForDistance: v.optional(v.boolean()) // Option to use stops instead of geometry
  },
  handler: async (ctx, args) => {
    const { useStopsForDistance = false } = args;
    
    // Get all routes
    const routes = await ctx.db.query("routes").collect();
    
    const updateResults: Array<{
      routeId: string;
      name: string;
      oldFare: number;
      newFare: number;
      oldEstimatedDuration: number;
      newEstimatedDuration: number;
      distanceKm: number;
      farePerKm: number;
    }> = [];
    
    for (const route of routes) {
      let distanceKm = 0;
      
      if (useStopsForDistance) {
        // Calculate distance from stops
        distanceKm = calculateDistanceFromStops(route.stops);
      } else {
        // Calculate distance from geometry
        distanceKm = calculateDistanceFromGeometry(route.geometry);
      }
      
      // Calculate new fare (R12 per 10km)
      const newFare = calculateFare(distanceKm);
      
      // Calculate estimated duration (60km/hr)
      const newEstimatedDuration = calculateEstimatedDuration(distanceKm);
      
      // Update the route
      await ctx.db.patch(route._id, {
        fare: newFare,
        estimatedDuration: newEstimatedDuration
      });
      
      updateResults.push({
        routeId: route.routeId,
        name: route.name,
        oldFare: route.fare,
        newFare: newFare,
        oldEstimatedDuration: route.estimatedDuration,
        newEstimatedDuration: newEstimatedDuration,
        distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
        farePerKm: Math.round((newFare / distanceKm) * 100) / 100
      });
    }
    
    return {
      message: `Updated fares for ${updateResults.length} routes`,
      results: updateResults
    };
  }
});

// Utility function to update a specific route's fare
export const updateSingleRouteFare = mutation({
  args: {
    routeId: v.string(),
    useStopsForDistance: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const { routeId, useStopsForDistance = false } = args;
    
    const route = await ctx.db
      .query("routes")
      .withIndex("by_route_id", (q) => q.eq("routeId", routeId))
      .first();
    
    if (!route) {
      throw new Error(`Route with ID ${routeId} not found`);
    }
    
    let distanceKm = 0;
    
    if (useStopsForDistance) {
      distanceKm = calculateDistanceFromStops(route.stops);
    } else {
      distanceKm = calculateDistanceFromGeometry(route.geometry);
    }
    
    const newFare = calculateFare(distanceKm);
    const newEstimatedDuration = calculateEstimatedDuration(distanceKm);
    
    await ctx.db.patch(route._id, {
      fare: newFare,
      estimatedDuration: newEstimatedDuration
    });
    
    return {
      routeId: route.routeId,
      name: route.name,
      oldFare: route.fare,
      newFare: newFare,
      oldEstimatedDuration: route.estimatedDuration,
      newEstimatedDuration: newEstimatedDuration,
      distanceKm: Math.round(distanceKm * 100) / 100,
      farePerKm: Math.round((newFare / distanceKm) * 100) / 100
    };
  }
});