import { query } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../_generated/server";

/**
 * Get information about the next leg of a multi-leg journey for TaxiInformation screen
 */
export const getNextLegInfo = query({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
  },
  handler: async (ctx: QueryCtx, { journeyId, currentLegIndex }) => {
    // Get the journey
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    const nextLegIndex = currentLegIndex + 1;

    // Check if there is a next leg
    if (nextLegIndex >= journey.totalLegs) {
      return {
        hasNextLeg: false,
        message: "This is the final leg of your journey",
      };
    }

    const nextLeg = journey.legs[nextLegIndex];
    if (!nextLeg) {
      return {
        hasNextLeg: false,
        message: "Next leg information not found",
      };
    }

    // Query available drivers for the next leg's route using proper schema
    const locations = await ctx.db.query("locations").collect();
    const routeDriverLocations = locations.filter((loc) => {
      return loc.role === "driver" || loc.role === "both";
    });

    // First get available taxis
    const availableTaxis = await ctx.db
      .query("taxis")
      .withIndex("by_is_available", (q) => q.eq("isAvailable", true))
      .collect();

    console.log(`getNextLegInfo DEBUG - Found ${availableTaxis.length} available taxis total`);

    // First, find the route ID by route name
    const route = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("name"), nextLeg.routeName))
      .first();
    
    if (!route) {
      console.log(`No route found with name: ${nextLeg.routeName}`);
      return {
        hasNextLeg: true,
        nextLeg: {
          legIndex: nextLegIndex,
          routeName: nextLeg.routeName,
          origin: nextLeg.origin,
          destination: nextLeg.destination,
          estimatedCost: nextLeg.estimatedCost,
          originStopId: nextLeg.originStopId,
          destinationStopId: nextLeg.destinationStopId,
        },
        availableDrivers: [],
        journey: {
          journeyId: journey.journeyId,
          currentLegIndex: nextLegIndex,
          totalLegs: journey.totalLegs,
          transferPoint: journey.transferPoint,
        },
      };
    }

    console.log(`Found route ID ${route._id} for route name "${nextLeg.routeName}"`);

    // Get driver profiles for those available taxis that match the route
    const availableDrivers = [];
    let routeMatchAttempts = 0;
    let locationMatchAttempts = 0;
    
    for (const taxi of availableTaxis) {
      const driver = await ctx.db.get(taxi.driverId);
      if (!driver) continue;

      routeMatchAttempts++;
      
      // Check if driver is on the correct route (now using route ID)
      const isOnRoute = driver.assignedRoute === route._id;
      
      console.log(`Driver ${driver.userId} route check:`, {
        routeName: nextLeg.routeName,
        routeId: route._id,
        driverTaxiAssociation: driver.taxiAssociation,
        driverAssignedRoute: driver.assignedRoute,
        isOnRoute
      });
      
      if (!isOnRoute) continue;

      const driverLocation = routeDriverLocations.find(loc => loc.userId === driver.userId);
      const userProfile = await ctx.db.get(driver.userId);
      
      locationMatchAttempts++;
      
      console.log(`Driver ${driver.userId} location check:`, {
        hasLocation: !!driverLocation,
        hasProfile: !!userProfile,
        locationData: driverLocation ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : null
      });

      if (driverLocation && userProfile) {
        availableDrivers.push({
          driverId: driver._id,
          userId: driver.userId,
          name: userProfile.name,
          phoneNumber: userProfile.phoneNumber,
          vehicleRegistration: taxi.licensePlate,
          vehicleModel: taxi.model,
          currentLocation: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          distanceToOrigin: 0, // Could calculate this based on next leg origin
          routeInfo: {
            routeName: nextLeg.routeName,
            calculatedFare: nextLeg.estimatedCost,
          },
        });
      }
    }
    
    console.log(`getNextLegInfo SUMMARY:`, {
      totalAvailableTaxis: availableTaxis.length,
      routeMatchAttempts,
      locationMatchAttempts,
      finalAvailableDrivers: availableDrivers.length,
      nextLegRoute: nextLeg.routeName
    });

    // Return next leg information
    return {
      hasNextLeg: true,
      nextLeg: {
        legIndex: nextLegIndex,
        routeName: nextLeg.routeName,
        origin: nextLeg.origin,
        destination: nextLeg.destination,
        estimatedCost: nextLeg.estimatedCost,
        originStopId: nextLeg.originStopId,
        destinationStopId: nextLeg.destinationStopId,
      },
      availableDrivers: availableDrivers,
      journey: {
        journeyId: journey.journeyId,
        currentLegIndex: nextLegIndex,
        totalLegs: journey.totalLegs,
        transferPoint: journey.transferPoint,
      },
    };
  },
});
