// Enhanced Taxi Matching Tests
// Create the handler functions directly for testing without complex Convex mocking

import { jest } from '@jest/globals';

// Simple mock implementations of the core logic
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
  const R = 6371;
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

function calculateRouteScore(
  route: { routeId: string; stops: RouteStop[] },
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): RouteScore {
  const stops = route.stops;
  
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
  
  const closestToStart = findClosestStop(stops, startLat, startLon);
  const closestToEnd = findClosestStop(stops, endLat, endLon);
  
  const START_WEIGHT = 0.6;
  const END_WEIGHT = 0.4;
  
  const startProximity = closestToStart.distance;
  const endProximity = closestToEnd.distance;
  const totalScore = (startProximity * START_WEIGHT) + (endProximity * END_WEIGHT);
  
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

// Test data types
type TestRoute = {
  _id: string;
  routeId: string;
  name: string;
  taxiAssociation: string;
  fare: number;
  estimatedDuration: number;
  isActive: boolean;
  stops: RouteStop[];
};

type TestDriver = {
  _id: string;
  userId: string;
  assignedRoute: string;
  numberOfRidesCompleted: number;
  averageRating: number;
  taxiAssociation: string;
};

type TestLocation = {
  userId: string;
  latitude: number;
  longitude: number;
  role: "driver" | "passenger" | "both";
  updatedAt: string;
};

type TestUser = {
  _id: string;
  name: string;
  phoneNumber: string;
};

type TestTaxi = {
  _id: string;
  driverId: string;
  licensePlate: string;
  model: string;
  color: string;
  year: number;
  isAvailable: boolean;
};

type TaxiSearchResult = {
  success: boolean;
  availableTaxis: any[];
  matchingRoutes: any[];
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

// Simplified version of the main function for testing
async function findAvailableTaxisForJourney(
  routes: TestRoute[],
  drivers: TestDriver[],
  locations: TestLocation[],
  users: TestUser[],
  taxis: TestTaxi[],
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  maxOriginDistance: number = 1.0,
  maxDestinationDistance: number = 1.0,
  maxTaxiDistance: number = 2.0,
  maxResults: number = 10
): Promise<TaxiSearchResult> {
  try {
    // Filter active routes
    const activeRoutes = routes.filter(route => route.isActive);
    
    // Calculate route scores
    const routeScores = activeRoutes.map(route => {
      const score = calculateRouteScore(route, originLat, originLng, destinationLat, destinationLng);
      return { route, ...score };
    });
    
    // Filter valid routes
    const validRoutes = routeScores.filter(routeScore => 
      routeScore.startProximity <= maxOriginDistance &&
      routeScore.endProximity <= maxDestinationDistance &&
      routeScore.hasDirectRoute &&
      routeScore.totalScore < Infinity
    );
    
    if (validRoutes.length === 0) {
      return {
        success: true,
        availableTaxis: [],
        matchingRoutes: [],
        totalTaxisFound: 0,
        totalRoutesChecked: activeRoutes.length,
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
    
    const availableTaxis: any[] = [];
    const routeDetails: any[] = [];
    
    for (const routeScore of validRoutes) {
      const route = routeScore.route;
      
      // Find drivers on this route
      const driversOnRoute = drivers.filter(d => d.assignedRoute === route._id);
      
      if (driversOnRoute.length === 0) continue;
      
      const driverUserIds = driversOnRoute.map(d => d.userId);
      
      // Find nearby drivers
      const nearbyDrivers = locations.filter(loc => {
        const isDriverOnRoute = (loc.role === "driver" || loc.role === "both") &&
          driverUserIds.includes(loc.userId);
        
        if (!isDriverOnRoute) return false;
        
        const distanceToOrigin = getDistanceKm(originLat, originLng, loc.latitude, loc.longitude);
        return distanceToOrigin <= maxTaxiDistance;
      });
      
      // Add taxi data
      for (const driverLocation of nearbyDrivers) {
        const driverProfile = driversOnRoute.find(d => d.userId === driverLocation.userId);
        if (!driverProfile) continue;
        
        const userProfile = users.find(u => u._id === driverProfile.userId);
        const taxi = taxis.find(t => t.driverId === driverProfile._id);
        
        if (userProfile) {
          availableTaxis.push({
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
              totalScore: Math.round(routeScore.totalScore * 100) / 100
            }
          });
        }
      }
      
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
    
    // Sort taxis
    const sortedTaxis = availableTaxis.sort((a, b) => {
      const routeScoreDiff = a.routeInfo.totalScore - b.routeInfo.totalScore;
      if (Math.abs(routeScoreDiff) > 0.1) return routeScoreDiff;
      return a.distanceToOrigin - b.distanceToOrigin;
    });
    
    const finalResults = sortedTaxis.slice(0, maxResults);
    
    return {
      success: true,
      availableTaxis: finalResults,
      matchingRoutes: routeDetails.sort((a, b) => a.totalScore - b.totalScore),
      totalTaxisFound: availableTaxis.length,
      totalRoutesChecked: activeRoutes.length,
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
}

describe("Enhanced Taxi Matching Functions", () => {
  describe("Core taxi matching logic", () => {
    const defaultArgs = {
      originLat: -25.7479,
      originLng: 28.2293,
      destinationLat: -25.7679,
      destinationLng: 28.2493,
      maxOriginDistance: 1.0,
      maxDestinationDistance: 1.0,
      maxTaxiDistance: 2.0,
      maxResults: 10
    };

    it("should find available taxis on matching routes", async () => {
      const routes: TestRoute[] = [
        {
          _id: "route1",
          routeId: "R001",
          name: "Pretoria Central to Hatfield",
          taxiAssociation: "Pretoria Taxi Association",
          fare: 15,
          estimatedDuration: 30,
          isActive: true,
          stops: [
            { coordinates: [-25.7479, 28.2293], name: "Central Station", order: 1, id: "stop1" },
            { coordinates: [-25.7679, 28.2493], name: "Hatfield Plaza", order: 2, id: "stop2" }
          ]
        }
      ];

      const drivers: TestDriver[] = [
        {
          _id: "driver1",
          userId: "user1",
          assignedRoute: "route1",
          numberOfRidesCompleted: 150,
          averageRating: 4.5,
          taxiAssociation: "Pretoria Taxi Association"
        }
      ];

      const locations: TestLocation[] = [
        {
          userId: "user1",
          latitude: -25.7480,
          longitude: 28.2295,
          role: "driver",
          updatedAt: "2025-06-26T10:00:00Z"
        }
      ];

      const users: TestUser[] = [
        {
          _id: "user1",
          name: "John Doe",
          phoneNumber: "+27123456789"
        }
      ];

      const taxis: TestTaxi[] = [
        {
          _id: "taxi1",
          driverId: "driver1",
          licensePlate: "ABC123GP",
          model: "Toyota Quantum",
          color: "White",
          year: 2020,
          isAvailable: true
        }
      ];

      const result = await findAvailableTaxisForJourney(
        routes, drivers, locations, users, taxis,
        defaultArgs.originLat, defaultArgs.originLng,
        defaultArgs.destinationLat, defaultArgs.destinationLng,
        defaultArgs.maxOriginDistance, defaultArgs.maxDestinationDistance,
        defaultArgs.maxTaxiDistance, defaultArgs.maxResults
      );

      expect(result.success).toBe(true);
      expect(result.availableTaxis).toHaveLength(1);
      expect(result.availableTaxis[0].name).toBe("John Doe");
      expect(result.availableTaxis[0].vehicleRegistration).toBe("ABC123GP");
      expect(result.availableTaxis[0].routeInfo.routeName).toBe("Pretoria Central to Hatfield");
      expect(result.totalTaxisFound).toBe(1);
      expect(result.validRoutesFound).toBe(1);
    });

    it("should return empty results when no routes are active", async () => {
      const routes: TestRoute[] = [
        {
          _id: "route1",
          routeId: "R001",
          name: "Inactive Route",
          taxiAssociation: "Test Association",
          fare: 15,
          estimatedDuration: 30,
          isActive: false,
          stops: [
            { coordinates: [-25.7479, 28.2293], name: "Start", order: 1, id: "stop1" },
            { coordinates: [-25.7679, 28.2493], name: "End", order: 2, id: "stop2" }
          ]
        }
      ];

      const result = await findAvailableTaxisForJourney(
        routes, [], [], [], [],
        defaultArgs.originLat, defaultArgs.originLng,
        defaultArgs.destinationLat, defaultArgs.destinationLng
      );

      expect(result.success).toBe(true);
      expect(result.availableTaxis).toHaveLength(0);
      expect(result.totalRoutesChecked).toBe(0);
      expect(result.validRoutesFound).toBe(0);
    });

    it("should filter out routes that don't pass near origin and destination", async () => {
      const routes: TestRoute[] = [
        {
          _id: "route1",
          routeId: "R001",
          name: "Far Route",
          taxiAssociation: "Test Association",
          fare: 15,
          estimatedDuration: 30,
          isActive: true,
          stops: [
            { coordinates: [-26.0000, 29.0000], name: "Far Start", order: 1, id: "stop1" },
            { coordinates: [-26.1000, 29.1000], name: "Far End", order: 2, id: "stop2" }
          ]
        }
      ];

      const result = await findAvailableTaxisForJourney(
        routes, [], [], [], [],
        defaultArgs.originLat, defaultArgs.originLng,
        defaultArgs.destinationLat, defaultArgs.destinationLng
      );

      expect(result.success).toBe(true);
      expect(result.availableTaxis).toHaveLength(0);
      expect(result.validRoutesFound).toBe(0);
      expect(result.message).toContain("No taxi routes found that pass near both");
    });

    it("should filter out routes without direct connection", async () => {
      const routes: TestRoute[] = [
        {
          _id: "route1",
          routeId: "R001",
          name: "Reverse Route",
          taxiAssociation: "Test Association",
          fare: 15,
          estimatedDuration: 30,
          isActive: true,
          stops: [
            { coordinates: [-25.7679, 28.2493], name: "Destination Area", order: 1, id: "stop1" },
            { coordinates: [-25.7479, 28.2293], name: "Origin Area", order: 2, id: "stop2" }
          ]
        }
      ];

      const result = await findAvailableTaxisForJourney(
        routes, [], [], [], [],
        defaultArgs.originLat, defaultArgs.originLng,
        defaultArgs.destinationLat, defaultArgs.destinationLng
      );

      expect(result.success).toBe(true);
      expect(result.availableTaxis).toHaveLength(0);
      expect(result.validRoutesFound).toBe(0);
    });

    it("should handle multiple taxis and sort them correctly", async () => {
      const routes: TestRoute[] = [
        {
          _id: "route1",
          routeId: "R001",
          name: "Test Route",
          taxiAssociation: "Test Association",
          fare: 15,
          estimatedDuration: 30,
          isActive: true,
          stops: [
            { coordinates: [-25.7479, 28.2293], name: "Start", order: 1, id: "stop1" },
            { coordinates: [-25.7679, 28.2493], name: "End", order: 2, id: "stop2" }
          ]
        }
      ];

      const drivers: TestDriver[] = [
        {
          _id: "driver1",
          userId: "user1",
          assignedRoute: "route1",
          numberOfRidesCompleted: 100,
          averageRating: 4.0,
          taxiAssociation: "Test Association"
        },
        {
          _id: "driver2",
          userId: "user2",
          assignedRoute: "route1",
          numberOfRidesCompleted: 200,
          averageRating: 4.8,
          taxiAssociation: "Test Association"
        }
      ];

      const locations: TestLocation[] = [
        {
          userId: "user1",
          latitude: -25.7500, // Further from origin
          longitude: 28.2300,
          role: "driver",
          updatedAt: "2025-06-26T10:00:00Z"
        },
        {
          userId: "user2",
          latitude: -25.7480, // Closer to origin
          longitude: 28.2295,
          role: "driver",
          updatedAt: "2025-06-26T10:00:00Z"
        }
      ];

      const users: TestUser[] = [
        { _id: "user1", name: "Driver One", phoneNumber: "+27111111111" },
        { _id: "user2", name: "Driver Two", phoneNumber: "+27222222222" }
      ];

      const taxis: TestTaxi[] = [
        {
          _id: "taxi1",
          driverId: "driver1",
          licensePlate: "ABC123GP",
          model: "Toyota Quantum",
          color: "White",
          year: 2020,
          isAvailable: true
        },
        {
          _id: "taxi2",
          driverId: "driver2",
          licensePlate: "XYZ789GP",
          model: "Nissan NV200",
          color: "Blue",
          year: 2021,
          isAvailable: true
        }
      ];

      const result = await findAvailableTaxisForJourney(
        routes, drivers, locations, users, taxis,
        defaultArgs.originLat, defaultArgs.originLng,
        defaultArgs.destinationLat, defaultArgs.destinationLng,
        defaultArgs.maxOriginDistance, defaultArgs.maxDestinationDistance,
        defaultArgs.maxTaxiDistance, defaultArgs.maxResults
      );

      expect(result.success).toBe(true);
      expect(result.availableTaxis).toHaveLength(2);
      
      // Should be sorted by distance to origin (closer first)
      expect(result.availableTaxis[0].name).toBe("Driver Two");
      expect(result.availableTaxis[1].name).toBe("Driver One");
      expect(result.availableTaxis[0].distanceToOrigin).toBeLessThan(result.availableTaxis[1].distanceToOrigin);
    });
  });

  describe("Distance calculation functions", () => {
    it("should calculate distance correctly", () => {
      // Test distance between Pretoria Central and Hatfield (known distance ~2km)
      const distance = getDistanceKm(-25.7479, 28.2293, -25.7679, 28.2493);
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(5);
    });

    it("should find closest stop correctly", () => {
      const stops: RouteStop[] = [
        { coordinates: [-25.7479, 28.2293], name: "Central", order: 1, id: "stop1" },
        { coordinates: [-25.7679, 28.2493], name: "Hatfield", order: 2, id: "stop2" },
        { coordinates: [-25.8000, 28.3000], name: "Far", order: 3, id: "stop3" }
      ];

      const result = findClosestStop(stops, -25.7480, 28.2295);
      
      expect(result.stop?.name).toBe("Central");
      expect(result.distance).toBeLessThan(1);
    });

    it("should calculate route score correctly", () => {
      const route = {
        routeId: "R001",
        stops: [
          { coordinates: [-25.7479, 28.2293], name: "Start", order: 1, id: "stop1" },
          { coordinates: [-25.7679, 28.2493], name: "End", order: 2, id: "stop2" }
        ]
      };

      const score = calculateRouteScore(route, -25.7479, 28.2293, -25.7679, 28.2493);
      
      expect(score.hasDirectRoute).toBe(true);
      expect(score.startProximity).toBeLessThan(0.1);
      expect(score.endProximity).toBeLessThan(0.1);
      expect(score.totalScore).toBeLessThan(1);
    });
  });
});