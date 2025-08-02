// convex/functions/rides/RequestRideHandler.ts

export const requestRideHandler = async (
  ctx: any,
  args: {
    passengerId: string;
    driverId: string;
    startLocation: { coordinates: { latitude: number; longitude: number }; address: string };
    endLocation: { coordinates: { latitude: number; longitude: number }; address: string };
    estimatedFare?: number;
    estimatedDistance?: number;
    estimatedDuration?: number;
  }
) => {
  try {
    console.log('🚕 Processing ride request:', {
      passengerId: args.passengerId,
      driverId: args.driverId,
      startLocation: args.startLocation,
      endLocation: args.endLocation
    });

    // Check for existing pending ride request between this passenger and driver
  const existingRide = await ctx.db
    .query("rides")
    .filter((q) => 
      q.and(
        q.eq(q.field("passengerId"), args.passengerId),
        q.eq(q.field("driverId"), args.driverId),
        q.eq(q.field("status"), "requested")
      )
    )
    .first();

  if (existingRide) {
    console.log(`Duplicate ride request detected for passenger ${args.passengerId} and driver ${args.driverId}`);
    return {
      _id: existingRide._id,
      rideId: existingRide.rideId,
      message: `Ride request already exists from ${args.startLocation.address} to ${args.endLocation.address}`,
      isDuplicate: true
    };
  }

  const rideId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate route distance using the enhanced taxi matching system
    let routeDistance = args.estimatedDistance || 0;
    let calculatedFare = args.estimatedFare || 0;
    let calculatedDuration = args.estimatedDuration || 0;

    // Use the enhanced taxi matching to get route information
    const taxiMatchingResult = await ctx.runQuery(
      require("../../_generated/api").internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney,
      {
        originLat: args.startLocation.coordinates.latitude,
        originLng: args.startLocation.coordinates.longitude,
        destinationLat: args.endLocation.coordinates.latitude,
        destinationLng: args.endLocation.coordinates.longitude,
        maxOriginDistance: 3.0,
        maxDestinationDistance: 3.0,
        maxTaxiDistance: 5.0,
        maxResults: 50
      }
    );

    // Find the specific driver in the results to get route distance
    const matchedTaxi = taxiMatchingResult.availableTaxis.find(
      (taxi: any) => taxi.userId === args.driverId
    );

    if (!matchedTaxi) {
      throw new Error(`Driver ${args.driverId} is not available for this route or no matching route found`);
    }

    if (matchedTaxi.routeInfo.passengerDisplacement >= 0) {
      // Use the calculated passenger displacement and fare
      routeDistance = matchedTaxi.routeInfo.passengerDisplacement;
      calculatedFare = matchedTaxi.routeInfo.calculatedFare;
      
      // If no duration provided, use route's estimated duration
      if (!args.estimatedDuration && matchedTaxi.routeInfo.estimatedDuration > 0) {
        calculatedDuration = matchedTaxi.routeInfo.estimatedDuration;
      }

      console.log('📏 Passenger displacement and fare calculated:', {
        passengerDisplacement: routeDistance,
        calculatedFare,
        routeName: matchedTaxi.routeInfo.routeName,
        calculatedDuration
      });
    } else {
      throw new Error('Unable to calculate passenger displacement for this journey');
    }

    // Create the ride record with calculated passenger displacement and fare
    const ride = await ctx.db.insert("rides", {
      rideId,
      passengerId: args.passengerId,
      driverId: args.driverId,
      startLocation: args.startLocation,
      endLocation: args.endLocation,
      status: "requested",
      requestedAt: Date.now(),
      estimatedFare: args.estimatedFare || Math.round(calculatedFare * 100) / 100,
      distance: Math.round(routeDistance * 100) / 100,
    });

    console.log('💾 Ride created with passenger displacement and fare:', {
      rideId,
      passengerDisplacement: Math.round(routeDistance * 100) / 100,
      calculatedFare: args.estimatedFare || Math.round(calculatedFare * 100) / 100
    });

    // Notify the driver using the internal ride notification system
    await ctx.runMutation(
      require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId,
        type: "ride_requested",
        driverId: args.driverId,
        passengerId: args.passengerId,
      }
    );

    return {
      _id: ride,
      rideId,
      message: `Ride requested successfully from ${args.startLocation.address} to ${args.endLocation.address}`,
      distance: Math.round(routeDistance * 100) / 100,
      estimatedFare: args.estimatedFare || Math.round(calculatedFare * 100) / 100,
    };

  } catch (error) {
    console.error("❌ Error creating ride request:", error);
    throw new Error(`Failed to create ride request: ${error}`);
  }
};