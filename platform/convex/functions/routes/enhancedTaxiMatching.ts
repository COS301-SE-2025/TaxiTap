// convex/functions/routes/enhancedTaxiMatching.ts
import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

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

type RouteStop = {
  coordinates: number[];
  name: string;
  order: number;
  id: string;
};

function findClosestStop(
  stops: RouteStop[],
  targetLat: number,
  targetLon: number
) {
  let closestStop: RouteStop | null = null;
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

type RouteScore = {
  totalScore: number;
  startProximity: number;
  endProximity: number;
  startStop: RouteStop | null;
  endStop: RouteStop | null;
  hasDirectRoute: boolean;
};

async function calculateRouteScore(
  ctx: QueryCtx,
  route: { routeId: string; stops: RouteStop[] },
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RouteScore> {
  // Get enriched stops or fall back to original stops
  const enrichedRoute = await ctx.db
    .query("enrichedRouteStops")
    .withIndex("by_route_id", (q) => q.eq("routeId", route.routeId))
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
  
  const START_WEIGHT = 0.6;
  const END_WEIGHT = 0.4;
  
  const startProximity = closestToStart.distance;
  const endProximity = closestToEnd.distance;
  const totalScore = (startProximity * START_WEIGHT) + (endProximity * END_WEIGHT);
  
  // Check if this could be a direct route (start stop comes before end stop)
  const hasDirectRoute: boolean = Boolean(closestToStart.stop && closestToEnd.stop &&
    closestToStart.stop.order < closestToEnd.stop.order);
  
  return {
    totalScore,
    startProximity,
    endProximity,
    startStop: closestToStart.stop,
    endStop: closestToEnd.stop,
    hasDirectRoute
  };
}

type AvailableTaxi = {
  driverId: Id<"drivers">;
  userId: Id<"taxiTap_users">;
  name: string;
  phoneNumber: string;
  vehicleRegistration: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: number | null;
  isAvailable: boolean;
  numberOfRidesCompleted: number;
  averageRating: number;
  taxiAssociation: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
  distanceToOrigin: number;
  routeInfo: {
    routeId: string;
    routeName: string;
    taxiAssociation: string;
    fare: number;
    estimatedDuration: number;
    startProximity: number;
    endProximity: number;
    totalScore: number;
    closestStartStop: {
      id: string;
      name: string;
      coordinates: number[];
      distanceFromOrigin: number;
    } | null;
    closestEndStop: {
      id: string;
      name: string;
      coordinates: number[];
      distanceFromDestination: number;
    } | null;
  };
};

type TaxiSearchResult = {
  success: boolean;
  availableTaxis: AvailableTaxi[];
  matchingRoutes: Array<{
    routeId: string;
    routeName: string;
    taxiAssociation: string;
    fare: number;
    availableDrivers: number;
    startProximity: number;
    endProximity: number;
    totalScore: number;
  }>;
  totalTaxisFound: number;
  totalRoutesChecked: number;
  validRoutesFound: number;
  searchCriteria: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    maxOriginDistance: number;
    maxDestinationDistance: number;
    maxTaxiDistance: number;
    maxResults: number;
  };
  message: string;
};

type FindAvailableTaxisArgs = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  maxOriginDistance?: number;
  maxDestinationDistance?: number;
  maxTaxiDistance?: number;
  maxResults?: number;
};

/**
 * Exported handler function for internal taxi matching logic
 */
export const _findAvailableTaxisForJourneyHandler = async (
  ctx: QueryCtx,
  {
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    maxOriginDistance = 1.0,
    maxDestinationDistance = 1.0,
    maxTaxiDistance = 2.0,
    maxResults = 10
  }: FindAvailableTaxisArgs
): Promise<TaxiSearchResult> => {
  try {
    console.log('🔍 Finding available taxis for journey:', {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destinationLat, lng: destinationLng },
      maxOriginDistance,
      maxDestinationDistance,
      maxTaxiDistance
    });

    // Step 1: Get all active routes
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    console.log(`📊 Checking ${routes.length} active routes`);
    
    // Step 2: Find routes that pass near both origin and destination
    const routeScores = await Promise.all(
      routes.map(async (route) => {
        const score = await calculateRouteScore(ctx, route, originLat, originLng, destinationLat, destinationLng);
        return {
          route,
          ...score
        };
      })
    );
    
    // Filter routes based on maximum distances and direct route requirement
    const validRoutes = routeScores.filter(routeScore => 
      routeScore.startProximity <= maxOriginDistance &&
      routeScore.endProximity <= maxDestinationDistance &&
      routeScore.hasDirectRoute && // Route should go from origin area towards destination area
      routeScore.totalScore < Infinity
    );
    
    console.log(`✅ Found ${validRoutes.length} valid routes with direct connections`);
    
    if (validRoutes.length === 0) {
      return {
        success: true,
        availableTaxis: [],
        matchingRoutes: [],
        totalTaxisFound: 0,
        totalRoutesChecked: routes.length,
        validRoutesFound: 0,
        message: "No taxi routes found that pass near both your pickup location and destination within 3km radius",
        searchCriteria: {
          origin: { latitude: originLat, longitude: originLng },
          destination: { latitude: destinationLat, longitude: destinationLng },
          maxOriginDistance,
          maxDestinationDistance,
          maxTaxiDistance,
          maxResults
        }
      };
    }
    
    // Step 3: For each valid route, find available taxis
    const availableTaxis: AvailableTaxi[] = [];
    const routeDetails = [];
    
    for (const routeScore of validRoutes) {
      const route = routeScore.route;
      
      // Find drivers assigned to this route
      const driversOnRoute = await ctx.db
        .query("drivers")
        .withIndex("by_assigned_route", (q) => q.eq("assignedRoute", route._id as Id<"routes">))
        .collect();
      
      if (driversOnRoute.length === 0) {
        console.log(`⚠️ No drivers found on route ${route.name}`);
        continue;
      }
      
      const driverUserIds = driversOnRoute.map((d) => d.userId);
      
      // Get current locations of all drivers
      const locations = await ctx.db.query("locations").collect();
      
      // Filter for drivers on this route who are nearby the origin
      const nearbyDrivers = locations.filter((loc) => {
        const isDriverOnRoute = (loc.role === "driver" || loc.role === "both") &&
          driverUserIds.some((id) => id === loc.userId);
        
        if (!isDriverOnRoute) return false;
        
        const distanceToOrigin = getDistanceKm(originLat, originLng, loc.latitude, loc.longitude);
        return distanceToOrigin <= maxTaxiDistance;
      });
      
      console.log(`🚖 Route ${route.name}: Found ${nearbyDrivers.length} nearby drivers`);
      
      // Add driver details and route information
      for (const driverLocation of nearbyDrivers) {
        const driverProfile = driversOnRoute.find(d => d.userId === driverLocation.userId);
        
        if (!driverProfile) continue;
        
        // Get user profile for driver name and phone through the userId link
        const userProfile = await ctx.db.get(driverProfile.userId);
        
        // Get taxi information for this driver through the driver ID link
        const taxi = await ctx.db
          .query("taxis")
          .withIndex("by_driver_id", (q) => q.eq("driverId", driverProfile._id))
          .first();
        
        if (userProfile) {
          const taxiData: AvailableTaxi = {
            // Driver information (using proper schema fields)
            driverId: driverProfile._id,
            userId: driverLocation.userId,
            name: userProfile.name,
            phoneNumber: userProfile.phoneNumber,
            vehicleRegistration: taxi?.licensePlate || 'Not available',
            vehicleModel: taxi?.model || 'Not available',
            vehicleColor: taxi?.color || 'Not specified',
            vehicleYear: taxi?.year || null,
            isAvailable: taxi?.isAvailable || true,
            
            // Driver stats from drivers table
            numberOfRidesCompleted: driverProfile.numberOfRidesCompleted,
            averageRating: driverProfile.averageRating || 0,
            taxiAssociation: driverProfile.taxiAssociation || route.taxiAssociation,
            
            // Location information (using proper schema fields)
            currentLocation: {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
              lastUpdated: driverLocation.updatedAt
            },
            distanceToOrigin: Math.round(getDistanceKm(originLat, originLng, driverLocation.latitude, driverLocation.longitude) * 100) / 100,
            
            // Route information
            routeInfo: {
              routeId: route.routeId,
              routeName: route.name,
              taxiAssociation: route.taxiAssociation,
              fare: route.fare,
              estimatedDuration: route.estimatedDuration,
              startProximity: Math.round(routeScore.startProximity * 100) / 100,
              endProximity: Math.round(routeScore.endProximity * 100) / 100,
              totalScore: Math.round(routeScore.totalScore * 100) / 100,
              closestStartStop: routeScore.startStop ? {
                id: routeScore.startStop.id,
                name: routeScore.startStop.name,
                coordinates: routeScore.startStop.coordinates,
                distanceFromOrigin: Math.round(routeScore.startProximity * 100) / 100
              } : null,
              closestEndStop: routeScore.endStop ? {
                id: routeScore.endStop.id,
                name: routeScore.endStop.name,
                coordinates: routeScore.endStop.coordinates,
                distanceFromDestination: Math.round(routeScore.endProximity * 100) / 100
              } : null
            }
          };
          
          availableTaxis.push(taxiData);
        }
      }
      
      // Store route details for reference
      routeDetails.push({
        routeId: route.routeId,
        routeName: route.name,
        taxiAssociation: route.taxiAssociation,
        fare: route.fare,
        availableDrivers: nearbyDrivers.length,
        startProximity: Math.round(routeScore.startProximity * 100) / 100,
        endProximity: Math.round(routeScore.endProximity * 100) / 100,
        totalScore: Math.round(routeScore.totalScore * 100) / 100
      });
    }
    
    // Sort taxis by a combination of route score and distance to origin
    const sortedTaxis = availableTaxis.sort((a, b) => {
      // Primary sort: route quality (lower score is better)
      const routeScoreDiff = a.routeInfo.totalScore - b.routeInfo.totalScore;
      if (Math.abs(routeScoreDiff) > 0.1) return routeScoreDiff;
      
      // Secondary sort: distance to passenger (closer is better)
      return a.distanceToOrigin - b.distanceToOrigin;
    });
    
    const finalResults = sortedTaxis.slice(0, maxResults);
    
    console.log(`🎯 Final result: ${finalResults.length} available taxis found`);
    
    return {
      success: true,
      availableTaxis: finalResults,
      matchingRoutes: routeDetails.sort((a, b) => a.totalScore - b.totalScore),
      totalTaxisFound: availableTaxis.length,
      totalRoutesChecked: routes.length,
      validRoutesFound: validRoutes.length,
      searchCriteria: {
        origin: { latitude: originLat, longitude: originLng },
        destination: { latitude: destinationLat, longitude: destinationLng },
        maxOriginDistance,
        maxDestinationDistance,
        maxTaxiDistance,
        maxResults
      },
      message: `Found ${finalResults.length} available taxis on ${routeDetails.length} matching routes that pass near your locations`
    };
    
  } catch (error) {
    console.error("❌ Error in _findAvailableTaxisForJourney:", error);
    return {
      success: false,
      availableTaxis: [],
      matchingRoutes: [],
      totalTaxisFound: 0,
      totalRoutesChecked: 0,
      validRoutesFound: 0,
      message: `Error finding available taxis: ${error}`,
      searchCriteria: {
        origin: { latitude: originLat, longitude: originLng },
        destination: { latitude: destinationLat, longitude: destinationLng },
        maxOriginDistance,
        maxDestinationDistance,
        maxTaxiDistance,
        maxResults
      }
    };
  }
};

/**
 * Internal function that performs the core taxi matching logic
 */
export const _findAvailableTaxisForJourney = internalQuery({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    maxOriginDistance: v.optional(v.number()),
    maxDestinationDistance: v.optional(v.number()),
    maxTaxiDistance: v.optional(v.number()),
    maxResults: v.optional(v.number())
  },
  handler: _findAvailableTaxisForJourneyHandler
});

/**
 * Exported handler function for public query
 */
export const findAvailableTaxisForJourneyHandler = async (
  ctx: QueryCtx, 
  args: FindAvailableTaxisArgs
): Promise<TaxiSearchResult> => {
  return await ctx.runQuery(internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney, args);
};

/**
 * Public query that calls the internal function
 */
export const findAvailableTaxisForJourney = query({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    maxOriginDistance: v.optional(v.number()),
    maxDestinationDistance: v.optional(v.number()),
    maxTaxiDistance: v.optional(v.number()),
    maxResults: v.optional(v.number())
  },
  handler: findAvailableTaxisForJourneyHandler
});

type BackwardCompatibilityArgs = {
  passengerLat: number;
  passengerLng: number;
  passengerEndLat: number;
  passengerEndLng: number;
};

/**
 * Exported handler function for backward compatibility
 */
export const getNearbyTaxisForRouteRequestHandler = async (
  ctx: QueryCtx,
  args: BackwardCompatibilityArgs
) => {
  const result: TaxiSearchResult = await ctx.runQuery(internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney, {
    originLat: args.passengerLat,
    originLng: args.passengerLng,
    destinationLat: args.passengerEndLat,
    destinationLng: args.passengerEndLng,
    maxOriginDistance: 3.0,
    maxDestinationDistance: 3.0,
    maxTaxiDistance: 3.0,
    maxResults: 10
  });
  
  // Transform to match original return format with proper types
  return result.availableTaxis.map((taxi: AvailableTaxi) => ({
    userId: taxi.userId,
    latitude: taxi.currentLocation.latitude,
    longitude: taxi.currentLocation.longitude,
    role: "driver" as const,
    updatedAt: taxi.currentLocation.lastUpdated,
    // Add additional fields for enhanced functionality
    _id: taxi.driverId,
    name: taxi.name,
    phoneNumber: taxi.phoneNumber,
    vehicleRegistration: taxi.vehicleRegistration,
    vehicleModel: taxi.vehicleModel,
    vehicleColor: taxi.vehicleColor,
    vehicleYear: taxi.vehicleYear,
    isAvailable: taxi.isAvailable,
    numberOfRidesCompleted: taxi.numberOfRidesCompleted,
    averageRating: taxi.averageRating,
    taxiAssociation: taxi.taxiAssociation,
    distanceToOrigin: taxi.distanceToOrigin,
    routeInfo: taxi.routeInfo
  }));
};

/**
 * Simplified version for backward compatibility
 */
export const getNearbyTaxisForRouteRequest = query({
  args: {
    passengerLat: v.number(),
    passengerLng: v.number(),
    passengerEndLat: v.number(),
    passengerEndLng: v.number(),
  },
  handler: getNearbyTaxisForRouteRequestHandler
});