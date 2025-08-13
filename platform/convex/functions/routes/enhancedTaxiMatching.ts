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
  // Input validation
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn('Invalid coordinates in calculateDistance:', { lat1, lon1, lat2, lon2 });
    return 0;
  }
  
  // If coordinates are the same, distance is 0
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  console.log('🧮 Distance calculation:', {
    from: { lat: lat1, lon: lon1 },
    to: { lat: lat2, lon: lon2 },
    distance: distance.toFixed(3) + 'km'
  });
  
  return distance;
}

/**
 * Calculate fare based on passenger displacement from origin
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
  passengerDisplacement: number; // Distance passenger travels from origin
  calculatedFare: number; // Fare based on passenger displacement
};

async function calculateRouteScore(
  ctx: QueryCtx,
  route: { routeId: string; stops: RouteStop[] },
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RouteScore> {
  console.log('🔍 calculateRouteScore input:', {
    routeId: route.routeId,
    startLat,
    startLon,
    endLat,
    endLon,
    inputTypes: {
      startLat: typeof startLat,
      startLon: typeof startLon,
      endLat: typeof endLat,
      endLon: typeof endLon
    }
  });

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
      hasDirectRoute: false,
      passengerDisplacement: 0,
      calculatedFare: 0
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
  
  // Calculate distances and fare
  let passengerDisplacement = 0;
  let calculatedFare = 0;
  
  // Always calculate passenger displacement, regardless of route validation
  passengerDisplacement = calculateDistance(startLat, startLon, endLat, endLon);
  
  if (hasDirectRoute && closestToStart.stop && closestToEnd.stop) {
    // Fare based on passenger displacement from origin
    calculatedFare = calculateFare(passengerDisplacement);
    
    console.log('📍 Route calculation debug:', {
      startLat, startLon, endLat, endLon,
      passengerDisplacement,
      calculatedFare,
      hasDirectRoute,
      startStopName: closestToStart.stop.name,
      endStopName: closestToEnd.stop.name
    });
  } else {
    // Even if no direct route, we can still calculate fare based on displacement
    calculatedFare = calculateFare(passengerDisplacement);
    
    console.log('⚠️ No direct route found, but calculated displacement:', {
      startLat, startLon, endLat, endLon,
      passengerDisplacement,
      calculatedFare
    });
  }
  
  return {
    totalScore,
    startProximity,
    endProximity,
    startStop: closestToStart.stop,
    endStop: closestToEnd.stop,
    hasDirectRoute,
    passengerDisplacement: Math.round(passengerDisplacement * 100) / 100,
    calculatedFare: Math.round(calculatedFare * 100) / 100
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
    passengerDisplacement: number; // Distance passenger travels from origin
    calculatedFare: number; // Fare based on passenger displacement
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
    passengerDisplacement: number; // Distance passenger travels from origin
    calculatedFare: number; // Fare based on passenger displacement
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
      destination: { lat: destinationLat, lng: destinationLng }
    });

    // Calculate passenger displacement once
    const passengerDisplacement = calculateDistance(originLat, originLng, destinationLat, destinationLng);
    const calculatedFare = calculateFare(passengerDisplacement);
    
    console.log('🧪 Passenger displacement:', {
      displacement: passengerDisplacement.toFixed(3) + 'km',
      fare: 'R' + calculatedFare.toFixed(2)
    });

    // Step 1: Get all drivers with current locations who are nearby
    const locations = await ctx.db.query("locations").collect();
    const nearbyDriverLocations = locations.filter((loc) => {
      if (loc.role !== "driver" && loc.role !== "both") return false;
      const distanceToOrigin = getDistanceKm(originLat, originLng, loc.latitude, loc.longitude);
      return distanceToOrigin <= maxTaxiDistance;
    });

    if (nearbyDriverLocations.length === 0) {
      return {
        success: true,
        availableTaxis: [],
        matchingRoutes: [],
        totalTaxisFound: 0,
        totalRoutesChecked: 0,
        validRoutesFound: 0,
        message: "No drivers found within range",
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

    console.log(`👥 Found ${nearbyDriverLocations.length} nearby drivers`);

    // Step 2: Get driver profiles for nearby drivers
    const driverUserIds = nearbyDriverLocations.map(loc => loc.userId);
    const driverProfiles = await ctx.db
      .query("drivers")
      .filter((q) => q.or(...driverUserIds.map(id => q.eq(q.field("userId"), id))))
      .collect();

    if (driverProfiles.length === 0) {
      return {
        success: true,
        availableTaxis: [],
        matchingRoutes: [],
        totalTaxisFound: 0,
        totalRoutesChecked: 0,
        validRoutesFound: 0,
        message: "No driver profiles found for nearby drivers",
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

    // Step 3: Get unique routes for these drivers
    const routeIds = [...new Set(driverProfiles.map(d => d.assignedRoute).filter(Boolean))];
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.and(
        q.eq(q.field("isActive"), true),
        q.or(...routeIds.map(id => q.eq(q.field("_id"), id)))
      ))
      .collect();

    console.log(`📊 Checking ${routes.length} routes for ${driverProfiles.length} drivers`);

    // Step 4: Only calculate route scores for routes that have drivers
    const validRoutes = [];
    const availableTaxis: AvailableTaxi[] = [];

    for (const route of routes) {
      // Get drivers on this specific route
      const driversOnRoute = driverProfiles.filter(d => d.assignedRoute === route._id);
      const driversOnRouteLocations = nearbyDriverLocations.filter(loc => 
        driversOnRoute.some(d => d.userId === loc.userId)
      );

      if (driversOnRouteLocations.length === 0) continue;

      // Calculate route score only once per route
      const routeScore = await calculateRouteScore(ctx, route, originLat, originLng, destinationLat, destinationLng);
      
      // Check if route is valid
      if (routeScore.startProximity > maxOriginDistance || 
          routeScore.endProximity > maxDestinationDistance || 
          !routeScore.hasDirectRoute) {
        continue;
      }

      validRoutes.push({
        route,
        routeScore,
        availableDrivers: driversOnRouteLocations.length
      });

      // Add all drivers on this valid route
      for (const driverLocation of driversOnRouteLocations) {
        const driverProfile = driversOnRoute.find(d => d.userId === driverLocation.userId);
        if (!driverProfile) continue;

        const userProfile = await ctx.db.get(driverProfile.userId);
        const taxi = await ctx.db
          .query("taxis")
          .withIndex("by_driver_id", (q) => q.eq("driverId", driverProfile._id))
          .first();

        if (userProfile) {
          const taxiData: AvailableTaxi = {
            driverId: driverProfile._id,
            userId: driverLocation.userId,
            name: userProfile.name,
            phoneNumber: userProfile.phoneNumber,
            vehicleRegistration: taxi?.licensePlate || 'Not available',
            vehicleModel: taxi?.model || 'Not available',
            vehicleColor: taxi?.color || 'Not specified',
            vehicleYear: taxi?.year || null,
            isAvailable: taxi?.isAvailable || true,
            numberOfRidesCompleted: driverProfile.numberOfRidesCompleted,
            averageRating: driverProfile.averageRating || 0,
            taxiAssociation: driverProfile.taxiAssociation || route.taxiAssociation,
            currentLocation: {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
              lastUpdated: driverLocation.updatedAt
            },
            distanceToOrigin: Math.round(getDistanceKm(originLat, originLng, driverLocation.latitude, driverLocation.longitude) * 100) / 100,
            routeInfo: {
              routeId: route.routeId,
              routeName: route.name,
              taxiAssociation: route.taxiAssociation,
              fare: route.fare,
              estimatedDuration: route.estimatedDuration,
              startProximity: Math.round(routeScore.startProximity * 100) / 100,
              endProximity: Math.round(routeScore.endProximity * 100) / 100,
              totalScore: Math.round(routeScore.totalScore * 100) / 100,
              passengerDisplacement: Math.round(passengerDisplacement * 100) / 100,
              calculatedFare: Math.round(calculatedFare * 100) / 100,
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
    }

    console.log(`✅ Found ${validRoutes.length} valid routes with ${availableTaxis.length} available taxis`);

    if (availableTaxis.length === 0) {
      return {
        success: true,
        availableTaxis: [],
        matchingRoutes: [],
        totalTaxisFound: 0,
        totalRoutesChecked: routes.length,
        validRoutesFound: 0,
        message: "No taxi routes found that pass near both your pickup location and destination",
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

    // Sort and limit results
    const sortedTaxis = availableTaxis.sort((a, b) => {
      const routeScoreDiff = a.routeInfo.totalScore - b.routeInfo.totalScore;
      if (Math.abs(routeScoreDiff) > 0.1) return routeScoreDiff;
      return a.distanceToOrigin - b.distanceToOrigin;
    });

    const finalResults = sortedTaxis.slice(0, maxResults);

    // Create route details
    const routeDetails = validRoutes.map(({ route, routeScore, availableDrivers }) => ({
      routeId: route.routeId,
      routeName: route.name,
      taxiAssociation: route.taxiAssociation,
      fare: route.fare,
      availableDrivers,
      startProximity: Math.round(routeScore.startProximity * 100) / 100,
      endProximity: Math.round(routeScore.endProximity * 100) / 100,
      totalScore: Math.round(routeScore.totalScore * 100) / 100,
      passengerDisplacement: Math.round(passengerDisplacement * 100) / 100,
      calculatedFare: Math.round(calculatedFare * 100) / 100
    }));

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
      message: `Found ${finalResults.length} available taxis on ${routeDetails.length} matching routes`
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