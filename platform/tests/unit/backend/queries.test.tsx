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

const { createQueryCtx } = require('../../mocks/convex-server');
const { 
  getRouteStopsWithEnrichment,
  getAllAvailableRoutesForPassenger,
  getRoutesByTaxiAssociationForPassenger,
  getRouteDetailsWithDrivers,
  getDriverAssignedRoute,
  getAllTaxiAssociations
} = require('../../../convex/functions/routes/queries');

// Mock data for testing
const mockRoutes = [
  {
    _id: 'route1',
    routeId: 'route1',
    name: 'Johannesburg CBD to Pretoria CBD',
    stops: [
      { id: '1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: '2', name: 'Sandton', coordinates: [-26.1067, 28.0567], order: 2 },
      { id: '3', name: 'Pretoria CBD', coordinates: [-25.7479, 28.2293], order: 3 }
    ],
    isActive: true,
    taxiAssociation: "PTA Taxi Association",
    geometry: {
      type: "LineString",
      coordinates: [[-26.2041, 28.0473], [-26.1067, 28.0567], [-25.7479, 28.2293]]
    },
    fare: 45,
    estimatedDuration: 1800
  },
  {
    _id: 'route2',
    routeId: 'route2',
    name: 'Cape Town CBD to Stellenbosch',
    stops: [
      { id: '4', name: 'Cape Town CBD', coordinates: [-33.9249, 18.4241], order: 1 },
      { id: '5', name: 'Bellville', coordinates: [-33.9044, 18.6326], order: 2 },
      { id: '6', name: 'Stellenbosch', coordinates: [-33.9321, 18.8602], order: 3 }
    ],
    isActive: true,
    taxiAssociation: "CPT Taxi Association",
    geometry: {
      type: "LineString",
      coordinates: [[-33.9249, 18.4241], [-33.9044, 18.6326], [-33.9321, 18.8602]]
    },
    fare: 30,
    estimatedDuration: 1200
  }
];

const mockEnrichedStops = [
  {
    _id: 'enriched1',
    routeId: 'route1',
    stops: [
      { id: '1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: '2', name: 'Sandton', coordinates: [-26.1067, 28.0567], order: 2 },
      { id: '3', name: 'Pretoria CBD', coordinates: [-25.7479, 28.2293], order: 3 }
    ],
    updatedAt: new Date()
  }
];

// Mock QueryCtx
const createMockQueryCtx = (routes = mockRoutes, enrichedStops = mockEnrichedStops) => {
  const ctx = createQueryCtx();
  
  // Mock the main routes query
  ctx.db.query = jest.fn().mockImplementation((table: string) => {
    if (table === "routes") {
      return {
        collect: jest.fn().mockResolvedValue(routes),
        filter: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(routes[0]),
        unique: jest.fn().mockResolvedValue(routes[0])
      };
    } else if (table === "enrichedRouteStops") {
      return {
        collect: jest.fn().mockResolvedValue(enrichedStops),
        filter: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(enrichedStops[0]),
        unique: jest.fn().mockResolvedValue(enrichedStops[0])
      };
    } else if (table === "drivers") {
      return {
        collect: jest.fn().mockResolvedValue([]),
        filter: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };
    } else if (table === "taxiTap_users") {
      return {
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue({
            _id: "user1",
            accountType: "both",
          }),
        })),
      };
    }
    return {
      withIndex: jest.fn(() => ({
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(null),
        })),
      })),
    };
  });
  
  // Mock ctx.db.get for user lookups
  ctx.db.get = jest.fn().mockResolvedValue({ name: "Test Driver", isActive: true });
  
  return ctx;
};

describe('Route Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRouteStopsWithEnrichment', () => {
    it('should return enriched stops for a given route', async () => {
      const ctx = createMockQueryCtx();
      const args = { routeId: 'route1' };

      const result = await getRouteStopsWithEnrichment.handler(ctx, args);
      
      expect(result).toBeDefined();
      expect(result.stops).toBeDefined();
      expect(Array.isArray(result.stops)).toBe(true);
      expect(result.isEnriched).toBe(true);
      if (result.stops.length > 0) {
        expect(result.stops[0]).toHaveProperty('name');
        expect(result.stops[0]).toHaveProperty('order');
        expect(result.stops[0]).toHaveProperty('coordinates');
      }
    });
  });

  describe('getAllAvailableRoutesForPassenger', () => {
    it('should return all available routes for passengers', async () => {
      const ctx = createMockQueryCtx();
      const routes = await getAllAvailableRoutesForPassenger.handler(ctx, {});

      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('start');
        expect(routes[0]).toHaveProperty('destination');
        expect(routes[0]).toHaveProperty('routeId');
        expect(routes[0]).toHaveProperty('taxiAssociation');
      }
    });
  });

  describe('getRoutesByTaxiAssociationForPassenger', () => {
    it('should return routes for a specific taxi association', async () => {
      const ctx = createMockQueryCtx();
      const routes = await getRoutesByTaxiAssociationForPassenger.handler(ctx, { taxiAssociation: 'PTA Taxi Association' });

      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('start');
        expect(routes[0]).toHaveProperty('destination');
        expect(routes[0]).toHaveProperty('taxiAssociation');
        expect(routes[0].taxiAssociation).toBe('PTA Taxi Association');
      }
    });
  });

  describe('getRouteDetailsWithDrivers', () => {
    it('should return route details with driver information', async () => {
      const ctx = createMockQueryCtx();
      const result = await getRouteDetailsWithDrivers.handler(ctx, { routeId: 'route1' });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.route).toBeDefined();
      expect(result.activeDrivers).toBeDefined();
      expect(Array.isArray(result.activeDrivers)).toBe(true);
    });
  });

  describe('getDriverAssignedRoute', () => {
    it('should return driver assigned route', async () => {
      const ctx = createMockQueryCtx();
      const route = await getDriverAssignedRoute.handler(ctx, { userId: 'user1' });

      expect(route).toBeDefined();
    });
  });

  describe('getAllTaxiAssociations', () => {
    it('should return unique taxi associations', async () => {
      const ctx = createMockQueryCtx();
      const associations = await getAllTaxiAssociations.handler(ctx, {});

      expect(associations).toBeDefined();
      expect(Array.isArray(associations)).toBe(true);
      expect(associations).toContain('PTA Taxi Association');
      expect(associations).toContain('CPT Taxi Association');
    });
  });
});