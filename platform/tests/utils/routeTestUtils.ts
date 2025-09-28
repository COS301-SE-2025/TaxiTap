import { Id } from '../../convex/_generated/dataModel';

export interface MockRoute {
  _id: Id<'routes'>;
  routeId: string;
  name: string;
  geometry: {
    coordinates: number[][];
  };
  estimatedDuration: number;
  taxiAssociation: string;
  fare: number;
  isActive: boolean;
  stops: Array<{
    id: string;
    name: string;
    coordinates: number[];
    order: number;
  }>;
}

export interface MockEnrichedRouteStops {
  routeId: string;
  stops: Array<{
    id: string;
    name: string;
    coordinates: number[];
    order: number;
  }>;
  updatedAt: number;
}

export interface MockRouteDisplayData {
  _id: Id<'routes'>;
  routeId: string;
  start: string;
  destination: string;
  startCoords: {
    latitude: number;
    longitude: number;
  } | null;
  destinationCoords: {
    latitude: number;
    longitude: number;
  } | null;
  stops: any[];
  fare: number;
  estimatedDuration: number;
  taxiAssociation: string;
  hasStops: boolean;
}

export interface MockDriver {
  _id: string;
  userId: Id<'taxiTap_users'>;
  assignedRoute: Id<'routes'> | null;
  taxiAssociation: string;
  averageRating: number;
  numberOfRidesCompleted: number;
  routeAssignedAt?: number;
}

export interface MockUser {
  _id: Id<'taxiTap_users'>;
  name: string;
  phoneNumber: string;
  isActive: boolean;
}

export const createMockRoute = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return {
    _id: 'route_123' as Id<'routes'>,
    routeId: 'route_a',
    name: 'Johannesburg to Pretoria',
    geometry: {
      coordinates: [
        [-26.2041, 28.0473], // Start coordinates
        [-25.7479, 28.2293]  // End coordinates
      ]
    },
    estimatedDuration: 3600, // 1 hour
    taxiAssociation: 'Association A',
    fare: 90,
    isActive: true,
    stops: [
      {
        id: 'stop_1',
        name: 'Johannesburg CBD',
        coordinates: [-26.2041, 28.0473],
        order: 1
      },
      {
        id: 'stop_2',
        name: 'Sandton',
        coordinates: [-26.1076, 28.0567],
        order: 2
      },
      {
        id: 'stop_3',
        name: 'Pretoria',
        coordinates: [-25.7479, 28.2293],
        order: 3
      }
    ],
    ...overrides
  };
};

export const createMockEnrichedRouteStops = (overrides: Partial<MockEnrichedRouteStops> = {}): MockEnrichedRouteStops => {
  return {
    routeId: 'route_a',
    stops: [
      {
        id: 'stop_1',
        name: 'Johannesburg CBD',
        coordinates: [-26.2041, 28.0473],
        order: 1
      },
      {
        id: 'stop_2',
        name: 'Sandton',
        coordinates: [-26.1076, 28.0567],
        order: 2
      },
      {
        id: 'stop_3',
        name: 'Pretoria',
        coordinates: [-25.7479, 28.2293],
        order: 3
      }
    ],
    updatedAt: Date.now(),
    ...overrides
  };
};

export const createMockRouteDisplayData = (overrides: Partial<MockRouteDisplayData> = {}): MockRouteDisplayData => {
  return {
    _id: 'route_123' as Id<'routes'>,
    routeId: 'route_a',
    start: 'Johannesburg',
    destination: 'Pretoria',
    startCoords: {
      latitude: -26.2041,
      longitude: 28.0473
    },
    destinationCoords: {
      latitude: -25.7479,
      longitude: 28.2293
    },
    stops: [],
    fare: 90,
    estimatedDuration: 3600,
    taxiAssociation: 'Association A',
    hasStops: false,
    ...overrides
  };
};

export const createMockDriver = (overrides: Partial<MockDriver> = {}): MockDriver => {
  return {
    _id: 'driver_123',
    userId: 'user_123' as Id<'taxiTap_users'>,
    assignedRoute: 'route_123' as Id<'routes'>,
    taxiAssociation: 'Association A',
    averageRating: 4.5,
    numberOfRidesCompleted: 100,
    routeAssignedAt: Date.now(),
    ...overrides
  };
};

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => {
  return {
    _id: 'user_123' as Id<'taxiTap_users'>,
    name: 'John Driver',
    phoneNumber: '+27123456789',
    isActive: true,
    ...overrides
  };
};

export const createMockRouteWithStops = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    stops: [
      {
        id: 'stop_1',
        name: 'Johannesburg CBD',
        coordinates: [-26.2041, 28.0473],
        order: 1
      },
      {
        id: 'stop_2',
        name: 'Sandton',
        coordinates: [-26.1076, 28.0567],
        order: 2
      },
      {
        id: 'stop_3',
        name: 'Midrand',
        coordinates: [-26.0104, 28.1094],
        order: 3
      },
      {
        id: 'stop_4',
        name: 'Pretoria',
        coordinates: [-25.7479, 28.2293],
        order: 4
      }
    ],
    ...overrides
  });
};

export const createMockRouteWithoutCoordinates = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    geometry: {
      coordinates: []
    },
    ...overrides
  });
};

export const createMockRouteWithInvalidCoordinates = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    geometry: {
      coordinates: [
        [-26.2041], // Missing longitude
        [-25.7479, 28.2293]
      ]
    },
    ...overrides
  });
};

export const createMockRouteWithMalformedCoordinates = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    geometry: {
      coordinates: [
        [-26.2041, 28.0473],
        [-25.7479] // Missing longitude
      ]
    },
    ...overrides
  });
};

export const createMockRouteWithZeroDuration = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    estimatedDuration: 0,
    fare: 15, // Should default to minimum fare
    ...overrides
  });
};

export const createMockRouteWithLongDuration = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    estimatedDuration: 7200, // 2 hours
    fare: 180, // R15 per 10 minutes * 12
    ...overrides
  });
};

export const createMockRouteWithNegativeDuration = (overrides: Partial<MockRoute> = {}): MockRoute => {
  return createMockRoute({
    estimatedDuration: -100,
    fare: 15, // Should default to minimum fare
    ...overrides
  });
};

export const createMockRouteWithEnrichedStops = (overrides: Partial<MockEnrichedRouteStops> = {}): MockEnrichedRouteStops => {
  return createMockEnrichedRouteStops({
    stops: [
      {
        id: 'stop_1',
        name: 'Johannesburg CBD',
        coordinates: [-26.2041, 28.0473],
        order: 1
      },
      {
        id: 'stop_2',
        name: 'Sandton',
        coordinates: [-26.1076, 28.0567],
        order: 2
      },
      {
        id: 'stop_3',
        name: 'Pretoria',
        coordinates: [-25.7479, 28.2293],
        order: 3
      }
    ],
    ...overrides
  });
};

export const createMockRouteWithFilteredStops = (overrides: Partial<MockEnrichedRouteStops> = {}): MockEnrichedRouteStops => {
  return createMockEnrichedRouteStops({
    stops: [
      {
        id: 'stop_1',
        name: 'Johannesburg CBD',
        coordinates: [-26.2041, 28.0473],
        order: 1
      },
      {
        id: 'stop_2',
        name: 'Stop', // Should be filtered out
        coordinates: [-26.1076, 28.0567],
        order: 2
      },
      {
        id: 'stop_3',
        name: 'Bus Stop', // Should be filtered out
        coordinates: [-26.1076, 28.0567],
        order: 3
      },
      {
        id: 'stop_4',
        name: 'AB', // Should be filtered out (too short)
        coordinates: [-26.1076, 28.0567],
        order: 4
      },
      {
        id: 'stop_5',
        name: 'Pretoria',
        coordinates: [-25.7479, 28.2293],
        order: 5
      }
    ],
    ...overrides
  });
};

export const createMockRouteDetailsWithDrivers = (overrides: any = {}) => {
  return {
    success: true,
    route: {
      routeId: 'route_a',
      routeName: 'Johannesburg to Pretoria',
      start: 'Johannesburg',
      destination: 'Pretoria',
      taxiAssociation: 'Association A',
      fare: 90,
      estimatedDuration: 3600,
      stops: [],
      geometry: { coordinates: [] },
      totalStops: 3,
      isActive: true
    },
    activeDrivers: [
      {
        driverId: 'driver_1',
        driverName: 'John Driver',
        averageRating: 4.5,
        totalRides: 100,
        isActive: true
      },
      {
        driverId: 'driver_2',
        driverName: 'Jane Driver',
        averageRating: 4.8,
        totalRides: 150,
        isActive: true
      }
    ],
    message: 'Route details retrieved successfully',
    ...overrides
  };
};

export const createMockPaginatedRoutes = (overrides: any = {}) => {
  return {
    routes: Array(10).fill(null).map((_, i) => createMockRouteDisplayData({
      _id: `route_${i}` as Id<'routes'>,
      routeId: `route_${i}`,
      start: `City ${i}`,
      destination: `Destination ${i}`
    })),
    pagination: {
      currentPage: 1,
      totalPages: 3,
      totalRoutes: 25,
      hasNextPage: true,
      hasPrevPage: false,
      limit: 10
    },
    ...overrides
  };
};

// Test scenarios
export const routeTestScenarios = {
  validRoute: () => createMockRoute(),
  routeWithoutCoordinates: () => createMockRouteWithoutCoordinates(),
  routeWithInvalidCoordinates: () => createMockRouteWithInvalidCoordinates(),
  routeWithMalformedCoordinates: () => createMockRouteWithMalformedCoordinates(),
  routeWithZeroDuration: () => createMockRouteWithZeroDuration(),
  routeWithLongDuration: () => createMockRouteWithLongDuration(),
  routeWithNegativeDuration: () => createMockRouteWithNegativeDuration(),
  routeWithStops: () => createMockRouteWithStops(),
  routeWithEnrichedStops: () => createMockRouteWithEnrichedStops(),
  routeWithFilteredStops: () => createMockRouteWithFilteredStops(),
  inactiveRoute: () => createMockRoute({ isActive: false }),
  routeWithDifferentAssociation: () => createMockRoute({ taxiAssociation: 'Association B' }),
  routeWithNoStops: () => createMockRoute({ stops: [] }),
  routeWithManyStops: () => createMockRouteWithStops({
    stops: Array(20).fill(null).map((_, i) => ({
      id: `stop_${i}`,
      name: `Stop ${i}`,
      coordinates: [-26.2041 + i * 0.01, 28.0473 + i * 0.01],
      order: i + 1
    }))
  })
};

// Helper functions for testing
export const simulateRouteSearch = (routes: MockRouteDisplayData[], searchTerm: string) => {
  return routes.filter(route => 
    route.start.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.taxiAssociation.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const simulateRouteFiltering = (routes: MockRouteDisplayData[], filters: {
  taxiAssociation?: string;
  maxFare?: number;
  maxDuration?: number;
  hasStops?: boolean;
}) => {
  return routes.filter(route => {
    if (filters.taxiAssociation && route.taxiAssociation !== filters.taxiAssociation) {
      return false;
    }
    if (filters.maxFare && route.fare > filters.maxFare) {
      return false;
    }
    if (filters.maxDuration && route.estimatedDuration > filters.maxDuration) {
      return false;
    }
    if (filters.hasStops !== undefined && route.hasStops !== filters.hasStops) {
      return false;
    }
    return true;
  });
};

export const simulateRoutePagination = (routes: MockRouteDisplayData[], page: number, limit: number) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRoutes = routes.slice(startIndex, endIndex);
  
  return {
    routes: paginatedRoutes,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(routes.length / limit),
      totalRoutes: routes.length,
      hasNextPage: endIndex < routes.length,
      hasPrevPage: page > 1,
      limit
    }
  };
};

export const simulateRouteAssignment = (driver: MockDriver, route: MockRoute) => {
  return {
    ...driver,
    assignedRoute: route._id,
    taxiAssociation: route.taxiAssociation,
    routeAssignedAt: Date.now()
  };
};

export const simulateRouteDetailsWithDrivers = (route: MockRoute, drivers: MockDriver[], users: MockUser[]) => {
  const activeDrivers = drivers
    .filter(driver => driver.assignedRoute === route._id)
    .map(driver => {
      const user = users.find(u => u._id === driver.userId);
      return {
        driverId: driver.userId,
        driverName: user?.name || 'Unknown',
        averageRating: driver.averageRating,
        totalRides: driver.numberOfRidesCompleted,
        isActive: user?.isActive || false
      };
    })
    .filter(driver => driver.isActive);

  return {
    success: true,
    route: {
      routeId: route.routeId,
      routeName: route.name,
      start: route.name.split(' to ')[0],
      destination: route.name.split(' to ')[1],
      taxiAssociation: route.taxiAssociation,
      fare: route.fare,
      estimatedDuration: route.estimatedDuration,
      stops: route.stops,
      geometry: route.geometry,
      totalStops: route.stops.length,
      isActive: route.isActive
    },
    activeDrivers,
    message: 'Route details retrieved successfully'
  };
};
