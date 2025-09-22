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
  action: (def: any) => def,
}));

import {
  processLegPaymentHandler,
  checkCanProgressToNextLegHandler,
  validateLegStartRequirementsHandler,
  getJourneyPaymentSummaryHandler,
} from "../../../convex/functions/journeys/multiLegPaymentHandler";

function createMockCtx(customData: any = {}) {
  const defaultData = {
    journeyLegs: [],
    multiLegJourneys: [],
    rides: [],
  };

  const data = { ...defaultData, ...customData };

  return {
    db: {
      query: jest.fn((table) => ({
        withIndex: jest.fn((index, callback) => {
          const query = {
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockReturnThis(),
            field: jest.fn((fieldName) => fieldName),
            first: jest.fn(async () => {
              const tableData = data[table] || [];
              return tableData.length > 0 ? tableData[0] : null;
            }),
            collect: jest.fn(async () => data[table] || []),
            filter: jest.fn((filterFn) => ({
              collect: jest.fn(async () => {
                const tableData = data[table] || [];
                // Simple mock implementation for filter
                return tableData;
              }),
            })),
          };
          if (callback) callback(query);
          return query;
        }),
        filter: jest.fn((filterFn) => ({
          collect: jest.fn(async () => data[table] || []),
        })),
      })),
      patch: jest.fn(async (id, update) => {
        // Mock successful patch
        return id;
      }),
      get: jest.fn(async (id) => {
        // Find item by id across all tables
        for (const [table, items] of Object.entries(data)) {
          const item = (items as any[]).find(item => item._id === id);
          if (item) return item;
        }
        return null;
      }),
    },
  };
}

describe("processLegPaymentHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 0,
    rideId: "ride_1",
    paymentStatus: "pending",
    estimatedFare: 50.00,
  };

  const baseRide = {
    _id: "ride_1",
    rideId: "ride_1",
    legPaymentStatus: "pending",
    actualFare: 55.00,
  };

  const baseJourney = {
    _id: "journey_1",
    journeyId: "journey_123",
    totalLegs: 3,
    status: "active",
  };

  it("should successfully process leg payment when conditions are met", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [{ ...baseRide, isMultiLegRide: true, parentJourneyId: "journey_123", finalFare: 55.00 }],
      multiLegJourneys: [baseJourney],
    });

    const result = await processLegPaymentHandler(ctx, {
      rideId: "ride_1",
      journeyId: "journey_123",
      legIndex: 0,
      amountPaid: 55.00,
      isPaid: true,
    });

    expect(result.success).toBe(true);
    expect(result.paymentType).toBe("exact");
    expect(result.changeDue).toBe(0);
    expect(ctx.db.patch).toHaveBeenCalled();
  });

  it("should throw error when ride is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [],
      multiLegJourneys: [baseJourney],
    });

    await expect(
      processLegPaymentHandler(ctx, {
        rideId: "ride_1",
        journeyId: "journey_123",
        legIndex: 0,
        amountPaid: 55.00,
        isPaid: true,
      })
    ).rejects.toThrow("Ride not found");
  });

  it("should throw error when journey leg is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [],
      rides: [{ ...baseRide, isMultiLegRide: true, parentJourneyId: "journey_123" }],
      multiLegJourneys: [baseJourney],
    });

    await expect(
      processLegPaymentHandler(ctx, {
        rideId: "ride_1",
        journeyId: "journey_123",
        legIndex: 0,
        amountPaid: 55.00,
        isPaid: true,
      })
    ).rejects.toThrow("Journey leg not found");
  });

  it("should handle underpayment correctly", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [{ ...baseRide, isMultiLegRide: true, parentJourneyId: "journey_123", finalFare: 55.00 }],
      multiLegJourneys: [baseJourney],
    });

    const result = await processLegPaymentHandler(ctx, {
      rideId: "ride_1",
      journeyId: "journey_123",
      legIndex: 0,
      amountPaid: 50.00,
      isPaid: true,
    });

    expect(result.success).toBe(true);
    expect(result.paymentType).toBe("underpaid");
    expect(result.amountOwed).toBe(5.00);
  });
});

describe("checkCanProgressToNextLegHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 0,
    paymentStatus: "completed",
  };

  it("should handle final leg completion correctly", async () => {
    const ctx = createMockCtx({
      journeyLegs: [{ ...baseLeg, paymentStatus: "completed" }],
    });

    const result = await checkCanProgressToNextLegHandler(ctx, "journey_123", 0);

    expect(result.canProgress).toBe(false);
    expect(result.reason).toContain("Journey completed");
    expect(result.isJourneyComplete).toBe(true);
  });

  it("should block progression when current leg payment is pending", async () => {
    const pendingLeg = { ...baseLeg, paymentStatus: "pending" };
    const ctx = createMockCtx({
      journeyLegs: [pendingLeg],
    });

    const result = await checkCanProgressToNextLegHandler(ctx, "journey_123", 0);

    expect(result.canProgress).toBe(false);
    expect(result.reason).toBe("Payment required for leg 1");
  });

  it("should throw error when journey leg is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [],
    });

    await expect(
      checkCanProgressToNextLegHandler(ctx, "journey_123", 0)
    ).rejects.toThrow("Current journey leg not found");
  });
});

describe("validateLegStartRequirementsHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 1,
    paymentStatus: "pending",
  };

  const prevLeg = {
    _id: "leg_0",
    journeyId: "journey_123",
    legIndex: 0,
    paymentStatus: "completed",
  };

  it("should allow leg start when previous leg payment is completed", async () => {
    const ctx = createMockCtx({
      journeyLegs: [{ ...prevLeg, paymentStatus: "completed" }],
    });

    const result = await validateLegStartRequirementsHandler(ctx, "journey_123", 1);

    expect(result.canStart).toBe(true);
    expect(result.reason).toBe("All previous legs paid - can start leg 2");
  });

  it("should allow first leg to start without previous leg check", async () => {
    const firstLeg = { ...baseLeg, legIndex: 0 };
    const ctx = createMockCtx({
      journeyLegs: [firstLeg],
    });

    const result = await validateLegStartRequirementsHandler(ctx, "journey_123", 0);

    expect(result.canStart).toBe(true);
    expect(result.reason).toBe("First leg - no payment requirements");
  });

  it("should block leg start when previous leg payment is pending", async () => {
    const pendingPrevLeg = { ...prevLeg, paymentStatus: "pending" };
    const ctx = createMockCtx({
      journeyLegs: [pendingPrevLeg, baseLeg],
    });

    const result = await validateLegStartRequirementsHandler(ctx, "journey_123", 1);

    expect(result.canStart).toBe(false);
    expect(result.reason).toContain("Payment required for previous leg");
  });
});

describe("getJourneyPaymentSummaryHandler", () => {
  const journey = {
    _id: "journey_1",
    journeyId: "journey_123",
    totalLegs: 3,
    status: "active",
    originAddress: "Origin St",
    destinationAddress: "Destination Ave",
  };

  const legs = [
    {
      _id: "leg_1",
      journeyId: "journey_123",
      legIndex: 0,
      rideId: "ride_1",
      paymentStatus: "completed",
      actualFare: 50.00,
      estimatedFare: 45.00,
      fromAddress: "Origin St",
      toAddress: "Stop 1",
      paymentConfirmedAt: Date.now(),
    },
    {
      _id: "leg_2",
      journeyId: "journey_123",
      legIndex: 1,
      rideId: "ride_2",
      paymentStatus: "pending",
      actualFare: 0,
      estimatedFare: 60.00,
      fromAddress: "Stop 1",
      toAddress: "Stop 2",
    },
    {
      _id: "leg_3",
      journeyId: "journey_123",
      legIndex: 2,
      rideId: "ride_3",
      paymentStatus: "pending",
      actualFare: 0,
      estimatedFare: 55.00,
      fromAddress: "Stop 2",
      toAddress: "Destination Ave",
    },
  ];

  it("should return comprehensive payment summary", async () => {
    // Mock rides with payment data matching leg rideIds
    const mockRides = [
      { _id: "ride_1", rideId: "ride_1", amountPaid: 50.00, finalFare: 50.00 },
      { _id: "ride_2", rideId: "ride_2", amountPaid: 0, finalFare: 60.00 },
      { _id: "ride_3", rideId: "ride_3", amountPaid: 0, finalFare: 55.00 },
    ];

    const ctx = {
      db: {
        query: jest.fn((table) => ({
          withIndex: jest.fn(() => ({
            first: jest.fn(async () => {
              if (table === "multiLegJourneys") return journey;
              return null;
            }),
            collect: jest.fn(async () => {
              if (table === "journeyLegs") return legs;
              return [];
            }),
          })),
        })),
        get: jest.fn(async (id) => {
          return mockRides.find(ride => ride.rideId === id || ride._id === id) || null;
        }),
      },
    };

    const result = await getJourneyPaymentSummaryHandler(ctx, "journey_123");

    expect(result.journey.originAddress).toBe("Origin St");
    expect(result.totalLegs).toBe(3);
    expect(result.completedLegs).toBe(1);
    expect(result.pendingLegs).toBe(2);
    expect(result.totalEstimatedFare).toBe(160.00);
    expect(result.totalActualPaid).toBe(50.00);
    expect(result.overallStatus).toBe("pending");
    expect(result.legSummaries).toHaveLength(3);
  });

  it("should show completed status when all legs are paid", async () => {
    const completedLegs = legs.map(leg => ({ ...leg, paymentStatus: "completed", actualFare: leg.estimatedFare }));
    const mockRides = [
      { _id: "ride_1", rideId: "ride_1", amountPaid: 45.00, finalFare: 45.00 },
      { _id: "ride_2", rideId: "ride_2", amountPaid: 55.00, finalFare: 55.00 },
      { _id: "ride_3", rideId: "ride_3", amountPaid: 60.00, finalFare: 60.00 },
    ];

    const ctx = {
      db: {
        query: jest.fn((table) => ({
          withIndex: jest.fn(() => ({
            first: jest.fn(async () => {
              if (table === "multiLegJourneys") return journey;
              return null;
            }),
            collect: jest.fn(async () => {
              if (table === "journeyLegs") return completedLegs;
              return [];
            }),
          })),
        })),
        get: jest.fn(async (id) => {
          return mockRides.find(ride => ride.rideId === id || ride._id === id) || null;
        }),
      },
    };

    const result = await getJourneyPaymentSummaryHandler(ctx, "journey_123");

    expect(result.overallStatus).toBe("completed");
    expect(result.completedLegs).toBe(3);
    expect(result.pendingLegs).toBe(0);
    expect(result.totalActualPaid).toBe(160.00);
  });

  it("should throw error when journey is not found", async () => {
    const ctx = createMockCtx({
      multiLegJourneys: [],
      journeyLegs: legs,
    });

    await expect(
      getJourneyPaymentSummaryHandler(ctx, "journey_123")
    ).rejects.toThrow("Journey not found");
  });
});