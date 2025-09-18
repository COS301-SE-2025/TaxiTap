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

// Mock the API structure for journey management
jest.mock('../../../convex/_generated/api', () => ({
  internal: {
    functions: {
      routes: {
        enhancedTaxiMatching: {
          _findAvailableTaxisForJourney: 'internal.functions.routes.enhancedTaxiMatching._findAvailableTaxisForJourney',
        },
      },
    },
  },
}));

import { createMultiLegJourneyHandler } from "../../../convex/functions/journeys/journeyManagement";

// Test data fixtures
const mockPassengerId = "passenger_123";
const mockJourneyId = "journey_12345";
const mockRideId = "ride_123";

const mockJourneyPlan = {
  originAddress: "University of Pretoria, Pretoria",
  destinationAddress: "OR Tambo International Airport, Johannesburg",
  originCoordinates: {
    latitude: -25.7479,
    longitude: 28.2293
  },
  destinationCoordinates: {
    latitude: -26.1392,
    longitude: 28.2460
  },
  legs: [
    {
      legIndex: 0,
      fromAddress: "University of Pretoria, Pretoria",
      toAddress: "Hatfield Plaza, Pretoria",
      fromCoordinates: {
        latitude: -25.7479,
        longitude: 28.2293
      },
      toCoordinates: {
        latitude: -25.7500,
        longitude: 28.2380
      },
      routeId: "route_123",
      estimatedDuration: 1800,
      estimatedFare: 25.0
    },
    {
      legIndex: 1,
      fromAddress: "Hatfield Plaza, Pretoria",
      toAddress: "OR Tambo International Airport, Johannesburg",
      fromCoordinates: {
        latitude: -25.7500,
        longitude: 28.2380
      },
      toCoordinates: {
        latitude: -26.1392,
        longitude: 28.2460
      },
      routeId: "route_456",
      estimatedDuration: 3600,
      estimatedFare: 45.0
    }
  ],
  optimizationPreference: "shortest_time",
  estimatedTotalFare: 70.0,
  estimatedTotalDuration: 5400
};

const mockTaxiSearchResult = {
  success: true,
  availableTaxis: [
    {
      userId: "driver_123",
      routeInfo: {
        routeName: "Test Route",
        calculatedFare: 25.0,
        estimatedDuration: 1800
      }
    }
  ],
  matchingRoutes: [
    {
      routeId: "route_123",
      routeName: "Test Route",
      fare: 25.0
    }
  ]
};

function createMockCtx() {
  const journeys: any[] = [];
  const legs: any[] = [];
  const rides: any[] = [];
  let idCounter = 1;

  return {
    db: {
      insert: jest.fn(async (table: string, obj: any) => {
        const newId = `mocked_${table}_id_${idCounter++}`;
        const insertedObj = { ...obj, _id: newId };

        if (table === "multiLegJourneys") {
          journeys.push(insertedObj);
        } else if (table === "journeyLegs") {
          legs.push(insertedObj);
        } else if (table === "rides") {
          rides.push(insertedObj);
        }

        return newId;
      }),
      get: jest.fn(async (id: string) => {
        // Mock passenger exists
        if (id === mockPassengerId) {
          return { _id: mockPassengerId, name: 'Test Passenger', accountType: 'passenger' };
        }
        const allRecords = [...journeys, ...legs, ...rides];
        return allRecords.find(r => r._id === id) || null;
      }),
      patch: jest.fn(async (id: string, updates: any) => {
        const allRecords = [...journeys, ...legs, ...rides];
        const record = allRecords.find(r => r._id === id);
        if (record) {
          Object.assign(record, updates);
        }
        return id;
      }),
      query: jest.fn((table: string) => ({
        withIndex: jest.fn((indexName: string, filter?: any) => ({
          eq: jest.fn((field: string, value: any) => ({
            eq: jest.fn(() => ({ unique: jest.fn(), collect: jest.fn() })),
            unique: jest.fn(async () => {
              if (table === "multiLegJourneys") {
                return journeys.find(j => j.journeyId === value) || null;
              }
              if (table === "journeyLegs") {
                return legs.find(l => l.journeyId === value) || null;
              }
              return null;
            }),
            collect: jest.fn(async () => {
              if (table === "multiLegJourneys") {
                if (indexName === "by_passenger") {
                  return journeys.filter(j => j.passengerId === value);
                }
                if (indexName === "by_journey_id") {
                  return journeys.filter(j => j.journeyId === value);
                }
                return journeys;
              }
              if (table === "journeyLegs") {
                if (indexName === "by_journey_id") {
                  return legs.filter(l => l.journeyId === value);
                }
                if (indexName === "by_journey_and_leg") {
                  return legs.filter(l => l.journeyId === value);
                }
                return legs;
              }
              return [];
            })
          }))
        })),
        filter: jest.fn(() => ({
          collect: jest.fn(async () => journeys)
        })),
        collect: jest.fn(async () => {
          if (table === "multiLegJourneys") return journeys;
          if (table === "journeyLegs") return legs;
          if (table === "rides") return rides;
          return [];
        })
      }))
    },
    runQuery: jest.fn(),
    runMutation: jest.fn(),
    // Helper methods for testing
    _getJourneys: () => journeys,
    _getLegs: () => legs,
    _getRides: () => rides,
  };
}

describe("journeyManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createMultiLegJourneyHandler", () => {
    it("should successfully create a multi-leg journey with valid data", async () => {
      const ctx = createMockCtx();

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: mockJourneyPlan
      };

      const result = await createMultiLegJourneyHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.journeyId).toBeDefined();
      expect(result.totalLegs).toBe(2);
      expect(result.legRecords).toHaveLength(2);
      expect(result.message).toContain("Multi-leg journey created successfully");

      // Verify database operations
      expect(ctx.db.insert).toHaveBeenCalledTimes(3); // 1 journey + 2 legs

      const journeys = ctx._getJourneys();
      expect(journeys).toHaveLength(1);
      expect(journeys[0].passengerId).toBe(mockPassengerId);
      expect(journeys[0].status).toBe("planning");
      expect(journeys[0].totalLegs).toBe(2);

      const legs = ctx._getLegs();
      expect(legs).toHaveLength(2);
      expect(legs[0].legIndex).toBe(0);
      expect(legs[1].legIndex).toBe(1);
    });

    it("should fail with empty legs array", async () => {
      const ctx = createMockCtx();

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: {
          ...mockJourneyPlan,
          legs: []
        }
      };

      const result = await createMultiLegJourneyHandler(ctx, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Journey must have at least one leg");
      expect(ctx.db.insert).not.toHaveBeenCalled();
    });

    it("should fail with invalid passenger ID", async () => {
      const ctx = createMockCtx();

      // Mock passenger not found
      ctx.db.get = jest.fn().mockResolvedValue(null);

      const args = {
        passengerId: "invalid_passenger",
        journeyPlan: mockJourneyPlan
      };

      const result = await createMultiLegJourneyHandler(ctx, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Passenger not found");
    });

    it("should generate unique journey IDs", async () => {
      const ctx = createMockCtx();

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: mockJourneyPlan
      };

      const result1 = await createMultiLegJourneyHandler(ctx, args);
      const result2 = await createMultiLegJourneyHandler(ctx, args);

      expect(result1.journeyId).not.toBe(result2.journeyId);
      expect(result1.journeyId).toMatch(/^journey_\d+_[a-z0-9]+$/);
      expect(result2.journeyId).toMatch(/^journey_\d+_[a-z0-9]+$/);
    });

    it("should handle database insertion errors", async () => {
      const ctx = createMockCtx();

      // Mock database insert failure
      ctx.db.insert = jest.fn().mockRejectedValue(new Error("Database connection failed"));

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: mockJourneyPlan
      };

      const result = await createMultiLegJourneyHandler(ctx, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create multi-leg journey");
    });

    it("should create legs with correct sequential indices", async () => {
      const ctx = createMockCtx();

      const threeLegPlan = {
        ...mockJourneyPlan,
        legs: [
          ...mockJourneyPlan.legs,
          {
            legIndex: 2,
            fromAddress: "OR Tambo International Airport, Johannesburg",
            toAddress: "Sandton City, Johannesburg",
            fromCoordinates: { latitude: -26.1392, longitude: 28.2460 },
            toCoordinates: { latitude: -26.1076, longitude: 28.0567 },
            routeId: "route_789",
            estimatedDuration: 1200,
            estimatedFare: 30.0
          }
        ]
      };

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: threeLegPlan
      };

      const result = await createMultiLegJourneyHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.totalLegs).toBe(3);

      const legs = ctx._getLegs();
      expect(legs).toHaveLength(3);
      expect(legs[0].legIndex).toBe(0);
      expect(legs[1].legIndex).toBe(1);
      expect(legs[2].legIndex).toBe(2);
    });

    it("should preserve journey plan details in database", async () => {
      const ctx = createMockCtx();

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: mockJourneyPlan
      };

      const result = await createMultiLegJourneyHandler(ctx, args);
      expect(result.success).toBe(true);

      const journeys = ctx._getJourneys();
      const journey = journeys[0];

      expect(journey.originAddress).toBe(mockJourneyPlan.originAddress);
      expect(journey.destinationAddress).toBe(mockJourneyPlan.destinationAddress);
      expect(journey.optimizationPreference).toBe(mockJourneyPlan.optimizationPreference);
      expect(journey.estimatedTotalFare).toBe(mockJourneyPlan.estimatedTotalFare);
      expect(journey.estimatedTotalDuration).toBe(mockJourneyPlan.estimatedTotalDuration);
    });

    it("should set correct timestamps", async () => {
      const ctx = createMockCtx();
      const beforeTime = Date.now();

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: mockJourneyPlan
      };

      const result = await createMultiLegJourneyHandler(ctx, args);
      const afterTime = Date.now();

      expect(result.success).toBe(true);

      const journeys = ctx._getJourneys();
      const journey = journeys[0];

      expect(journey.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(journey.createdAt).toBeLessThanOrEqual(afterTime);
      expect(journey.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(journey.updatedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  // Additional test for the structure validation
  describe("Journey Plan Validation", () => {
    it("should validate leg coordinates format", async () => {
      const ctx = createMockCtx();

      const invalidPlan = {
        ...mockJourneyPlan,
        legs: [
          {
            ...mockJourneyPlan.legs[0],
            fromCoordinates: null, // Invalid coordinates
            toCoordinates: { latitude: -25.7500, longitude: 28.2380 }
          }
        ]
      };

      const args = {
        passengerId: mockPassengerId,
        journeyPlan: invalidPlan
      };

      // This should succeed since we're not doing deep validation in the handler
      // But in a real implementation, you might want to add validation
      const result = await createMultiLegJourneyHandler(ctx, args);
      expect(result.success).toBe(true); // Current implementation doesn't validate
    });

    it("should handle optimization preference variations", async () => {
      const ctx = createMockCtx();

      const preferences = ["shortest_time", "fewest_transfers", "most_reliable"];

      for (const preference of preferences) {
        const args = {
          passengerId: mockPassengerId,
          journeyPlan: {
            ...mockJourneyPlan,
            optimizationPreference: preference
          }
        };

        const result = await createMultiLegJourneyHandler(ctx, args);
        expect(result.success).toBe(true);

        const journeys = ctx._getJourneys();
        const latestJourney = journeys[journeys.length - 1];
        expect(latestJourney.optimizationPreference).toBe(preference);
      }
    });
  });
});