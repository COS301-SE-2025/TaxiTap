import { displayRoutesHandler } from '../../convex/functions/routes/displayRoutes';
import { QueryCtx } from '../../convex/_generated/server';

// === In-memory simulated database ===
const createMockDatabase = () => {
  const collections: Record<string, Record<string, any>> = {
    routes: {},
    enrichedRouteStops: {},
  };

  return {
    insert: (collection: string, id: string, doc: any) => {
      collections[collection][id] = { _id: id, ...doc };
    },

    query: (collection: string) => ({
      collect: async () => Object.values(collections[collection]),

      filter: (filterFn: (q: any) => boolean) => ({
        first: async () => {
          return Object.values(collections[collection]).find(filterFn) ?? null;
        },
      }),
    }),

    _collections: collections,
  };
};

// === Full QueryCtx Mock ===
const createMockCtx = () => {
  const db = createMockDatabase();
  const ctx: QueryCtx = {
    db: db as any,  // Cast since we're mocking
    auth: {} as any,
    storage: {} as any,
    runQuery: async () => undefined,  // We don't need this for your queries
  };
  return { ctx, db };
};

describe('Integration tests for displayRoutesHandler', () => {
  let ctx: QueryCtx;
  let db: any;

  beforeEach(() => {
    const mock = createMockCtx();
    ctx = mock.ctx;
    db = mock.db;
  });

  it('returns processed route with coordinates', async () => {
    db.insert('routes', 'route1', {
      routeId: 'R1',
      name: 'CBD - SAUSVILLE',
      geometry: {
        coordinates: [
          [27.123, -25.456],
          [27.789, -25.789],
        ],
      },
      estimatedDuration: 1200,
      taxiAssociation: 'Sausville Taxis',
    });

    const result = await displayRoutesHandler(ctx);

    expect(result).toEqual([
      {
        routeId: 'R1',
        start: 'Cbd',
        destination: 'Sausville',
        startCoords: { latitude: 27.123, longitude: -25.456 },
        destinationCoords: { latitude: 27.789, longitude: -25.789 },
        stops: [],
        fare: 30,
        estimatedDuration: 1200,
        taxiAssociation: 'Sausville Taxis',
        hasStops: false,
      },
    ]);
  });

  it('returns fallback if coordinates missing', async () => {
    db.insert('routes', 'route2', {
      routeId: 'R2',
      name: 'N/A',
      geometry: { coordinates: [] },
      estimatedDuration: 0,
      taxiAssociation: 'Unknown Taxis',
    });

    const result = await displayRoutesHandler(ctx);

    expect(result).toEqual([
      {
        routeId: 'R2',
        start: 'N/a',
        destination: 'Unknown',
        startCoords: null,
        destinationCoords: null,
        stops: [],
        fare: 15,
        estimatedDuration: 0,
        taxiAssociation: 'Unknown Taxis',
        hasStops: false,
      },
    ]);
  });

  it('handles multiple routes correctly', async () => {
    db.insert('routes', 'route3', {
      routeId: 'R3',
      name: 'City - Mall',
      geometry: {
        coordinates: [
          [26.123, -25.000],
          [26.999, -25.999],
        ],
      },
      estimatedDuration: 900,
      taxiAssociation: 'City Transport',
    });

    db.insert('routes', 'route4', {
      routeId: 'R4',
      name: 'Station - University',
      geometry: {
        coordinates: [
          [26.888, -25.111],
          [27.555, -25.777],
        ],
      },
      estimatedDuration: 2400,
      taxiAssociation: 'Uni Taxis',
    });

    const result = await displayRoutesHandler(ctx);
    expect(result.length).toBe(2);
  });
});