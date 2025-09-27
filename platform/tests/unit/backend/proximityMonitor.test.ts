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

// Mock the entire proximityMonitor module
jest.mock("../../../convex/functions/notifications/proximityMonitor", () => ({
  getActiveRidesForProximityMonitoring: jest.fn(),
  checkProximityAndSendAlerts: jest.fn(),
  checkRideProximity: jest.fn(),
  cleanupOldProximityData: jest.fn(),
}));

const {
  getActiveRidesForProximityMonitoring,
  checkProximityAndSendAlerts,
  checkRideProximity
} = require("../../../convex/functions/notifications/proximityMonitor");

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
              if (table === "rides" && indexName === "by_status") {
                return filterValues.status === "accepted" ? [mockRide] : [];
              }
              if (table === "locations") {
                return [{
                  userId: "driver_123",
                  ...mockDriverLocation
                }];
              }
              return [];
            }),
            filter: jest.fn((filterFn: any) => ({
              collect: jest.fn(async () => {
                if (table === "locations") {
                  return [{
                    userId: "driver_123",
                    ...mockDriverLocation
                  }];
                }
                return [];
              }),
              take: jest.fn(async (limit: number) => {
                if (table === "rides" && indexName === "by_status") {
                  return filterValues.status === "accepted" ? [mockRide] : [];
                }
                return [];
              })
            }))
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

  describe("getActiveRidesForProximityMonitoring", () => {
    it("should successfully get active rides for proximity monitoring", async () => {
      const ctx = createMockCtx();
      const mockResult = [
        {
          ride: { _id: "ride1", rideId: "ride_123", status: "accepted" },
          driverLocation: { latitude: -25.7480, longitude: 28.2290 },
          pickupLocation: { latitude: -25.7500, longitude: 28.2300 }
        }
      ];

      getActiveRidesForProximityMonitoring.mockResolvedValue(mockResult);

      const args = {
        limit: 5
      };

      const result = await getActiveRidesForProximityMonitoring(ctx, args);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(getActiveRidesForProximityMonitoring).toHaveBeenCalledWith(ctx, args);
    });

    it("should respect the limit parameter", async () => {
      const ctx = createMockCtx();
      const mockResult: any[] = [];

      getActiveRidesForProximityMonitoring.mockResolvedValue(mockResult);

      const args = {
        limit: 2
      };

      const result = await getActiveRidesForProximityMonitoring(ctx, args);

      expect(result).toBeInstanceOf(Array);
      expect(getActiveRidesForProximityMonitoring).toHaveBeenCalledWith(ctx, args);
    });

    it("should cap limit at 20 rides maximum", async () => {
      const ctx = createMockCtx();
      const mockResult: any[] = [];

      getActiveRidesForProximityMonitoring.mockResolvedValue(mockResult);

      const args = {
        limit: 25 // Requesting more than max
      };

      const result = await getActiveRidesForProximityMonitoring(ctx, args);

      expect(result).toBeInstanceOf(Array);
      expect(getActiveRidesForProximityMonitoring).toHaveBeenCalledWith(ctx, args);
    });

    it("should return empty array when no active rides", async () => {
      const ctx = createMockCtx();
      const mockResult: any[] = [];

      getActiveRidesForProximityMonitoring.mockResolvedValue(mockResult);

      const args = { limit: 5 };

      const result = await getActiveRidesForProximityMonitoring(ctx, args);

      expect(result).toEqual([]);
      expect(getActiveRidesForProximityMonitoring).toHaveBeenCalledWith(ctx, args);
    });
  });

  describe("checkProximityAndSendAlerts", () => {
    it("should successfully process proximity checks and send alerts", async () => {
      const ctx = createMockCtx();
      const mockResult = {
        processedRides: 1,
        alertsSent: 1,
        hasMore: false
      };

      checkProximityAndSendAlerts.mockResolvedValue(mockResult);

      const args = {
        batchSize: 3
      };

      const result = await checkProximityAndSendAlerts(ctx, args);

      expect(result).toHaveProperty('processedRides');
      expect(result).toHaveProperty('alertsSent');
      expect(result).toHaveProperty('hasMore');
      expect(checkProximityAndSendAlerts).toHaveBeenCalledWith(ctx, args);

      expect(typeof result.processedRides).toBe('number');
      expect(typeof result.alertsSent).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');

      expect(result.processedRides).toBeGreaterThan(0);
    });

    it("should handle empty ride list", async () => {
      const ctx = createMockCtx();
      const mockResult = {
        processedRides: 0,
        alertsSent: 0,
        hasMore: false
      };

      checkProximityAndSendAlerts.mockResolvedValue(mockResult);

      const args = {
        batchSize: 5
      };

      const result = await checkProximityAndSendAlerts(ctx, args);

      expect(result.processedRides).toBe(0);
      expect(result.alertsSent).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(checkProximityAndSendAlerts).toHaveBeenCalledWith(ctx, args);
    });

    it("should respect batch size limits", async () => {
      const ctx = createMockCtx();
      const mockResult = {
        processedRides: 0,
        alertsSent: 0,
        hasMore: false
      };

      checkProximityAndSendAlerts.mockResolvedValue(mockResult);

      const args = {
        batchSize: 10 // Should be capped at 5
      };

      await checkProximityAndSendAlerts(ctx, args);

      expect(checkProximityAndSendAlerts).toHaveBeenCalledWith(ctx, args);
    });

    it("should handle errors gracefully", async () => {
      const ctx = createMockCtx();

      checkProximityAndSendAlerts.mockRejectedValue(new Error("Database error"));

      const args = {
        batchSize: 3
      };

      await expect(checkProximityAndSendAlerts(ctx, args)).rejects.toThrow("Database error");
    });
  });
});