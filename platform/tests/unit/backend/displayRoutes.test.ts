import { 
  displayRoutesHandler, 
  displayRoutes, 
  displayRoutesPaginated, 
  getEnrichedStopsForRoute,
  getEnrichedStopName
} from '../../../convex/functions/routes/displayRoutes';
import { Id } from '../../../convex/_generated/dataModel';

describe('Display Routes', () => {
  let mockCtx: any;
  let mockDb: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockDb = {
      query: mockQuery,
      get: jest.fn()
    };

    mockCtx = {
      db: mockDb,
      runAction: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('displayRoutesHandler', () => {
    it('should process routes with valid geometry coordinates', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: {
            coordinates: [
              [-26.2041, 28.0473], // Start coordinates
              [-25.7479, 28.2293]  // End coordinates
            ]
          },
          estimatedDuration: 3600, // 1 hour
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      // Set up mock to return routes
      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        _id: 'route_1',
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
        fare: 90, // R15 per 10 minutes * 6 (3600/600)
        estimatedDuration: 3600,
        taxiAssociation: 'Association A',
        hasStops: false
      });
    });

    it('should handle routes with missing geometry', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: null,
          estimatedDuration: 3600,
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        routeId: 'route_a',
        start: 'Johannesburg',
        destination: 'Pretoria',
        startCoords: null,
        destinationCoords: null,
        stops: [],
        fare: 15,
        estimatedDuration: 3600,
        taxiAssociation: 'Association A',
        hasStops: false
      });
    });

    it('should handle routes with invalid coordinates', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: {
            coordinates: []
          },
          estimatedDuration: 3600,
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result).toHaveLength(1);
      expect(result[0].startCoords).toBeNull();
      expect(result[0].destinationCoords).toBeNull();
    });

    it('should handle routes with malformed coordinates', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: {
            coordinates: [
              [-26.2041], // Missing longitude
              [-25.7479, 28.2293]
            ]
          },
          estimatedDuration: 3600,
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result).toHaveLength(1);
      expect(result[0].startCoords).toBeNull();
      expect(result[0].destinationCoords).toBeNull();
    });

    it('should format route names correctly', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'johannesburg - pretoria',
          geometry: {
            coordinates: [
              [-26.2041, 28.0473],
              [-25.7479, 28.2293]
            ]
          },
          estimatedDuration: 3600,
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result[0].start).toBe('Johannesburg');
      expect(result[0].destination).toBe('Pretoria');
    });

    it('should calculate fare correctly based on duration', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: {
            coordinates: [
              [-26.2041, 28.0473],
              [-25.7479, 28.2293]
            ]
          },
          estimatedDuration: 1800, // 30 minutes
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result[0].fare).toBe(45); // R15 per 10 minutes * 3 (1800/600)
    });

    it('should handle routes with zero or negative duration', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: {
            coordinates: [
              [-26.2041, 28.0473],
              [-25.7479, 28.2293]
            ]
          },
          estimatedDuration: 0,
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result[0].fare).toBe(15); // Default minimum fare
    });
  });

  describe('displayRoutes', () => {
    it('should call displayRoutesHandler', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg - Pretoria',
          geometry: {
            coordinates: [
              [-26.2041, 28.0473],
              [-25.7479, 28.2293]
            ]
          },
          estimatedDuration: 3600,
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await displayRoutesHandler(mockCtx);

      expect(result).toHaveLength(1);
      expect(result[0].routeId).toBe('route_a');
    });
  });

  describe('displayRoutesPaginated', () => {
    it('should return paginated routes with metadata', async () => {
      const mockRoutes = Array(25).fill(null).map((_, i) => ({
        _id: `route_${i}` as Id<'routes'>,
        routeId: `route_${i}`,
        name: `Route ${i}`,
        geometry: {
          coordinates: [
            [-26.2041, 28.0473],
            [-25.7479, 28.2293]
          ]
        },
        estimatedDuration: 3600,
        taxiAssociation: 'Association A',
        isActive: true
      }));

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await (displayRoutesPaginated as any)._handler(mockCtx, { page: 2, limit: 10 });

      expect(result.routes).toHaveLength(10);
      expect(result.pagination).toEqual({
        currentPage: 2,
        totalPages: 3,
        totalRoutes: 25,
        hasNextPage: true,
        hasPrevPage: true,
        limit: 10
      });
    });

    it('should handle default pagination parameters', async () => {
      const mockRoutes = Array(5).fill(null).map((_, i) => ({
        _id: `route_${i}` as Id<'routes'>,
        routeId: `route_${i}`,
        name: `Route ${i}`,
        geometry: {
          coordinates: [
            [-26.2041, 28.0473],
            [-25.7479, 28.2293]
          ]
        },
        estimatedDuration: 3600,
        taxiAssociation: 'Association A',
        isActive: true
      }));

      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue(mockRoutes)
      });

      const result = await (displayRoutesPaginated as any)._handler(mockCtx, {});

      expect(result.routes).toHaveLength(5);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should handle empty routes list', async () => {
      mockQuery.mockReturnValueOnce({
        collect: jest.fn().mockResolvedValue([])
      });

      const result = await (displayRoutesPaginated as any)._handler(mockCtx, { page: 1, limit: 10 });

      expect(result.routes).toHaveLength(0);
      expect(result.pagination.totalRoutes).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('getEnrichedStopsForRoute', () => {
    it('should return enriched stops for a route', async () => {
      const mockEnrichedStops = {
        routeId: 'route_a',
        stops: [
          { id: 'stop_1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
          { id: 'stop_2', name: 'Sandton', coordinates: [-26.1076, 28.0567], order: 2 }
        ],
        updatedAt: Date.now()
      };

      mockQuery.mockReturnValueOnce({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockEnrichedStops)
        })
      });

      const result = await (getEnrichedStopsForRoute as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Johannesburg CBD');
      expect(result[1].name).toBe('Sandton');
    });

    it('should filter out meaningless stop names', async () => {
      const mockEnrichedStops = {
        routeId: 'route_a',
        stops: [
          { id: 'stop_1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
          { id: 'stop_2', name: 'Bus Stop', coordinates: [-26.1076, 28.0567], order: 2 },
          { id: 'stop_3', name: 'Sandton', coordinates: [-26.1076, 28.0567], order: 3 },
          { id: 'stop_4', name: 'Stop', coordinates: [-26.1076, 28.0567], order: 4 }
        ],
        updatedAt: Date.now()
      };

      mockQuery.mockReturnValueOnce({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(mockEnrichedStops)
        })
      });

      const result = await (getEnrichedStopsForRoute as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Johannesburg CBD');
      expect(result[1].name).toBe('Sandton');
    });

    it('should return empty array when no enriched stops found', async () => {
      mockQuery.mockReturnValueOnce({
        filter: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const result = await (getEnrichedStopsForRoute as any)._handler(mockCtx, { routeId: 'route_a' });

      expect(result).toHaveLength(0);
    });
  });

  describe('getEnrichedStopName', () => {
    it('should return enriched stop name from coordinates', async () => {
      mockCtx.runAction.mockResolvedValue('Johannesburg CBD');

      const result = await (getEnrichedStopName as any)._handler(mockCtx, { lat: -26.2041, lon: 28.0473 });

      expect(result).toBe('Johannesburg CBD');
      expect(mockCtx.runAction).toHaveBeenCalled();
    });

    it('should return fallback name when geocoding fails', async () => {
      mockCtx.runAction.mockRejectedValue(new Error('Geocoding failed'));

      const result = await (getEnrichedStopName as any)._handler(mockCtx, { lat: -26.2041, lon: 28.0473 });

      expect(result).toBe('Unnamed Stop');
    });
  });
});