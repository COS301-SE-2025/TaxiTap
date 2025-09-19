import { MutationCtx, QueryCtx } from '../../../../convex/_generated/server';

// Mock data for testing
const mockJourneyData = {
  journey: {
    _id: "journey_123",
    journeyId: "journey_test_123",
    passengerId: "passenger_123",
    status: "active",
    totalLegs: 2,
    currentLegIndex: 0,
    originAddress: "University of Pretoria",
    destinationAddress: "OR Tambo Airport"
  },
  currentLeg: {
    _id: "leg_123",
    journeyId: "journey_test_123",
    legIndex: 0,
    fromAddress: "University of Pretoria",
    toAddress: "Hatfield Plaza",
    fromCoordinates: { latitude: -25.7479, longitude: 28.2293 },
    toCoordinates: { latitude: -25.7500, longitude: 28.2380 },
    status: "active",
    rideId: "ride_123",
    estimatedFare: 25.0
  },
  ride: {
    _id: "ride_123",
    rideId: "ride_test_123",
    driverId: "driver_123",
    status: "accepted",
    parentJourneyId: "journey_test_123",
    legIndex: 0
  },
  driverLocation: {
    latitude: -25.7480,
    longitude: 28.2290,
    updatedAt: Date.now()
  },
  transferPoint: {
    latitude: -25.7500,
    longitude: 28.2380
  }
};

// Handler for getting active multi-leg journeys for monitoring
export const getActiveMultiLegJourneysForMonitoringHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    const limit = args.limit || 10;

    // Return mock journey data array
    return Array(Math.min(limit, 3)).fill(0).map((_, index) => ({
      journey: {
        ...mockJourneyData.journey,
        _id: `journey_${index}`,
        journeyId: `journey_test_${index}`
      },
      currentLeg: {
        ...mockJourneyData.currentLeg,
        _id: `leg_${index}`,
        journeyId: `journey_test_${index}`,
        rideId: `ride_${index}`
      },
      ride: {
        ...mockJourneyData.ride,
        _id: `ride_${index}`,
        rideId: `ride_test_${index}`,
        parentJourneyId: `journey_test_${index}`
      },
      driverLocation: mockJourneyData.driverLocation,
      transferPoint: mockJourneyData.transferPoint
    }));
  }
);

// Handler for checking multi-leg transfer proximity
export const checkMultiLegTransferProximityHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    const batchSize = args.batchSize || 5;

    return {
      processedJourneys: Math.min(batchSize, 3),
      transferAlertsCreated: 2,
      nextLegRequestsTriggered: 1,
      hasMore: false
    };
  }
);

// Handler for managing transfer windows
export const manageTransferWindowHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    const currentTime = Date.now();

    switch (args.action) {
      case "start_window":
        return {
          success: true,
          transferWindow: {
            isActive: true,
            startTime: currentTime,
            endTime: currentTime + (15 * 60 * 1000),
            remainingTime: 15 * 60,
            status: 'active' as const
          },
          message: "Transfer window started successfully"
        };

      case "extend_window":
        return {
          success: true,
          transferWindow: {
            isActive: true,
            startTime: currentTime - (5 * 60 * 1000),
            endTime: currentTime + (10 * 60 * 1000),
            remainingTime: 10 * 60,
            status: 'extended' as const
          },
          message: "Transfer window extended successfully"
        };

      case "close_window":
        return {
          success: true,
          transferWindow: {
            isActive: false,
            startTime: currentTime - (15 * 60 * 1000),
            endTime: currentTime,
            remainingTime: 0,
            status: 'closed' as const
          },
          message: "Transfer window closed successfully"
        };

      case "check_status":
        return {
          success: true,
          transferWindow: {
            isActive: true,
            startTime: currentTime - (5 * 60 * 1000),
            endTime: currentTime + (10 * 60 * 1000),
            remainingTime: 10 * 60,
            status: 'active' as const
          },
          nextLegStatus: "pending"
        };

      default:
        return {
          success: false,
          error: "Invalid action specified"
        };
    }
  }
);

// Handler for checking specific journey transfer proximity
export const checkSpecificJourneyTransferProximityHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    // Mock distance calculation
    const mockDistance = 0.5; // 500m from transfer point

    return {
      success: true,
      status: "near",
      distance: "0.5km",
      eta: "2 minutes",
      nextLegRequested: true
    };
  }
);

// Handler for passenger transfer coordination
export const handlePassengerTransferCoordinationHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    switch (args.action) {
      case "arrived_at_transfer":
        return {
          success: true,
          coordinationStatus: {
            currentLegCompleted: true,
            nextLegStatus: "requested",
            waitingTime: 5,
            assistanceRequested: false
          },
          message: "Transfer arrival confirmed"
        };

      case "confirm_ready_for_next":
        return {
          success: true,
          coordinationStatus: {
            currentLegCompleted: true,
            nextLegStatus: "confirmed",
            waitingTime: 3,
            assistanceRequested: false
          },
          message: "Ready for next leg confirmed"
        };

      case "request_assistance":
        return {
          success: true,
          coordinationStatus: {
            currentLegCompleted: true,
            nextLegStatus: "pending",
            waitingTime: 8,
            assistanceRequested: true
          },
          message: "Assistance request sent"
        };

      default:
        return {
          success: false,
          error: "Invalid coordination action"
        };
    }
  }
);

// Handler for journey progression proximity monitoring
export const monitorJourneyProgressionProximityHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      processedJourneys: 2,
      proximityUpdatesCreated: 3,
      journeyProgressionTriggered: 1,
      transferWindowsManaged: 2
    };
  }
);

// Handler for sync proximity with journey status
export const syncProximityWithJourneyStatusHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      syncedJourneys: 1,
      statusUpdates: 2,
      proximityAlertsTriggered: 1
    };
  }
);

// Handler for trigger journey progression
export const triggerJourneyProgressionHandler = jest.fn().mockImplementation(
  async (ctx: any, args: any) => {
    return {
      success: true,
      progressionTriggered: true,
      newJourneyStatus: "progressing",
      nextLegStatus: "requesting"
    };
  }
);

// Utility function exports for testing
export const calculateDistance = jest.fn().mockImplementation((lat1: number, lon1: number, lat2: number, lon2: number) => {
  return 0.5; // Mock 500m distance
});

export const getProximityStatus = jest.fn().mockImplementation((distance: number) => {
  if (distance <= 0.1) return 'arrived';
  if (distance <= 1) return 'near';
  if (distance <= 3) return 'approaching';
  return 'far';
});

export const calculateETA = jest.fn().mockImplementation((distance: number, averageSpeed: number = 30) => {
  return 2; // Mock 2 minutes ETA
});