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
    isMultiLegRide?: boolean;
    legIndex?: number;
    totalLegs?: number;
    parentJourneyId?: string;
  }
) => {
  try {
    console.log('🚕 Processing ride request:', {
      passengerId: args.passengerId,
      driverId: args.driverId,
      startLocation: args.startLocation,
      endLocation: args.endLocation
    });

    // Check if passenger already has an active ride
    const existingActiveRide = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q: any) => q.eq("passengerId", args.passengerId))
      .filter((q: any) => 
        q.or(
          q.eq(q.field("status"), "requested"),
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .first();

    if (existingActiveRide) {
      throw new Error(`You already have an active ride (${existingActiveRide.status}). Please complete or cancel your current ride before requesting a new one.`);
    }

    const rideId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate route distance using the enhanced taxi matching system
    let routeDistance = args.estimatedDistance || 0;
    let calculatedFare = args.estimatedFare || 0;
    let calculatedDuration = args.estimatedDuration || 0;

    // Use the enhanced taxi matching to get route information
    // For multi-leg journeys, we only validate the current leg
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
        maxResults: 50,
        isMultiLegNotFinalLeg: args.isMultiLegRide && args.totalLegs && args.legIndex !== undefined && args.legIndex < args.totalLegs - 1
      }
    );

    console.log('🔍 Taxi matching result for ride request:', {
      availableTaxisCount: taxiMatchingResult.availableTaxis?.length || 0,
      targetDriverId: args.driverId,
      isMultiLeg: args.isMultiLegRide,
      legIndex: args.legIndex,
      startLocation: args.startLocation,
      endLocation: args.endLocation,
      foundDriverIds: taxiMatchingResult.availableTaxis?.map((taxi: any) => taxi.userId) || []
    });

    // Add specific debugging for multi-leg journeys
    if (args.isMultiLegRide) {
      const isNotFinalLeg = args.totalLegs && args.legIndex !== undefined && args.legIndex < args.totalLegs - 1;
      console.log('🔍 Multi-leg ride validation:', {
        legIndex: args.legIndex,
        totalLegs: args.totalLegs,
        isNotFinalLeg,
        parentJourneyId: args.parentJourneyId,
        startAddress: args.startLocation.address,
        endAddress: args.endLocation.address,
        note: isNotFinalLeg ? 'Non-final leg: only checking startProximity' : 'Final leg: checking both startProximity and endProximity'
      });
    }

    // Find the specific driver in the results to get route distance
    const matchedTaxi = taxiMatchingResult.availableTaxis.find(
      (taxi: any) => taxi.userId === args.driverId
    );

    if (!matchedTaxi) {
      console.error('❌ Driver not found in taxi matching results:', {
        searchedDriverId: args.driverId,
        availableDriverIds: taxiMatchingResult.availableTaxis?.map((taxi: any) => taxi.userId) || [],
        routeSearched: `${args.startLocation.address} → ${args.endLocation.address}`,
        isMultiLeg: args.isMultiLegRide,
        legIndex: args.legIndex,
        taxiMatchingSuccess: taxiMatchingResult.success,
        totalAvailableTaxis: taxiMatchingResult.availableTaxis?.length || 0
      });

      throw new Error(`Driver ${args.driverId} is not available for this route or no matching route found. Route searched: ${args.startLocation.address} → ${args.endLocation.address}. Available drivers: ${taxiMatchingResult.availableTaxis?.map((taxi: any) => taxi.userId).join(', ') || 'none'}`);
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
      isMultiLegRide: args.isMultiLegRide || false,
      legIndex: args.legIndex,
      totalLegs: args.totalLegs,
      parentJourneyId: args.parentJourneyId,
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
        metadata: null,
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