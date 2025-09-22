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
  handlePaymentRecoveryHandler,
  getPaymentRecoveryOptionsHandler,
  logPaymentFailureHandler,
  emergencyJourneyContinuationHandler,
} from "../../../convex/functions/journeys/paymentRecoveryHandler";

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
            filter: jest.fn().mockReturnThis(),
            first: jest.fn(async () => {
              const tableData = data[table] || [];
              return tableData.length > 0 ? tableData[0] : null;
            }),
            collect: jest.fn(async () => data[table] || []),
          };
          if (callback) callback(query);
          return query;
        }),
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

describe("handlePaymentRecoveryHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 0,
    rideId: "ride_1",
    paymentStatus: "failed",
  };

  const baseRide = {
    _id: "ride_1",
    rideId: "ride_1",
    legPaymentStatus: "failed",
  };

  const baseJourney = {
    _id: "journey_1",
    journeyId: "journey_123",
    status: "active",
  };

  it("should successfully retry payment", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
      multiLegJourneys: [baseJourney],
    });

    const result = await handlePaymentRecoveryHandler(
      ctx,
      "journey_123",
      0,
      "retry"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("retry");
    expect(result.canRetry).toBe(true);
    expect(ctx.db.patch).toHaveBeenCalledWith(baseLeg._id, expect.objectContaining({
      paymentStatus: "pending",
      paymentNotes: "Payment retry initiated",
    }));
  });

  it("should successfully cancel journey", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg, { ...baseLeg, _id: "leg_2", legIndex: 1 }],
      rides: [baseRide],
      multiLegJourneys: [baseJourney],
    });

    const result = await handlePaymentRecoveryHandler(
      ctx,
      "journey_123",
      0,
      "cancel_journey"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("cancel_journey");
    expect(result.canRetry).toBe(false);
    expect(ctx.db.patch).toHaveBeenCalledWith(baseJourney._id, expect.objectContaining({
      status: "cancelled",
    }));
  });

  it("should successfully perform manual override", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
      multiLegJourneys: [baseJourney],
    });

    const result = await handlePaymentRecoveryHandler(
      ctx,
      "journey_123",
      0,
      "manual_override"
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe("manual_override");
    expect(result.canRetry).toBe(false);
    expect(ctx.db.patch).toHaveBeenCalledWith(baseLeg._id, expect.objectContaining({
      paymentStatus: "completed",
      paymentMethod: "other",
      paymentNotes: "Manual override - payment resolved through support",
    }));
  });

  it("should reject skip action", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
      multiLegJourneys: [baseJourney],
    });

    await expect(
      handlePaymentRecoveryHandler(ctx, "journey_123", 0, "skip")
    ).rejects.toThrow("Skipping payment is not allowed. Payment is required for all legs.");
  });

  it("should throw error for unknown recovery action", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
      multiLegJourneys: [baseJourney],
    });

    await expect(
      handlePaymentRecoveryHandler(ctx, "journey_123", 0, "unknown_action" as any)
    ).rejects.toThrow("Unknown recovery action: unknown_action");
  });

  it("should throw error when journey leg is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [],
      rides: [baseRide],
      multiLegJourneys: [baseJourney],
    });

    await expect(
      handlePaymentRecoveryHandler(ctx, "journey_123", 0, "retry")
    ).rejects.toThrow("Journey leg not found");
  });
});

describe("getPaymentRecoveryOptionsHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 0,
    paymentStatus: "failed",
  };

  const baseJourney = {
    _id: "journey_1",
    journeyId: "journey_123",
    status: "active",
  };

  it("should return available recovery options", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      multiLegJourneys: [baseJourney],
    });

    const result = await getPaymentRecoveryOptionsHandler(ctx, "journey_123", 0);

    expect(result.journeyId).toBe("journey_123");
    expect(result.legIndex).toBe(0);
    expect(result.currentStatus).toBe("failed");
    expect(result.availableOptions).toHaveLength(3);
    expect(result.availableOptions[0].action).toBe("retry");
    expect(result.availableOptions[1].action).toBe("cancel_journey");
    expect(result.availableOptions[2].action).toBe("contact_support");
    expect(result.emergencyContact).toEqual({
      phone: "+27 xxx xxx xxxx",
      email: "support@taxitap.co.za",
    });
  });

  it("should throw error when journey leg is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [],
      multiLegJourneys: [baseJourney],
    });

    await expect(
      getPaymentRecoveryOptionsHandler(ctx, "journey_123", 0)
    ).rejects.toThrow("Journey leg not found");
  });

  it("should throw error when journey is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      multiLegJourneys: [],
    });

    await expect(
      getPaymentRecoveryOptionsHandler(ctx, "journey_123", 0)
    ).rejects.toThrow("Journey not found");
  });
});

describe("logPaymentFailureHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 0,
    paymentNotes: "Previous attempt failed",
  };

  const baseRide = {
    _id: "ride_1",
    rideId: "ride_1",
    legPaymentStatus: "pending",
  };

  const errorDetails = {
    errorType: "network" as const,
    errorMessage: "Connection timeout",
    attemptNumber: 2,
    timestamp: Date.now(),
  };

  it("should successfully log payment failure", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
    });

    const result = await logPaymentFailureHandler(
      ctx,
      "journey_123",
      0,
      "ride_1",
      errorDetails
    );

    expect(result.success).toBe(true);
    expect(result.attemptNumber).toBe(2);
    expect(result.nextSteps).toEqual(["Retry payment", "Contact support", "Cancel journey"]);
    expect(ctx.db.patch).toHaveBeenCalledWith(baseLeg._id, expect.objectContaining({
      paymentStatus: "failed",
      paymentNotes: expect.stringContaining("Attempt 2: network - Connection timeout"),
    }));
  });

  it("should suggest limited options after max attempts", async () => {
    const errorDetailsMaxAttempts = { ...errorDetails, attemptNumber: 3 };
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
    });

    const result = await logPaymentFailureHandler(
      ctx,
      "journey_123",
      0,
      "ride_1",
      errorDetailsMaxAttempts
    );

    expect(result.nextSteps).toEqual(["Contact support", "Cancel journey"]);
  });

  it("should update ride status when rideId is provided", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
    });

    await logPaymentFailureHandler(
      ctx,
      "journey_123",
      0,
      "ride_1",
      errorDetails
    );

    expect(ctx.db.patch).toHaveBeenCalledWith(baseRide._id, expect.objectContaining({
      legPaymentStatus: "failed",
    }));
  });

  it("should throw error when journey leg is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [],
      rides: [baseRide],
    });

    await expect(
      logPaymentFailureHandler(ctx, "journey_123", 0, "ride_1", errorDetails)
    ).rejects.toThrow("Journey leg not found");
  });
});

describe("emergencyJourneyContinuationHandler", () => {
  const baseLeg = {
    _id: "leg_1",
    journeyId: "journey_123",
    legIndex: 0,
    rideId: "ride_1",
    paymentStatus: "failed",
  };

  const baseRide = {
    _id: "ride_1",
    rideId: "ride_1",
    legPaymentStatus: "failed",
  };

  it("should successfully perform emergency continuation", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
    });

    const result = await emergencyJourneyContinuationHandler(
      ctx,
      "journey_123",
      0,
      "TICKET-12345",
      "Technical payment system failure"
    );

    expect(result.success).toBe(true);
    expect(result.supportTicketId).toBe("TICKET-12345");
    expect(result.message).toBe("Emergency continuation approved for leg 1");
    expect(ctx.db.patch).toHaveBeenCalledWith(baseLeg._id, expect.objectContaining({
      paymentStatus: "completed",
      paymentMethod: "other",
      paymentNotes: "EMERGENCY OVERRIDE - Support Ticket: TICKET-12345 - Reason: Technical payment system failure",
    }));
  });

  it("should update ride status during emergency continuation", async () => {
    const ctx = createMockCtx({
      journeyLegs: [baseLeg],
      rides: [baseRide],
    });

    await emergencyJourneyContinuationHandler(
      ctx,
      "journey_123",
      0,
      "TICKET-12345",
      "Technical payment system failure"
    );

    expect(ctx.db.patch).toHaveBeenCalledWith(baseRide._id, expect.objectContaining({
      legPaymentStatus: "completed",
      legPaymentMethod: "other",
      tripPaid: true,
    }));
  });

  it("should throw error when journey leg is not found", async () => {
    const ctx = createMockCtx({
      journeyLegs: [],
      rides: [baseRide],
    });

    await expect(
      emergencyJourneyContinuationHandler(
        ctx,
        "journey_123",
        0,
        "TICKET-12345",
        "Technical payment system failure"
      )
    ).rejects.toThrow("Journey leg not found");
  });
});