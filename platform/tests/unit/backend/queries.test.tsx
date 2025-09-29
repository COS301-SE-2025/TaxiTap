// tests/unit/backend/queries.test.ts

// ----------------- Mock Convex validation -----------------
jest.mock('convex/values', () => ({
  v: {
    id: jest.fn((table: string) => ({ table })),
    number: jest.fn(() => ({})),
    string: jest.fn(() => ({})),
    boolean: jest.fn(() => ({})),
    object: jest.fn(() => ({})),
    array: jest.fn(() => ({})),
    optional: jest.fn((validator: any) => ({ validator })),
    union: jest.fn((...validators: any[]) => ({ validators })),
  },
}));

jest.mock('../../../convex/_generated/server', () => ({
  query: (def: any) => def,
  mutation: (def: any) => def,
  action: (def: any) => def,
}));

// ----------------- Imports -----------------
import { createQueryCtx } from '../../mocks/convex-server';
import {
  getRouteStopsWithEnrichment,
  getAllAvailableRoutesForPassenger,
  getRoutesByTaxiAssociationForPassenger,
  getRouteDetailsWithDrivers,
  getDriverAssignedRoute,
  getAllTaxiAssociations,
} from '../../../convex/functions/routes/queries';

// ----------------- Mock Data -----------------
const mockRoutes = [
  {
    _id: 'route1',
    routeId: 'route1',
    name: 'Johannesburg CBD to Pretoria CBD',
    stops: [
      { id: '1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: '2', name: 'Sandton', coordinates: [-26.1067, 28.0567], order: 2 },
      { id: '3', name: 'Pretoria CBD', coordinates: [-25.7479, 28.2293], order: 3 },
    ],
    isActive: true,
    taxiAssociation: 'PTA Taxi Association',
    geometry: {
      type: 'LineString',
      coordinates: [[-26.2041, 28.0473], [-26.1067, 28.0567], [-25.7479, 28.2293]],
    },
    fare: 45,
    estimatedDuration: 1800,
  },
  {
    _id: 'route2',
    routeId: 'route2',
    name: 'Cape Town CBD to Stellenbosch',
    stops: [
      { id: '4', name: 'Cape Town CBD', coordinates: [-33.9249, 18.4241], order: 1 },
      { id: '5', name: 'Bellville', coordinates: [-33.9044, 18.6326], order: 2 },
      { id: '6', name: 'Stellenbosch', coordinates: [-33.9321, 18.8602], order: 3 },
    ],
    isActive: true,
    taxiAssociation: 'CPT Taxi Association',
    geometry: {
      type: 'LineString',
      coordinates: [[-33.9249, 18.4241], [-33.9044, 18.6326], [-33.9321, 18.8602]],
    },
    fare: 30,
    estimatedDuration: 1200,
  },
];

const mockEnrichedStops = [
  {
    _id: 'enriched1',
    routeId: 'route1',
    stops: [
      { id: '1', name: 'Johannesburg CBD', coordinates: [-26.2041, 28.0473], order: 1 },
      { id: '2', name: 'Sandton', coordinates: [-26.1067, 28.0567], order: 2 },
      { id: '3', name: 'Pretoria CBD', coordinates: [-25.7479, 28.2293], order: 3 },
    ],
    updatedAt: new Date(),
  },
];

const mockDrivers = [
  { _id: 'driver1', userId: 'user1', name: 'Test Driver', isActive: true, assignedRoute: 'route1' },
];

// ----------------- Mock Query Context -----------------
const createMockQueryCtx = () => {
  const ctx = createQueryCtx();

  // Mock query
  ctx.db.query = jest.fn().mockImplementation((table: string) => {
    const mockChain: any = {
      collect: jest.fn(),
      filter: jest.fn().mockReturnThis(),
      withIndex: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      first: jest.fn(),
      unique: jest.fn(),
    };

    if (table === 'routes') {
      mockChain.collect.mockResolvedValue(mockRoutes);
      mockChain.first.mockResolvedValue(mockRoutes[0]);
      mockChain.unique.mockResolvedValue(mockRoutes[0]);
    } else if (table === 'enrichedRouteStops') {
      mockChain.collect.mockResolvedValue(mockEnrichedStops);
      mockChain.first.mockResolvedValue(mockEnrichedStops[0]);
      mockChain.unique.mockResolvedValue(mockEnrichedStops[0]);
    } else if (table === 'drivers') {
      mockChain.collect.mockResolvedValue(mockDrivers);
      mockChain.first.mockResolvedValue(mockDrivers[0]);
    } else if (table === 'taxiTap_users') {
      mockChain.first.mockResolvedValue({ _id: 'user1', accountType: 'both' });
    } else {
      mockChain.collect.mockResolvedValue([]);
      mockChain.first.mockResolvedValue(null);
      mockChain.unique.mockResolvedValue(null);
    }

    return mockChain;
  });

  // Mock get for your handlers
  (ctx.db as any).get = jest.fn().mockImplementation((id: string) => {
    // driver userId -> return driver info
    const driver = mockDrivers.find(d => d.userId === id);
    if (driver) return Promise.resolve({ name: driver.name, isActive: driver.isActive });
    // routeId -> return route info
    const route = mockRoutes.find(r => r.routeId === id);
    if (route) return Promise.resolve(route);
    return Promise.resolve(null);
  });

  return ctx;
};

// ----------------- Helper to call Convex Queries -----------------
const callQuery = async (queryObj: any, ctx: any, args: any) => {
  if (queryObj && typeof queryObj.handler === 'function') {
    return queryObj.handler(ctx, args);
  }
  throw new Error('Query handler not found');
};

// ----------------- Tests -----------------
describe('Route Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getRouteStopsWithEnrichment returns enriched stops', async () => {
    const ctx = createMockQueryCtx();
    const result = await callQuery(getRouteStopsWithEnrichment, ctx, { routeId: 'route1' });

    expect(result).toBeDefined();
    expect(result.stops).toBeDefined();
    expect(Array.isArray(result.stops)).toBe(true);
    expect(result.isEnriched).toBe(true);
  });

  it('getAllAvailableRoutesForPassenger returns routes', async () => {
    const ctx = createMockQueryCtx();
    const routes = await callQuery(getAllAvailableRoutesForPassenger, ctx, {});

    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
  });

  it('getRoutesByTaxiAssociationForPassenger returns filtered routes', async () => {
    const ctx = createMockQueryCtx();
    const routes = await callQuery(getRoutesByTaxiAssociationForPassenger, ctx, { taxiAssociation: 'PTA Taxi Association' });

    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    if (routes.length > 0) expect(routes[0].taxiAssociation).toBe('PTA Taxi Association');
  });

  it('getRouteDetailsWithDrivers returns route with drivers', async () => {
    const ctx = createMockQueryCtx();
    const result = await callQuery(getRouteDetailsWithDrivers, ctx, { routeId: 'route1' });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.route).toBeDefined();
    expect(Array.isArray(result.activeDrivers)).toBe(true);
  });

  it('getDriverAssignedRoute returns driver route', async () => {
    const ctx = createMockQueryCtx();
    const route = await callQuery(getDriverAssignedRoute, ctx, { userId: 'user1' });

    expect(route).toBeDefined();
  });

  it('getAllTaxiAssociations returns unique associations', async () => {
    const ctx = createMockQueryCtx();
    const associations = await callQuery(getAllTaxiAssociations, ctx, {});

    expect(associations).toBeDefined();
    expect(Array.isArray(associations)).toBe(true);
    expect(associations).toContain('PTA Taxi Association');
    expect(associations).toContain('CPT Taxi Association');
  });
});