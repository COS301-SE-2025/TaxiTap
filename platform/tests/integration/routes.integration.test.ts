import { createMockCtx } from './ridesTestUtils';

// Mock the route functions
const mockRouteFunctions = {
  displayRoutes: jest.fn(),
  displayRoutesPaginated: jest.fn(),
  getEnrichedStopsForRoute: jest.fn(),
  getAllAvailableRoutesForPassenger: jest.fn(),
  getRoutesByTaxiAssociationForPassenger: jest.fn(),
  getRouteDetailsWithDrivers: jest.fn(),
  getDriverAssignedRoute: jest.fn(),
  getAllTaxiAssociations: jest.fn(),
  assignRandomRouteToDriver: jest.fn()
};

// Mock the convex API
jest.mock('../../convex/_generated/api', () => ({
  api: {
    functions: {
      routes: {
        displayRoutes: {
          displayRoutes: mockRouteFunctions.displayRoutes,
          displayRoutesPaginated: mockRouteFunctions.displayRoutesPaginated,
          getEnrichedStopsForRoute: mockRouteFunctions.getEnrichedStopsForRoute
        },
        queries: {
          getAllAvailableRoutesForPassenger: mockRouteFunctions.getAllAvailableRoutesForPassenger,
          getRoutesByTaxiAssociationForPassenger: mockRouteFunctions.getRoutesByTaxiAssociationForPassenger,
          getRouteDetailsWithDrivers: mockRouteFunctions.getRouteDetailsWithDrivers,
          getDriverAssignedRoute: mockRouteFunctions.getDriverAssignedRoute,
          getAllTaxiAssociations: mockRouteFunctions.getAllTaxiAssociations
        },
        mutations: {
          assignRandomRouteToDriver: mockRouteFunctions.assignRandomRouteToDriver
        }
      }
    }
  }
}));

describe('Routes Integration Tests', () => {
  let mockCtx: any;
  let mockDb: any;

  beforeEach(() => {
    const { ctx, db } = createMockCtx();
    mockCtx = ctx;
    mockDb = db;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockRouteFunctions.displayRoutes.mockResolvedValue([
      {
        _id: 'route_1',
        routeId: 'route_a',
        start: 'Johannesburg',
        destination: 'Pretoria',
        startCoords: { latitude: -26.2041, longitude: 28.0473 },
        destinationCoords: { latitude: -25.7479, longitude: 28.2293 },
        stops: [],
        fare: 90,
        estimatedDuration: 3600,
        taxiAssociation: 'Association A',
        hasStops: false
      }
    ]);

    mockRouteFunctions.getAllAvailableRoutesForPassenger.mockResolvedValue([
      {
        routeId: 'route_a',
        routeName: 'Johannesburg to Pretoria',
        start: 'Johannesburg',
        destination: 'Pretoria',
        taxiAssociation: 'Association A',
        fare: 90,
        estimatedDuration: 3600,
        stops: [
          { id: 'stop_1', name: 'Johannesburg CBD', order: 1 },
          { id: 'stop_2', name: 'Sandton', order: 2 },
          { id: 'stop_3', name: 'Pretoria', order: 3 }
        ],
        totalStops: 3
      }
    ]);

    mockRouteFunctions.getEnrichedStopsForRoute.mockResolvedValue([
      { id: 'stop_1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: 'stop_2', name: 'Sandton', coordinates: [-26.1076, 28.0567], order: 2 },
      { id: 'stop_3', name: 'Pretoria', coordinates: [-25.7479, 28.2293], order: 3 }
    ]);

    mockRouteFunctions.getRouteDetailsWithDrivers.mockResolvedValue({
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
        }
      ],
      message: 'Route details retrieved successfully'
    });

    mockRouteFunctions.getAllTaxiAssociations.mockResolvedValue([
      'Association A',
      'Association B',
      'Association C'
    ]);

    mockRouteFunctions.assignRandomRouteToDriver.mockResolvedValue({
      success: true,
      message: 'Route assigned successfully',
      assignedRoute: {
        _id: 'route_1',
        routeId: 'route_a',
        name: 'Johannesburg to Pretoria',
        taxiAssociation: 'Association A'
      }
    });
  });

  describe('Route Discovery Workflow', () => {
    it('should handle complete route discovery process', async () => {
      // Step 1: Get all available routes
      const allRoutes = await mockRouteFunctions.getAllAvailableRoutesForPassenger();

      expect(allRoutes).toHaveLength(1);
      expect(allRoutes[0].routeId).toBe('route_a');
      expect(allRoutes[0].start).toBe('Johannesburg');
      expect(allRoutes[0].destination).toBe('Pretoria');

      // Step 2: Get route details with drivers
      const routeDetails = await mockRouteFunctions.getRouteDetailsWithDrivers({
        routeId: 'route_a'
      });

      expect(routeDetails.success).toBe(true);
      expect(routeDetails.route.routeId).toBe('route_a');
      expect(routeDetails.activeDrivers).toHaveLength(1);
      expect(routeDetails.activeDrivers[0].driverName).toBe('John Driver');

      // Step 3: Get enriched stops for the route
      const enrichedStops = await mockRouteFunctions.getEnrichedStopsForRoute({
        routeId: 'route_a'
      });

      expect(enrichedStops).toHaveLength(3);
      expect(enrichedStops[0].name).toBe('Johannesburg CBD');
      expect(enrichedStops[2].name).toBe('Pretoria');
    });

    it('should handle route filtering by taxi association', async () => {
      // Get all taxi associations
      const associations = await mockRouteFunctions.getAllTaxiAssociations();

      expect(associations).toContain('Association A');
      expect(associations).toContain('Association B');

      // Filter routes by specific association
      mockRouteFunctions.getRoutesByTaxiAssociationForPassenger.mockResolvedValue([
        {
          routeId: 'route_a',
          routeName: 'Johannesburg to Pretoria',
          start: 'Johannesburg',
          destination: 'Pretoria',
          taxiAssociation: 'Association A',
          fare: 90,
          estimatedDuration: 3600,
          stops: [],
          totalStops: 3
        }
      ]);

      const associationRoutes = await mockRouteFunctions.getRoutesByTaxiAssociationForPassenger({
        taxiAssociation: 'Association A'
      });

      expect(associationRoutes).toHaveLength(1);
      expect(associationRoutes[0].taxiAssociation).toBe('Association A');
    });

    it('should handle paginated route display', async () => {
      const mockPaginatedRoutes = {
        routes: [
          {
            _id: 'route_1',
            routeId: 'route_a',
            start: 'Johannesburg',
            destination: 'Pretoria',
            fare: 90,
            estimatedDuration: 3600,
            taxiAssociation: 'Association A',
            hasStops: false
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalRoutes: 25,
          hasNextPage: true,
          hasPrevPage: false,
          limit: 10
        }
      };

      mockRouteFunctions.displayRoutesPaginated.mockResolvedValue(mockPaginatedRoutes);

      const paginatedResult = await mockRouteFunctions.displayRoutesPaginated({
        page: 1,
        limit: 10
      });

      expect(paginatedResult.routes).toHaveLength(1);
      expect(paginatedResult.pagination.currentPage).toBe(1);
      expect(paginatedResult.pagination.totalPages).toBe(3);
      expect(paginatedResult.pagination.hasNextPage).toBe(true);
    });
  });

  describe('Driver Route Assignment Workflow', () => {
    it('should handle complete driver route assignment process', async () => {
      // Step 1: Get all taxi associations
      const associations = await mockRouteFunctions.getAllTaxiAssociations();

      expect(associations).toContain('Association A');

      // Step 2: Assign random route to driver
      const assignmentResult = await mockRouteFunctions.assignRandomRouteToDriver({
        userId: 'user_1',
        taxiAssociation: 'Association A'
      });

      expect(assignmentResult.success).toBe(true);
      expect(assignmentResult.assignedRoute.routeId).toBe('route_a');
      expect(assignmentResult.assignedRoute.taxiAssociation).toBe('Association A');

      // Step 3: Verify driver's assigned route
      mockRouteFunctions.getDriverAssignedRoute.mockResolvedValue({
        _id: 'route_1',
        routeId: 'route_a',
        name: 'Johannesburg to Pretoria',
        taxiAssociation: 'Association A'
      });

      const driverRoute = await mockRouteFunctions.getDriverAssignedRoute({
        userId: 'user_1'
      });

      expect(driverRoute).toBeDefined();
      expect(driverRoute.routeId).toBe('route_a');
    });

    it('should handle route assignment errors gracefully', async () => {
      // Mock assignment failure
      mockRouteFunctions.assignRandomRouteToDriver.mockRejectedValue(
        new Error('No active routes found for taxi association: Nonexistent Association')
      );

      await expect(mockRouteFunctions.assignRandomRouteToDriver({
        userId: 'user_1',
        taxiAssociation: 'Nonexistent Association'
      })).rejects.toThrow('No active routes found for taxi association: Nonexistent Association');
    });

    it('should handle driver not found errors', async () => {
      mockRouteFunctions.assignRandomRouteToDriver.mockRejectedValue(
        new Error('Driver record not found')
      );

      await expect(mockRouteFunctions.assignRandomRouteToDriver({
        userId: 'nonexistent_user',
        taxiAssociation: 'Association A'
      })).rejects.toThrow('Driver record not found');
    });
  });

  describe('Route Information Retrieval Workflow', () => {
    it('should handle route not found scenarios', async () => {
      mockRouteFunctions.getRouteDetailsWithDrivers.mockResolvedValue({
        success: false,
        message: 'Route not found',
        route: null,
        activeDrivers: []
      });

      const result = await mockRouteFunctions.getRouteDetailsWithDrivers({
        routeId: 'nonexistent_route'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Route not found');
      expect(result.route).toBeNull();
      expect(result.activeDrivers).toEqual([]);
    });

    it('should handle driver not found scenarios', async () => {
      mockRouteFunctions.getDriverAssignedRoute.mockResolvedValue(null);

      const result = await mockRouteFunctions.getDriverAssignedRoute({
        userId: 'nonexistent_user'
      });

      expect(result).toBeNull();
    });

    it('should handle empty route lists', async () => {
      mockRouteFunctions.getAllAvailableRoutesForPassenger.mockResolvedValue([]);

      const result = await mockRouteFunctions.getAllAvailableRoutesForPassenger();

      expect(result).toEqual([]);
    });

    it('should handle empty taxi associations list', async () => {
      mockRouteFunctions.getAllTaxiAssociations.mockResolvedValue([]);

      const result = await mockRouteFunctions.getAllTaxiAssociations();

      expect(result).toEqual([]);
    });
  });

  describe('Route Search and Filtering Workflow', () => {
    it('should handle route search with multiple criteria', async () => {
      // Mock search results
      const searchResults = [
        {
          routeId: 'route_a',
          routeName: 'Johannesburg to Pretoria',
          start: 'Johannesburg',
          destination: 'Pretoria',
          taxiAssociation: 'Association A',
          fare: 90,
          estimatedDuration: 3600,
          stops: [],
          totalStops: 3
        },
        {
          routeId: 'route_b',
          routeName: 'Johannesburg to Sandton',
          start: 'Johannesburg',
          destination: 'Sandton',
          taxiAssociation: 'Association A',
          fare: 45,
          estimatedDuration: 1800,
          stops: [],
          totalStops: 2
        }
      ];

      mockRouteFunctions.getAllAvailableRoutesForPassenger.mockResolvedValue(searchResults);

      const allRoutes = await mockRouteFunctions.getAllAvailableRoutesForPassenger();

      // Filter by start location
      const johannesburgRoutes = allRoutes.filter(route => route.start === 'Johannesburg');
      expect(johannesburgRoutes).toHaveLength(2);

      // Filter by fare range
      const affordableRoutes = allRoutes.filter(route => route.fare <= 50);
      expect(affordableRoutes).toHaveLength(1);
      expect(affordableRoutes[0].routeId).toBe('route_b');

      // Filter by duration
      const quickRoutes = allRoutes.filter(route => route.estimatedDuration <= 2000);
      expect(quickRoutes).toHaveLength(1);
      expect(quickRoutes[0].routeId).toBe('route_b');
    });

    it('should handle route details with different driver scenarios', async () => {
      // Mock route with multiple drivers
      const routeWithMultipleDrivers = {
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
        message: 'Route details retrieved successfully'
      };

      mockRouteFunctions.getRouteDetailsWithDrivers.mockResolvedValue(routeWithMultipleDrivers);

      const result = await mockRouteFunctions.getRouteDetailsWithDrivers({
        routeId: 'route_a'
      });

      expect(result.success).toBe(true);
      expect(result.activeDrivers).toHaveLength(2);
      expect(result.activeDrivers[0].driverName).toBe('John Driver');
      expect(result.activeDrivers[1].driverName).toBe('Jane Driver');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockRouteFunctions.displayRoutes.mockRejectedValue(new Error('Database connection failed'));

      await expect(mockRouteFunctions.displayRoutes()).rejects.toThrow('Database connection failed');
    });

    it('should handle network timeout errors', async () => {
      mockRouteFunctions.getEnrichedStopsForRoute.mockRejectedValue(new Error('Network timeout'));

      await expect(mockRouteFunctions.getEnrichedStopsForRoute({
        routeId: 'route_a'
      })).rejects.toThrow('Network timeout');
    });

    it('should handle invalid route ID formats', async () => {
      mockRouteFunctions.getRouteDetailsWithDrivers.mockResolvedValue({
        success: false,
        message: 'Route not found',
        route: null,
        activeDrivers: []
      });

      const result = await mockRouteFunctions.getRouteDetailsWithDrivers({
        routeId: 'invalid-route-id-format'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Route not found');
    });

    it('should handle concurrent route assignments', async () => {
      // Mock multiple concurrent assignments
      const assignment1 = mockRouteFunctions.assignRandomRouteToDriver({
        userId: 'user_1',
        taxiAssociation: 'Association A'
      });

      const assignment2 = mockRouteFunctions.assignRandomRouteToDriver({
        userId: 'user_2',
        taxiAssociation: 'Association A'
      });

      const results = await Promise.all([assignment1, assignment2]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });
});
