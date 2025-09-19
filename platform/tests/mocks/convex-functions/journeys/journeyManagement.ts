import { MutationCtx, QueryCtx } from '../../../../convex/_generated/server';

// Mock journey data
const mockJourneyPlan = {
  originAddress: "University of Pretoria, Pretoria",
  destinationAddress: "OR Tambo International Airport, Johannesburg",
  originCoordinates: { latitude: -25.7479, longitude: 28.2293 },
  destinationCoordinates: { latitude: -26.1392, longitude: 28.2460 },
  legs: [
    {
      legIndex: 0,
      fromAddress: "University of Pretoria",
      toAddress: "Hatfield Plaza",
      fromCoordinates: { latitude: -25.7479, longitude: 28.2293 },
      toCoordinates: { latitude: -25.7500, longitude: 28.2380 },
      routeId: "route_123",
      estimatedDuration: 1800,
      estimatedFare: 25.0
    },
    {
      legIndex: 1,
      fromAddress: "Hatfield Plaza",
      toAddress: "OR Tambo Airport",
      fromCoordinates: { latitude: -25.7500, longitude: 28.2380 },
      toCoordinates: { latitude: -26.1392, longitude: 28.2460 },
      routeId: "route_456",
      estimatedDuration: 3600,
      estimatedFare: 45.0
    }
  ],
  optimizationPreference: "shortest_time",
  estimatedTotalFare: 70.0,
  estimatedTotalDuration: 5400
};

// Handler for creating multi-leg journey
export const createMultiLegJourneyHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      journeyId,
      totalLegs: args.journeyPlan.legs.length,
      legRecords: args.journeyPlan.legs.map((leg: any, index: number) => ({
        _id: `leg_${index}`,
        journeyId,
        legIndex: index,
        ...leg,
        status: "pending"
      })),
      message: `Multi-leg journey created successfully with ${args.journeyPlan.legs.length} legs`
    };
  }
);

// Handler for progressing journey to next leg
export const progressJourneyToNextLegHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    const isLastLeg = args.completedLegIndex >= 1; // Mock 2-leg journey

    return {
      success: true,
      journeyCompleted: isLastLeg,
      nextLegIndex: isLastLeg ? null : args.completedLegIndex + 1,
      message: isLastLeg ? "Journey completed successfully" : "Progressed to next leg",
      taxiRequestResult: isLastLeg ? null : {
        success: true,
        availableTaxis: [
          {
            userId: "driver_456",
            routeInfo: {
              routeName: "Next Route",
              calculatedFare: 45.0,
              estimatedDuration: 3600
            }
          }
        ]
      }
    };
  }
);

// Handler for getting journey status
export const getJourneyStatusHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      journey: {
        _id: "journey_123",
        journeyId: args.journeyId,
        status: "active",
        totalLegs: 2,
        currentLegIndex: 0
      },
      progress: {
        currentLeg: 0,
        completedLegs: 0,
        percentComplete: 0,
        estimatedRemainingTime: 5400
      },
      legs: mockJourneyPlan.legs.map((leg, index) => ({
        _id: `leg_${index}`,
        journeyId: args.journeyId,
        ...leg,
        status: index === 0 ? "active" : "pending"
      }))
    };
  }
);

// Handler for associating ride with leg
export const associateRideWithLegHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      message: `Ride ${args.rideId} associated with leg ${args.legIndex} of journey ${args.journeyId}`
    };
  }
);

// Handler for cancelling multi-leg journey
export const cancelMultiLegJourneyHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      cancelledRides: 1,
      message: `Journey ${args.journeyId} cancelled successfully`
    };
  }
);

// Handler for getting passenger journeys
export const getPassengerJourneysHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      journeys: [
        {
          _id: "journey_123",
          journeyId: "journey_test_123",
          passengerId: args.passengerId,
          status: args.status || "completed",
          totalLegs: 2,
          legs: mockJourneyPlan.legs
        }
      ],
      totalFound: 1
    };
  }
);

// Handler for calculating journey total cost
export const calculateJourneyTotalCostHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      totalEstimatedCost: 70.0,
      totalActualCost: 69.0,
      completedLegs: 2,
      totalLegs: 2,
      costVariance: -1.0
    };
  }
);

// Handler for requesting next leg taxi
export const requestNextLegTaxiHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      searchRadius: args.expandedRadius || 1.0,
      availableTaxis: [
        {
          userId: "driver_456",
          routeInfo: {
            routeName: "Transfer Route",
            calculatedFare: 45.0,
            estimatedDuration: 3600
          }
        }
      ],
      message: "Next leg taxi requested successfully"
    };
  }
);

// Exported handler for testing
export const requestNextLegTaxiHandlerExported = requestNextLegTaxiHandler;

// Handler for updating leg estimated arrival
export const updateLegEstimatedArrivalHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      message: "Leg estimated arrival updated successfully"
    };
  }
);