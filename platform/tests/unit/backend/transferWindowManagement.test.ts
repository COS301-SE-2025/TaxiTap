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

import {
  manageTransferWindowHandler
} from "../../../convex/functions/notifications/proximityMonitor";

// Test data fixtures
const mockJourneyId = "journey_12345";
const mockLegIndex = 0;
const mockCurrentTime = Date.now();

const mockLeg = {
  _id: "leg_123",
  journeyId: mockJourneyId,
  legIndex: mockLegIndex,
  fromAddress: "University of Pretoria",
  toAddress: "Hatfield Plaza",
  fromCoordinates: { latitude: -25.7479, longitude: 28.2293 },
  toCoordinates: { latitude: -25.7500, longitude: 28.2380 },
  status: "active",
  rideId: "ride_123",
  estimatedFare: 25.0,
  transferWindowStart: null as number | null,
  transferWindowEnd: null as number | null
};

function createMockCtx() {
  const legs: any[] = [mockLeg];
  let idCounter = 1;

  return {
    db: {
      insert: jest.fn(async (table: string, obj: any) => {
        const newId = `mocked_${table}_id_${idCounter++}`;
        return newId;
      }),
      get: jest.fn(async (id: string) => {
        return legs.find(l => l._id === id) || null;
      }),
      patch: jest.fn(async (id: string, updates: any) => {
        const leg = legs.find(l => l._id === id);
        if (leg) {
          Object.assign(leg, updates);
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
            unique: jest.fn(async () => {
              if (table === "journeyLegs" && indexName === "by_journey_and_leg") {
                if (filterValues.journeyId === mockJourneyId && filterValues.legIndex === mockLegIndex) {
                  return legs[0];
                }
              }
              return null;
            })
          };
        })
      }))
    },
    runQuery: jest.fn(),
    runMutation: jest.fn()
  };
}

describe("Transfer Window Management Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock leg data
    mockLeg.transferWindowStart = null;
    mockLeg.transferWindowEnd = null;
  });

  describe("manageTransferWindowHandler", () => {
    it("should start a new transfer window successfully", async () => {
      const ctx = createMockCtx();

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "start_window"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.transferWindow).toBeDefined();
      expect(result.transferWindow.isActive).toBe(true);
      expect(result.transferWindow.status).toBe('active');
      expect(result.transferWindow.remainingTime).toBeGreaterThan(0);
      expect(result.message).toContain("Transfer window started");

      // Verify database patch was called
      expect(ctx.db.patch).toHaveBeenCalledWith(
        mockLeg._id,
        expect.objectContaining({
          transferWindowStart: expect.any(Number),
          transferWindowEnd: expect.any(Number)
        })
      );
    });

    it("should extend an existing transfer window", async () => {
      const ctx = createMockCtx();

      // Set up existing window
      (mockLeg.transferWindowStart as any) = mockCurrentTime - (5 * 60 * 1000); // 5 minutes ago
      (mockLeg.transferWindowEnd as any) = mockCurrentTime + (10 * 60 * 1000); // 10 minutes from now

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "extend_window",
        extensionMinutes: 5
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.transferWindow).toBeDefined();
      expect(result.transferWindow.isActive).toBe(true);
      expect(result.transferWindow.status).toBe('extended');
      expect(result.message).toContain("extended");

      // Verify database patch was called with extended time
      expect(ctx.db.patch).toHaveBeenCalledWith(
        mockLeg._id,
        expect.objectContaining({
          transferWindowEnd: expect.any(Number)
        })
      );
    });

    it("should close a transfer window", async () => {
      const ctx = createMockCtx();

      // Set up existing window
      (mockLeg.transferWindowStart as any) = mockCurrentTime - (10 * 60 * 1000);
      (mockLeg.transferWindowEnd as any) = mockCurrentTime + (5 * 60 * 1000);

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "close_window"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.transferWindow).toBeDefined();
      expect(result.transferWindow.isActive).toBe(false);
      expect(result.transferWindow.status).toBe('closed');
      expect(result.transferWindow.remainingTime).toBe(0);
      expect(result.message).toContain("closed");

      // Verify database patch was called to close window
      expect(ctx.db.patch).toHaveBeenCalledWith(
        mockLeg._id,
        expect.objectContaining({
          transferWindowEnd: expect.any(Number)
        })
      );
    });

    it("should check transfer window status", async () => {
      const ctx = createMockCtx();

      // Set up existing active window
      (mockLeg.transferWindowStart as any) = mockCurrentTime - (5 * 60 * 1000);
      (mockLeg.transferWindowEnd as any) = mockCurrentTime + (10 * 60 * 1000);

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "check_status"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.transferWindow).toBeDefined();
      expect(result.transferWindow.isActive).toBe(true);
      expect(result.transferWindow.remainingTime).toBeGreaterThan(0);
      expect(result.transferWindow.status).toBe('active');

      // Should not call patch for status check
      expect(ctx.db.patch).not.toHaveBeenCalled();
    });

    it("should detect expired transfer window", async () => {
      const ctx = createMockCtx();

      // Set up expired window
      (mockLeg.transferWindowStart as any) = mockCurrentTime - (20 * 60 * 1000); // 20 minutes ago
      (mockLeg.transferWindowEnd as any) = mockCurrentTime - (5 * 60 * 1000); // 5 minutes ago

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "check_status"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(true);
      expect(result.transferWindow).toBeDefined();
      expect(result.transferWindow.isActive).toBe(false);
      expect(result.transferWindow.status).toBe('expired');
      expect(result.transferWindow.remainingTime).toBe(0);
    });

    it("should handle journey leg not found", async () => {
      const ctx = createMockCtx();

      // Mock leg not found
      (ctx.db.query as any) = jest.fn(() => ({
        withIndex: jest.fn(() => ({
          unique: jest.fn(async () => null)
        }))
      }));

      const args = {
        journeyId: "non_existent_journey",
        legIndex: 0,
        action: "start_window"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Journey leg not found");
    });

    it("should handle invalid action", async () => {
      const ctx = createMockCtx();

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "invalid_action"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });

    it("should handle database errors gracefully", async () => {
      const ctx = createMockCtx();

      // Mock database error
      ctx.db.patch = jest.fn().mockRejectedValue(new Error("Database error"));

      const args = {
        journeyId: mockJourneyId,
        legIndex: mockLegIndex,
        action: "start_window"
      };

      const result = await manageTransferWindowHandler(ctx, args);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to manage transfer window");
    });
  });
});