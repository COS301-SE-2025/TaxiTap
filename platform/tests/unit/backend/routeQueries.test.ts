import { 
  getRouteStopsWithEnrichment,
  getAllRoutesWithEnrichmentStatus,
  getAllAvailableRoutesForPassenger,
  getRoutesByTaxiAssociationForPassenger,
  getRouteDetailsWithDrivers,
  getDriverAssignedRoute,
  getAllTaxiAssociations
} from '../../../convex/functions/routes/queries';
import { Id } from '../../../convex/_generated/dataModel';

describe('Route Queries', () => {
  let mockCtx: any;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          unique: jest.fn(),
          first: jest.fn(),
          collect: jest.fn()
        })),
        filter: jest.fn(() => ({
          first: jest.fn(),
          collect: jest.fn()
        })),
        collect: jest.fn()
      })),
      get: jest.fn()
    };

    mockCtx = {
      db: mockDb
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRouteStopsWithEnrichment', () => {
    it('should return enriched stops when available', async () => {
      const mockEnrichedStops = {
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
          }
        ],
        updatedAt: Date.now()
      };

      // Mock the query chain properly
      const mockQuery = {
        withIndex: jest.fn(() => ({
          unique: jest.fn().mockResolvedValue(mockEnrichedStops)
        })),
        filter: jest.fn(),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getRouteStopsWithEnrichment as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result).toEqual({
        stops: mockEnrichedStops.stops,
        isEnriched: true,
        updatedAt: mockEnrichedStops.updatedAt
      });
    });

    it('should fallback to original stops when enriched stops not available', async () => {
      const mockOriginalRoute = {
        _id: 'route_1' as Id<'routes'>,
        routeId: 'route_a',
        name: 'Johannesburg to Pretoria',
        stops: [
          {
            id: 'stop_1',
            name: 'Johannesburg CBD',
            coordinates: [-26.2041, 28.0473],
            order: 1
          }
        ]
      };

      // Mock the query chain properly - first call returns null (no enriched stops), second returns original route
      mockDb.query
        .mockReturnValueOnce({
          withIndex: jest.fn(() => ({
            unique: jest.fn().mockResolvedValue(null) // No enriched stops
          })),
          filter: jest.fn(),
          collect: jest.fn()
        })
        .mockReturnValueOnce({
          withIndex: jest.fn(() => ({
            unique: jest.fn().mockResolvedValue(mockOriginalRoute) // Original route
          })),
          filter: jest.fn(),
          collect: jest.fn()
        });

      const result = await (getRouteStopsWithEnrichment as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result).toEqual({
        stops: mockOriginalRoute.stops,
        isEnriched: false,
        updatedAt: null
      });
    });

    it('should throw error when route not found', async () => {
      const mockQuery = {
        withIndex: jest.fn(() => ({
          unique: jest.fn()
            .mockResolvedValueOnce(null) // No enriched stops
            .mockResolvedValueOnce(null) // No original route
        })),
        filter: jest.fn(),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      await expect((getRouteStopsWithEnrichment as any)._handler(mockCtx, { routeId: 'nonexistent_route' }))
        .rejects.toThrow('Route nonexistent_route not found');
    });
  });

  describe('getAllRoutesWithEnrichmentStatus', () => {
    it('should return routes with enrichment status', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A'
        },
        {
          _id: 'route_2' as Id<'routes'>,
          routeId: 'route_b',
          name: 'Cape Town to Stellenbosch',
          taxiAssociation: 'Association B'
        }
      ];

      const mockEnrichedRoutes = [
        {
          routeId: 'route_a',
          stops: []
        }
      ];

      // Mock the query chain properly - first call for routes, second for enriched routes
      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(),
        collect: jest.fn()
          .mockResolvedValueOnce(mockRoutes)
          .mockResolvedValueOnce(mockEnrichedRoutes)
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getAllRoutesWithEnrichmentStatus as any)._handler(mockCtx, {});

      expect(result).toHaveLength(2);
      expect(result[0].hasEnrichedStops).toBe(true);
      expect(result[1].hasEnrichedStops).toBe(false);
    });
  });

  describe('getAllAvailableRoutesForPassenger', () => {
    it('should return active routes sorted by start location', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Cape Town to Stellenbosch',
          taxiAssociation: 'Association A',
          fare: 25,
          estimatedDuration: 1800,
          stops: [
            { id: 'stop_1', name: 'Cape Town', order: 1 },
            { id: 'stop_2', name: 'Stellenbosch', order: 2 }
          ],
          isActive: true
        },
        {
          _id: 'route_2' as Id<'routes'>,
          routeId: 'route_b',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association B',
          fare: 30,
          estimatedDuration: 3600,
          stops: [
            { id: 'stop_3', name: 'Johannesburg', order: 1 },
            { id: 'stop_4', name: 'Pretoria', order: 2 }
          ],
          isActive: true
        }
      ];

      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn(),
          collect: jest.fn().mockResolvedValue(mockRoutes)
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getAllAvailableRoutesForPassenger as any)._handler(mockCtx, {});

      expect(result).toHaveLength(2);
      expect(result[0].start).toBe('Cape Town'); // Should be sorted by start location
      expect(result[1].start).toBe('Johannesburg');
      expect(result[0].totalStops).toBe(2);
    });

    it('should only return active routes', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          fare: 30,
          estimatedDuration: 3600,
          stops: [],
          isActive: true
        },
        {
          _id: 'route_2' as Id<'routes'>,
          routeId: 'route_b',
          name: 'Cape Town to Stellenbosch',
          taxiAssociation: 'Association B',
          fare: 25,
          estimatedDuration: 1800,
          stops: [],
          isActive: false // Inactive route
        }
      ];

      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn(),
          collect: jest.fn().mockResolvedValue([mockRoutes[0]]) // Only active routes
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getAllAvailableRoutesForPassenger as any)._handler(mockCtx, {});

      expect(result).toHaveLength(1);
      expect(result[0].routeId).toBe('route_a');
    });
  });

  describe('getRoutesByTaxiAssociationForPassenger', () => {
    it('should return routes for specific taxi association', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          fare: 30,
          estimatedDuration: 3600,
          stops: [
            { id: 'stop_1', name: 'Johannesburg', order: 1 },
            { id: 'stop_2', name: 'Pretoria', order: 2 }
          ],
          isActive: true
        }
      ];

      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn(),
          collect: jest.fn().mockResolvedValue(mockRoutes)
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getRoutesByTaxiAssociationForPassenger as any)._handler(mockCtx, { 
        taxiAssociation: 'Association A' 
      });

      expect(result).toHaveLength(1);
      expect(result[0].routeId).toBe('route_a');
      expect(result[0].taxiAssociation).toBe('Association A');
    });

    it('should return empty array when no routes found for association', async () => {
      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn(),
          collect: jest.fn().mockResolvedValue([])
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getRoutesByTaxiAssociationForPassenger as any)._handler(mockCtx, { 
        taxiAssociation: 'Nonexistent Association' 
      });

      expect(result).toEqual([]);
    });
  });

  describe('getRouteDetailsWithDrivers', () => {
    it('should return route details with active drivers', async () => {
      const mockRoute = {
        _id: 'route_1' as Id<'routes'>,
        routeId: 'route_a',
        name: 'Johannesburg to Pretoria',
        taxiAssociation: 'Association A',
        fare: 30,
        estimatedDuration: 3600,
        stops: [
          { id: 'stop_1', name: 'Johannesburg', order: 1 },
          { id: 'stop_2', name: 'Pretoria', order: 2 }
        ],
        geometry: { coordinates: [] },
        isActive: true
      };

      const mockDrivers = [
        {
          _id: 'driver_1',
          userId: 'user_1' as Id<'taxiTap_users'>,
          assignedRoute: 'route_1',
          averageRating: 4.5,
          numberOfRidesCompleted: 100
        }
      ];

      const mockUser = {
        _id: 'user_1',
        name: 'John Driver',
        isActive: true
      };

      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(mockRoute),
          collect: jest.fn().mockResolvedValue(mockDrivers)
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);
      mockDb.get.mockResolvedValue(mockUser);

      const result = await (getRouteDetailsWithDrivers as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result.success).toBe(true);
      expect(result.route.routeId).toBe('route_a');
      expect(result.activeDrivers).toHaveLength(1);
      expect(result.activeDrivers[0].driverName).toBe('John Driver');
    });

    it('should return error when route not found', async () => {
      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(null),
          collect: jest.fn()
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getRouteDetailsWithDrivers as any)._handler(mockCtx, { routeId: 'nonexistent_route' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Route not found');
      expect(result.route).toBeNull();
      expect(result.activeDrivers).toEqual([]);
    });

    it('should filter out inactive drivers', async () => {
      const mockRoute = {
        _id: 'route_1' as Id<'routes'>,
        routeId: 'route_a',
        name: 'Johannesburg to Pretoria',
        taxiAssociation: 'Association A',
        fare: 30,
        estimatedDuration: 3600,
        stops: [],
        geometry: { coordinates: [] },
        isActive: true
      };

      const mockDrivers = [
        {
          _id: 'driver_1',
          userId: 'user_1' as Id<'taxiTap_users'>,
          assignedRoute: 'route_1',
          averageRating: 4.5,
          numberOfRidesCompleted: 100
        }
      ];

      const mockUser = {
        _id: 'user_1',
        name: 'John Driver',
        isActive: false // Inactive driver
      };

      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(mockRoute),
          collect: jest.fn().mockResolvedValue(mockDrivers)
        })),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);
      mockDb.get.mockResolvedValue(mockUser);

      const result = await (getRouteDetailsWithDrivers as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result.success).toBe(true);
      expect(result.activeDrivers).toHaveLength(0);
    });
  });

  describe('getDriverAssignedRoute', () => {
    it('should return assigned route for driver', async () => {
      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: 'route_1' as Id<'routes'>
      };

      const mockRoute = {
        _id: 'route_1' as Id<'routes'>,
        routeId: 'route_a',
        name: 'Johannesburg to Pretoria'
      };

      const mockQuery = {
        withIndex: jest.fn(() => ({
          unique: jest.fn(),
          first: jest.fn().mockResolvedValue(mockDriver),
          collect: jest.fn()
        })),
        filter: jest.fn(),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);
      mockDb.get.mockResolvedValue(mockRoute);

      const result = await (getDriverAssignedRoute as any)._handler(mockCtx, { userId: 'user_1' as Id<'taxiTap_users'> });

      expect(result).toEqual(mockRoute);
    });

    it('should return null when driver not found', async () => {
      const mockQuery = {
        withIndex: jest.fn(() => ({
          unique: jest.fn(),
          first: jest.fn().mockResolvedValue(null),
          collect: jest.fn()
        })),
        filter: jest.fn(),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getDriverAssignedRoute as any)._handler(mockCtx, { userId: 'user_1' as Id<'taxiTap_users'> });

      expect(result).toBeNull();
    });

    it('should return null when driver has no assigned route', async () => {
      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      const mockQuery = {
        withIndex: jest.fn(() => ({
          unique: jest.fn(),
          first: jest.fn().mockResolvedValue(mockDriver),
          collect: jest.fn()
        })),
        filter: jest.fn(),
        collect: jest.fn()
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getDriverAssignedRoute as any)._handler(mockCtx, { userId: 'user_1' as Id<'taxiTap_users'> });

      expect(result).toBeNull();
    });
  });

  describe('getAllTaxiAssociations', () => {
    it('should return unique sorted taxi associations', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          taxiAssociation: 'Association B'
        },
        {
          _id: 'route_2' as Id<'routes'>,
          taxiAssociation: 'Association A'
        },
        {
          _id: 'route_3' as Id<'routes'>,
          taxiAssociation: 'Association B' // Duplicate
        },
        {
          _id: 'route_4' as Id<'routes'>,
          taxiAssociation: null // Should be ignored
        }
      ];

      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(),
        collect: jest.fn().mockResolvedValue(mockRoutes)
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getAllTaxiAssociations as any)._handler(mockCtx, {});

      expect(result).toEqual(['Association A', 'Association B']);
    });

    it('should return empty array when no routes exist', async () => {
      const mockQuery = {
        withIndex: jest.fn(),
        filter: jest.fn(),
        collect: jest.fn().mockResolvedValue([])
      };
      mockDb.query.mockReturnValue(mockQuery);

      const result = await (getAllTaxiAssociations as any)._handler(mockCtx, {});

      expect(result).toEqual([]);
    });
  });
});
