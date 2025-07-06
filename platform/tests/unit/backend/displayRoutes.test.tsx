// Mock Convex validation functions before importing modules
jest.mock('convex/values', () => ({
    v: {
      id: jest.fn((table) => ({ table })),
      number: jest.fn(() => ({})),
      string: jest.fn(() => ({})),
      boolean: jest.fn(() => ({})),
      object: jest.fn(() => ({})),
      array: jest.fn(() => ({})),
      optional: jest.fn((validator) => ({ validator })),
      union: jest.fn((...validators) => ({ validators })),
    },
  }));

// Mock the Convex server functions
jest.mock('../../../convex/_generated/server', () => ({
  query: jest.fn((handler) => handler),
  action: jest.fn((handler) => handler),
}));

// Mock the internal API
jest.mock('../../../convex/_generated/api', () => ({
  internal: {
    functions: {
      routes: {
        reverseGeocode: {
          getReadableStopName: 'mock-reverse-geocode-action'
        }
      }
    }
  }
}));
    
const { createQueryCtx, createActionCtx } = require('../../mocks/convex-server');

// Import the actual handler functions directly
const displayRoutesModule = require('../../../convex/functions/routes/displayRoutes');
// Extract the handler functions from the module
const getEnrichedStopName = displayRoutesModule.getEnrichedStopName?.handler;
const getEnrichedStopsForRoute = displayRoutesModule.getEnrichedStopsForRoute?.handler;
const displayRoutes = displayRoutesModule.displayRoutes;
const displayRoutesPaginated = displayRoutesModule.displayRoutesPaginated?.handler;

// Mock data for testing
const mockRoutes = [
  {
    _id: 'route1',
    routeId: 'route1',
    name: 'johannesburg cbd - pretoria cbd',
    geometry: {
      type: "LineString",
      coordinates: [[-26.2041, 28.0473], [-26.1067, 28.0567], [-25.7479, 28.2293]]
    },
    estimatedDuration: 1800,
    taxiAssociation: "PTA Taxi Association"
  },
  {
    _id: 'route2',
    routeId: 'route2',
    name: 'cape town cbd - stellenbosch',
    geometry: {
      type: "LineString",
      coordinates: [[-33.9249, 18.4241], [-33.9044, 18.6326], [-33.9321, 18.8602]]
    },
    estimatedDuration: 1200,
    taxiAssociation: "CPT Taxi Association"
  },
  {
    _id: 'route3',
    routeId: 'route3',
    name: 'invalid route',
    geometry: {
      type: "LineString",
      coordinates: [] // Empty coordinates
    },
    estimatedDuration: 900,
    taxiAssociation: "Test Association"
  }
];

const mockEnrichedStops = [
  {
    _id: 'enriched1',
    routeId: 'route1',
    stops: [
      { id: '1', name: 'Johannesburg CBD Main Terminal', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: '2', name: 'Sandton City', coordinates: [-26.1067, 28.0567], order: 2 },
      { id: '3', name: 'Pretoria Central Station', coordinates: [-25.7479, 28.2293], order: 3 }
    ]
  },
  {
    _id: 'enriched2',
    routeId: 'route2',
    stops: [
      { id: '4', name: 'DROP OFF', coordinates: [-33.9249, 18.4241], order: 1 }, // Should be filtered out
      { id: '5', name: 'N/A', coordinates: [-33.9044, 18.6326], order: 2 }, // Should be filtered out
      { id: '6', name: 'Stellenbosch University', coordinates: [-33.9321, 18.8602], order: 3 }
    ]
  }
];

// Create mock contexts
const createMockQueryCtx = (routes = mockRoutes, enrichedStops = mockEnrichedStops) => {
  const ctx = createQueryCtx();
  
  ctx.db.query = jest.fn().mockImplementation((table) => {
    if (table === "routes") {
      return {
        collect: jest.fn().mockResolvedValue(routes),
        filter: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(routes[0])
      };
    } else if (table === "enrichedRouteStops") {
      return {
        filter: jest.fn().mockReturnThis(),
        first: jest.fn().mockImplementation(() => {
          const routeId = enrichedStops[0]?.routeId;
          return Promise.resolve(enrichedStops.find(stop => stop.routeId === routeId) || null);
        })
      };
    }
    return {
      collect: jest.fn().mockResolvedValue([]),
      filter: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null)
    };
  });
  
  return ctx;
};

const createMockActionCtx = () => {
  const ctx = createActionCtx();
  ctx.runAction = jest.fn().mockResolvedValue("Mocked Stop Name");
  return ctx;
};

describe('Display Routes Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Add a simple test to verify function extraction
  describe('Function Extraction', () => {
    it('should have all required functions extracted', () => {
      expect(typeof getEnrichedStopName).toBe('function');
      expect(typeof getEnrichedStopsForRoute).toBe('function');
      expect(typeof displayRoutes).toBe('function');
      expect(typeof displayRoutesPaginated).toBe('function');
    });
  });
  describe('getEnrichedStopsForRoute', () => {
    it('should return filtered enriched stops for a route', async () => {
      const ctx = createMockQueryCtx();
      const args = { routeId: 'route1' };

      const result = await getEnrichedStopsForRoute(ctx, args);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('coordinates');
    });

    it('should filter out meaningless stop names', async () => {
      const ctx = createMockQueryCtx(mockRoutes, mockEnrichedStops);
      // Mock to return the second enriched stop which has filtered stops
      ctx.db.query = jest.fn().mockImplementation((table) => {
        if (table === "enrichedRouteStops") {
          return {
            filter: jest.fn().mockImplementation((predicate) => {
              // Mock the filter to simulate the routeId filtering
              return {
                first: jest.fn().mockResolvedValue(mockEnrichedStops[1]) // Has "DROP OFF" and "N/A"
              };
            })
          };
        }
        return {
          collect: jest.fn().mockResolvedValue([]),
          filter: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null)
        };
      });
      
      const args = { routeId: 'route2' };
      const result = await getEnrichedStopsForRoute(ctx, args);
      
      // Test the filtering logic manually
      const testStops = mockEnrichedStops[1].stops;
      const manuallyFiltered = testStops.filter((stop: any) => {
        const name = stop.name;
        const hasName = name && name.trim() !== '';
        const noStop = !name.toLowerCase().includes('stop');
        const noBusStop = !name.toLowerCase().includes('bus stop');
        const longEnough = name.length > 3;
        return hasName && noStop && noBusStop && longEnough;
      });
      
      // Should filter out "N/A" (too short) but keep "DROP OFF" and "Stellenbosch University"
      expect(result.length).toBe(2);
      expect(result[0].name).toBe("DROP OFF");
      expect(result[1].name).toBe("Stellenbosch University");
    });

    it('should return empty array when no enriched stops found', async () => {
      const ctx = createMockQueryCtx();
      ctx.db.query = jest.fn().mockImplementation(() => ({
        filter: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      }));
      
      const args = { routeId: 'nonexistent' };
      const result = await getEnrichedStopsForRoute(ctx, args);
      
      expect(result).toEqual([]);
    });
  });

  describe('displayRoutes', () => {
    it('should return processed routes with formatted names and coordinates', async () => {
      const ctx = createMockQueryCtx();
      
      const result = await displayRoutes(ctx, {});
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      
      const firstRoute = result[0];
      expect(firstRoute).toHaveProperty('routeId');
      expect(firstRoute).toHaveProperty('start');
      expect(firstRoute).toHaveProperty('destination');
      expect(firstRoute).toHaveProperty('startCoords');
      expect(firstRoute).toHaveProperty('destinationCoords');
      expect(firstRoute).toHaveProperty('fare');
      expect(firstRoute).toHaveProperty('estimatedDuration');
      expect(firstRoute).toHaveProperty('taxiAssociation');
      expect(firstRoute).toHaveProperty('hasStops');
      
      // Check title case formatting
      expect(firstRoute.start).toBe('Johannesburg Cbd');
      expect(firstRoute.destination).toBe('Pretoria Cbd');
    });

    it('should handle routes with invalid coordinates gracefully', async () => {
      const ctx = createMockQueryCtx();
      
      const result = await displayRoutes(ctx, {});
      const invalidRoute = result.find((r: { routeId: string; }) => r.routeId === 'route3');
      
      expect(invalidRoute).toBeDefined();
      expect(invalidRoute.startCoords).toBeNull();
      expect(invalidRoute.destinationCoords).toBeNull();
      expect(invalidRoute.hasStops).toBe(false);
      expect(invalidRoute.fare).toBe(15); // Default fare
    });

    it('should calculate fare correctly based on duration', async () => {
      const ctx = createMockQueryCtx();
      
      const result = await displayRoutes(ctx, {});
      
      // Route with 1800 seconds (30 minutes) should have fare of 45 (R15 per 10 minutes)
      const route1 = result.find((r: { routeId: string; }) => r.routeId === 'route1');
      expect(route1.fare).toBe(45);
      
      // Route with 1200 seconds (20 minutes) should have fare of 30
      const route2 = result.find((r: { routeId: string; }) => r.routeId === 'route2');
      expect(route2.fare).toBe(30);
    });
  });

  describe('displayRoutesPaginated', () => {
    it('should return paginated routes with metadata', async () => {
      const ctx = createMockQueryCtx();
      const args = { page: 1, limit: 2 };
      
      const result = await displayRoutesPaginated(ctx, args);
      
      expect(result).toHaveProperty('routes');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.routes)).toBe(true);
      expect(result.routes.length).toBeLessThanOrEqual(2);
      
      const pagination = result.pagination;
      expect(pagination).toHaveProperty('currentPage');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('totalRoutes');
      expect(pagination).toHaveProperty('hasNextPage');
      expect(pagination).toHaveProperty('hasPrevPage');
      expect(pagination).toHaveProperty('limit');
      
      expect(pagination.currentPage).toBe(1);
      expect(pagination.limit).toBe(2);
      expect(pagination.totalRoutes).toBe(3);
    });

    it('should use default pagination values', async () => {
      const ctx = createMockQueryCtx();
      
      const result = await displayRoutesPaginated(ctx, {});
      
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.routes.length).toBe(3); // All routes fit in default page size
    });

    it('should handle second page correctly', async () => {
      const ctx = createMockQueryCtx();
      const args = { page: 2, limit: 2 };
      
      const result = await displayRoutesPaginated(ctx, args);
      
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.hasPrevPage).toBe(true);
      expect(result.routes.length).toBe(1); // Only 1 route on second page
    });

    it('should calculate pagination metadata correctly', async () => {
      const ctx = createMockQueryCtx();
      const args = { page: 1, limit: 2 };
      
      const result = await displayRoutesPaginated(ctx, args);
      const { pagination } = result;
      
      expect(pagination.totalPages).toBe(2); // 3 routes / 2 per page = 2 pages
      expect(pagination.hasNextPage).toBe(true);
      expect(pagination.hasPrevPage).toBe(false);
    });
  });
});