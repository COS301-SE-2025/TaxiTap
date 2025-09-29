import { Id } from '../../convex/_generated/dataModel';

export interface MockJourney {
  _id: Id<'multiLegJourneys'>;
  journeyId: string;
  passengerId: Id<'taxiTap_users'>;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'timeout';
  currentLegIndex: number;
  totalLegs: number;
  originLocation: {
    coordinates: { latitude: number; longitude: number };
    address: string;
  };
  finalDestination: {
    coordinates: { latitude: number; longitude: number };
    address: string;
  };
  transferPoint: {
    stop1_id: string;
    stop2_id: string;
    walkingDistance: number;
    estimatedWalkingTime?: number;
  };
  legs: Array<{
    legIndex: number;
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
    actualCost?: number;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    rideId?: Id<'rides'>;
    driverId?: Id<'taxiTap_users'>;
    startedAt?: number;
    completedAt?: number;
  }>;
  totalEstimatedCost: number;
  totalActualCost?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  transferTimeoutAt?: number;
  transferWindowExpiredAt?: number;
}

export interface MockJourneyOption {
  journeyId: string;
  leg1: {
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
  };
  leg2: {
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
  };
  totalEstimatedCost: number;
  transferPoint: {
    stop1_id: string;
    stop2_id: string;
    walkingDistance: number;
    estimatedWalkingTime: number;
  };
}

export const createMockJourney = (overrides: Partial<MockJourney> = {}): MockJourney => {
  const now = Date.now();
  
  return {
    _id: 'journey_db_123' as Id<'multiLegJourneys'>,
    journeyId: 'journey_123',
    passengerId: 'user_123' as Id<'taxiTap_users'>,
    status: 'planned',
    currentLegIndex: 0,
    totalLegs: 2,
    originLocation: {
      coordinates: { latitude: -26.2041, longitude: 28.0473 },
      address: 'Johannesburg CBD'
    },
    finalDestination: {
      coordinates: { latitude: -26.2041, longitude: 28.0473 },
      address: 'Final Destination'
    },
    transferPoint: {
      stop1_id: 'stop_2',
      stop2_id: 'stop_3',
      walkingDistance: 0.5,
      estimatedWalkingTime: 6
    },
    legs: [
      {
        legIndex: 0,
        routeName: 'Route A',
        origin: {
          coordinates: { latitude: -26.2041, longitude: 28.0473 },
          address: 'Johannesburg CBD'
        },
        destination: {
          coordinates: { latitude: -26.2041, longitude: 28.0473 },
          address: 'Transfer Point'
        },
        originStopId: 'stop_1',
        destinationStopId: 'stop_2',
        estimatedCost: 25.50,
        status: 'pending'
      },
      {
        legIndex: 1,
        routeName: 'Route B',
        origin: {
          coordinates: { latitude: -26.2041, longitude: 28.0473 },
          address: 'Transfer Point'
        },
        destination: {
          coordinates: { latitude: -26.2041, longitude: 28.0473 },
          address: 'Final Destination'
        },
        originStopId: 'stop_3',
        destinationStopId: 'stop_4',
        estimatedCost: 30.00,
        status: 'pending'
      }
    ],
    totalEstimatedCost: 55.50,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

export const createMockJourneyOption = (overrides: Partial<MockJourneyOption> = {}): MockJourneyOption => {
  return {
    journeyId: 'journey_123',
    leg1: {
      routeName: 'Route A',
      origin: {
        coordinates: { latitude: -26.2041, longitude: 28.0473 },
        address: 'Johannesburg CBD'
      },
      destination: {
        coordinates: { latitude: -26.2041, longitude: 28.0473 },
        address: 'Transfer Point'
      },
      originStopId: 'stop_1',
      destinationStopId: 'stop_2',
      estimatedCost: 25.50
    },
    leg2: {
      routeName: 'Route B',
      origin: {
        coordinates: { latitude: -26.2041, longitude: 28.0473 },
        address: 'Transfer Point'
      },
      destination: {
        coordinates: { latitude: -26.2041, longitude: 28.0473 },
        address: 'Final Destination'
      },
      originStopId: 'stop_3',
      destinationStopId: 'stop_4',
      estimatedCost: 30.00
    },
    totalEstimatedCost: 55.50,
    transferPoint: {
      stop1_id: 'stop_2',
      stop2_id: 'stop_3',
      walkingDistance: 0.5,
      estimatedWalkingTime: 6
    },
    ...overrides
  };
};

export const createMockRoute = (overrides: any = {}) => {
  return {
    _id: 'route_123',
    routeId: 'route_a',
    name: 'Route A',
    stops: [
      { id: 'stop_1', name: 'Stop 1', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: 'stop_2', name: 'Stop 2', coordinates: [-26.2041, 28.0473], order: 2 },
      { id: 'stop_3', name: 'Stop 3', coordinates: [-26.2041, 28.0473], order: 3 }
    ],
    isActive: true,
    taxiAssociation: 'Association A',
    fare: 25.0,
    estimatedDuration: 30,
    ...overrides
  };
};

export const createMockDriver = (overrides: any = {}) => {
  return {
    userId: 'driver_123',
    assignedRoute: 'route_123',
    isActive: true,
    ...overrides
  };
};

export const createMockLocation = (overrides: any = {}) => {
  return {
    userId: 'driver_123',
    role: 'driver',
    latitude: -26.2041,
    longitude: 28.0473,
    ...overrides
  };
};

export const createMockRide = (overrides: any = {}) => {
  return {
    _id: 'ride_123' as Id<'rides'>,
    rideId: 'ride_123',
    passengerId: 'user_123' as Id<'taxiTap_users'>,
    driverId: 'driver_123' as Id<'taxiTap_users'>,
    tripId: 'trip_123' as Id<'trips'>,
    startLocation: {
      coordinates: { latitude: -26.2041, longitude: 28.0473 },
      address: 'Start Location'
    },
    endLocation: {
      coordinates: { latitude: -26.2041, longitude: 28.0473 },
      address: 'End Location'
    },
    estimatedFare: 25.50,
    finalFare: 25.50,
    amountPaid: 25.50,
    tripPaid: true,
    paymentType: 'exact',
    status: 'in_progress',
    createdAt: Date.now(),
    ...overrides
  };
};

export const createMockTrip = (overrides: any = {}) => {
  return {
    _id: 'trip_123' as Id<'trips'>,
    driverId: 'driver_123' as Id<'taxiTap_users'>,
    startTime: Date.now(),
    endTime: 0,
    fare: 25.50,
    ...overrides
  };
};

export const createMockEnrichedRouteStops = (overrides: any = {}) => {
  return {
    routeId: 'route_a',
    stops: [
      { id: 'stop_1', name: 'Stop 1', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: 'stop_2', name: 'Stop 2', coordinates: [-26.2041, 28.0473], order: 2 },
      { id: 'stop_3', name: 'Stop 3', coordinates: [-26.2041, 28.0473], order: 3 }
    ],
    ...overrides
  };
};

export const createMockJourneySearchResult = (overrides: any = {}) => {
  return {
    success: true,
    journeyOptions: [createMockJourneyOption()],
    message: 'Found 1 multi-leg journey options',
    searchCriteria: {
      origin: { latitude: -26.2041, longitude: 28.0473 },
      destination: { latitude: -26.2041, longitude: 28.0473 },
      maxWalkingDistance: 1.0,
      maxTransferDistance: 4.0
    },
    ...overrides
  };
};

export const createMockJourneyContextValue = (overrides: any = {}) => {
  return {
    activeJourney: createMockJourney(),
    isLoadingJourney: false,
    hasActiveJourney: true,
    getCurrentLeg: jest.fn(() => createMockJourney().legs[0]),
    getNextLeg: jest.fn(() => createMockJourney().legs[1]),
    isOnLastLeg: false,
    journeyProgress: {
      currentLeg: 1,
      totalLegs: 2,
      progressPercentage: 50
    },
    refreshJourney: jest.fn(),
    clearJourneyCache: jest.fn(),
    ...overrides
  };
};

// Test scenarios
export const journeyTestScenarios = {
  newJourney: () => createMockJourney({ status: 'planned' }),
  activeJourney: () => createMockJourney({ status: 'in_progress' }),
  completedJourney: () => createMockJourney({ 
    status: 'completed',
    currentLegIndex: 1,
    legs: [
      { ...createMockJourney().legs[0], status: 'completed' },
      { ...createMockJourney().legs[1], status: 'completed' }
    ]
  }),
  cancelledJourney: () => createMockJourney({ 
    status: 'cancelled',
    legs: [
      { ...createMockJourney().legs[0], status: 'cancelled' },
      { ...createMockJourney().legs[1], status: 'cancelled' }
    ]
  }),
  timeoutJourney: () => createMockJourney({ 
    status: 'timeout',
    transferWindowExpiredAt: Date.now()
  }),
  singleLegJourney: () => createMockJourney({
    totalLegs: 1,
    legs: [createMockJourney().legs[0]]
  }),
  multiLegJourney: () => createMockJourney({
    totalLegs: 3,
    legs: [
      createMockJourney().legs[0],
      createMockJourney().legs[1],
      {
        ...createMockJourney().legs[1],
        legIndex: 2,
        routeName: 'Route C',
        estimatedCost: 35.00
      }
    ]
  })
};

// Helper functions for testing
export const simulateJourneyProgression = (journey: MockJourney, legIndex: number) => {
  const updatedLegs = journey.legs.map((leg, index) => {
    if (index === legIndex) {
      return { ...leg, status: 'in_progress' as const, startedAt: Date.now() };
    }
    return leg;
  });

  return {
    ...journey,
    legs: updatedLegs,
    status: 'in_progress' as const,
    currentLegIndex: legIndex,
    updatedAt: Date.now(),
    ...(legIndex === 0 && { startedAt: Date.now() })
  };
};

export const simulateLegCompletion = (journey: MockJourney, legIndex: number, actualCost: number) => {
  const updatedLegs = journey.legs.map((leg, index) => {
    if (index === legIndex) {
      return { 
        ...leg, 
        status: 'completed' as const, 
        actualCost,
        completedAt: Date.now()
      };
    }
    return leg;
  });

  const totalActualCost = updatedLegs
    .filter(leg => leg.actualCost !== undefined)
    .reduce((sum, leg) => sum + (leg.actualCost || 0), 0);

  const isLastLeg = legIndex === journey.totalLegs - 1;

  return {
    ...journey,
    legs: updatedLegs,
    totalActualCost,
    updatedAt: Date.now(),
    ...(isLastLeg && {
      status: 'completed' as const,
      completedAt: Date.now()
    })
  };
};
