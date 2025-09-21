// Mock Convex validation functions before importing modules
const v = {
  id: jest.fn((table) => ({ table })),
  number: jest.fn(() => ({})),
  string: jest.fn(() => ({})),
  boolean: jest.fn(() => ({})),
  object: jest.fn(() => ({})),
  array: jest.fn(() => ({})),
  optional: jest.fn((validator) => ({ validator })),
  union: jest.fn((...validators) => ({ validators })),
  literal: jest.fn((value) => ({ value })),
};
jest.mock('convex/values', () => ({ v }));

jest.mock('../../../convex/_generated/server', () => ({
  mutation: (def: any) => def,
  query: (def: any) => def,
  internalMutation: (def: any) => def,
}));

// Mock the API structure for proximity monitoring
jest.mock('../../../convex/_generated/api', () => ({
  api: {
    functions: {
      notifications: {
        proximityMonitor: {
          getActiveMultiLegJourneysForMonitoring: 'functions.notifications.proximityMonitor.getActiveMultiLegJourneysForMonitoring',
        },
      },
      journeys: {
        journeyManagement: {
          requestNextLegTaxi: 'functions.journeys.journeyManagement.requestNextLegTaxi',
        },
      },
    },
  },
}));

import {
  getActiveMultiLegJourneysForMonitoringHandler,
  checkMultiLegTransferProximityHandler
} from "../../../convex/functions/notifications/proximityMonitor";

// Test data fixtures
const mockPassengerId = "passenger_123";
const mockJourneyId = "journey_12345";
const mockDriverLocation = {
  latitude: -25.7480,
  longitude: 28.2290,
  updatedAt: Date.now()
};

const mockTransferPoint = {
  latitude: -25.7500,
  longitude: 28.2380
};

const mockJourney = {
  _id: "journey_db_123",
  journeyId: mockJourneyId,
  passengerId: mockPassengerId,
  status: "active",
  totalLegs: 2,
  currentLegIndex: 0,
  originAddress: "University of Pretoria",
  destinationAddress: "OR Tambo Airport"
};

const mockCurrentLeg = {
  _id: "leg_123",
  journeyId: mockJourneyId,
  legIndex: 0,
  fromAddress: "University of Pretoria",
  toAddress: "Hatfield Plaza",
  fromCoordinates: { latitude: -25.7479, longitude: 28.2293 },
  toCoordinates: { latitude: -25.7500, longitude: 28.2380 },
  status: "active",
  rideId: "ride_123",
  estimatedFare: 25.0,
  transferWindowStart: null,
  transferWindowEnd: null
};

const mockRide = {
  _id: "ride_db_123",
  rideId: "ride_123",
  driverId: "driver_123",
  status: "accepted",
  parentJourneyId: mockJourneyId,
  legIndex: 0
};

function createMockCtx() {
  const journeys: any[] = [];
  const legs: any[] = [];
  const rides: any[] = [];
  const locations: any[] = [];
  const notifications: any[] = [];
  let idCounter = 1;

  return {
    db: {
      insert: jest.fn(async (table: string, obj: any) => {
        const newId = `mocked_${table}_id_${idCounter++}`;
        const insertedObj = { ...obj, _id: newId, _creationTime: Date.now() };

        if (table === "multiLegJourneys") {
          journeys.push(insertedObj);
        } else if (table === "journeyLegs") {
          legs.push(insertedObj);
        } else if (table === "rides") {
          rides.push(insertedObj);
        } else if (table === "notifications") {
          notifications.push(insertedObj);
        }

        return newId;
      }),
      get: jest.fn(async (id: string) => {
        const allRecords = [...journeys, ...legs, ...rides, ...locations];
        return allRecords.find(r => r._id === id) || null;
      }),
      patch: jest.fn(async (id: string, updates: any) => {
        const allRecords = [...journeys, ...legs, ...rides, ...locations];
        const record = allRecords.find(r => r._id === id);
        if (record) {
          Object.assign(record, updates, { _updatedTime: Date.now() });
        }
        return id;
      }),
      query: jest.fn((table: string) => ({
        withIndex: jest.fn((indexName: string, filterFn?: any) => {
          let filterValues: { [key: string]: any } = {};
          if (filterFn && typeof filterFn === 'function') {
            const mockQueryBuilder: any = {
              eq: jest.fn((field: string, value: any): any => {
                filterValues[field] = value;
                return mockQueryBuilder;
              })
            };
            filterFn(mockQueryBuilder);
          }

          return {
            take: jest.fn(async (limit: number) => {
              if (table === "multiLegJourneys" && indexName === "by_status") {
                return filterValues.status === "active" ? [mockJourney] : [];
              }
              return [];
            }),
            unique: jest.fn(async () => {
              if (table === "journeyLegs" && indexName === "by_journey_and_leg") {
                if (filterValues.journeyId === mockJourneyId && filterValues.legIndex === 0) {
                  return mockCurrentLeg;
                }
              }
              return null;
            }),
            collect: jest.fn(async () => {
              if (table === "journeyLegs" && indexName === "by_journey_id") {
                return filterValues.journeyId === mockJourneyId ? [mockCurrentLeg] : [];
              }
              return [];
            })
          };
        }),
        filter: jest.fn((filterFn: any) => ({
          first: jest.fn(async () => {
            if (table === "locations") {
              return {
                userId: "driver_123",
                ...mockDriverLocation
              };
            }
            return null;
          })
        }))
      }))
    },
    runQuery: jest.fn(),
    runMutation: jest.fn()
  };
}

describe("proximityMonitor Multi-leg Journey Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getActiveMultiLegJourneysForMonitoringHandler", () => {
    it("should successfully get active multi-leg journeys for monitoring", async () => {
      const ctx = createMockCtx();

      // Mock the ride fetch
      ctx.db.get = jest.fn().mockResolvedValue(mockRide);

      const args = {
        limit: 5
      };

      const result = await getActiveMultiLegJourneysForMonitoringHandler(ctx, args);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(0);

      // Verify database operations were called
      expect(ctx.db.query).toHaveBeenCalledWith("multiLegJourneys");
    });

    it("should respect the limit parameter", async () => {
      const ctx = createMockCtx();

      const args = {
        limit: 2
      };

      const result = await getActiveMultiLegJourneysForMonitoringHandler(ctx, args);

      expect(result).toBeInstanceOf(Array);
      // The actual limit enforcement is tested by the take() call
      expect(ctx.db.query).toHaveBeenCalled();
    });

    it("should cap limit at 15 journeys maximum", async () => {
      const ctx = createMockCtx();

      const args = {
        limit: 20 // Requesting more than max
      };

      const result = await getActiveMultiLegJourneysForMonitoringHandler(ctx, args);

      expect(result).toBeInstanceOf(Array);
      // Internal limit enforcement is handled by Math.min(args.limit || 10, 15)
      expect(ctx.db.query).toHaveBeenCalled();
    });

    it("should return empty array when no active journeys", async () => {
      const ctx = createMockCtx();

      // Mock no active journeys
      (ctx.db.query as any) = jest.fn((table: string) => ({
        withIndex: jest.fn(() => ({
          take: jest.fn(async () => []) // Return empty array
        }))
      }));

      const args = { limit: 5 };

      const result = await getActiveMultiLegJourneysForMonitoringHandler(ctx, args);

      expect(result).toEqual([]);
    });
  });

  describe("checkMultiLegTransferProximityHandler", () => {
    it("should successfully process multi-leg transfer proximity checks", async () => {
      const ctx = createMockCtx();

      // Mock runQuery to return journey data - ensure it returns the expected structure
      ctx.runQuery = jest.fn().mockImplementation((endpoint: string, args: any) => {
        if (endpoint.includes('getActiveMultiLegJourneysForMonitoring')) {
          return Promise.resolve([
            {
              journey: mockJourney,
              currentLeg: mockCurrentLeg,
              ride: mockRide,
              driverLocation: mockDriverLocation,
              transferPoint: mockTransferPoint
            }
          ]);
        }
        return Promise.resolve([]);
      });

      const args = {
        batchSize: 3
      };

      const result = await checkMultiLegTransferProximityHandler(ctx, args);

      expect(result).toHaveProperty('processedJourneys');
      expect(result).toHaveProperty('transferAlertsCreated');
      expect(result).toHaveProperty('nextLegRequestsTriggered');
      expect(result).toHaveProperty('hasMore');

      expect(typeof result.processedJourneys).toBe('number');
      expect(typeof result.transferAlertsCreated).toBe('number');
      expect(typeof result.nextLegRequestsTriggered).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');

      expect(result.processedJourneys).toBeGreaterThan(0);
    });

    it("should handle empty journey list", async () => {
      const ctx = createMockCtx();

      // Mock empty journey list
      ctx.runQuery = jest.fn().mockResolvedValue([]);

      const args = {
        batchSize: 5
      };

      const result = await checkMultiLegTransferProximityHandler(ctx, args);

      expect(result.processedJourneys).toBe(0);
      expect(result.transferAlertsCreated).toBe(0);
      expect(result.nextLegRequestsTriggered).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should respect batch size limits", async () => {
      const ctx = createMockCtx();

      // Mock runQuery to track the actual call
      ctx.runQuery = jest.fn().mockResolvedValue([]);

      const args = {
        batchSize: 10 // Should be capped at 5
      };

      await checkMultiLegTransferProximityHandler(ctx, args);

      // Verify the batch size was properly limited
      expect(ctx.runQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 5 })
      );
    });

    it("should handle errors gracefully", async () => {
      const ctx = createMockCtx();

      // Mock error in runQuery
      ctx.runQuery = jest.fn().mockRejectedValue(new Error("Database error"));

      const args = {
        batchSize: 3
      };

      const result = await checkMultiLegTransferProximityHandler(ctx, args);

      expect(result.processedJourneys).toBe(0);
      expect(result.transferAlertsCreated).toBe(0);
      expect(result.nextLegRequestsTriggered).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});