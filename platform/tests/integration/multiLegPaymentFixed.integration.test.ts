import {
  processLegPaymentHandler,
  checkCanProgressToNextLegHandler,
  validateLegStartRequirementsHandler,
  getJourneyPaymentSummaryHandler,
} from '../../convex/functions/journeys/multiLegPaymentHandler';

import {
  handlePaymentRecoveryHandler,
  getPaymentRecoveryOptionsHandler,
  logPaymentFailureHandler,
} from '../../convex/functions/journeys/paymentRecoveryHandler';

describe('Multi-Leg Payment Integration Tests', () => {

  describe('Payment Processing Integration', () => {
    it('should handle valid payment processing', async () => {
      const mockRide = {
        _id: "ride_1",
        rideId: "ride_1",
        isMultiLegRide: true,
        parentJourneyId: "journey_123",
        finalFare: 55.00,
      };

      const mockLeg = {
        _id: "leg_1",
        journeyId: "journey_123",
        legIndex: 0,
        paymentStatus: "pending",
      };

      const mockJourney = {
        _id: "journey_1",
        journeyId: "journey_123",
        totalLegs: 3,
        status: "active",
      };

      const ctx = {
        db: {
          query: jest.fn((table) => {
            if (table === "rides") {
              return {
                withIndex: jest.fn(() => ({
                  first: jest.fn(async () => mockRide),
                })),
              };
            }
            if (table === "journeyLegs") {
              return {
                withIndex: jest.fn(() => ({
                  first: jest.fn(async () => mockLeg),
                  collect: jest.fn(async () => [mockLeg]),
                })),
              };
            }
            if (table === "multiLegJourneys") {
              return {
                withIndex: jest.fn(() => ({
                  first: jest.fn(async () => mockJourney),
                })),
              };
            }
            return {
              withIndex: jest.fn(() => ({
                first: jest.fn(async () => null),
                collect: jest.fn(async () => []),
              })),
            };
          }),
          patch: jest.fn(async (id, update) => id),
          get: jest.fn(async (id) => null),
        },
      };

      const result = await processLegPaymentHandler(ctx as any, {
        rideId: "ride_1",
        journeyId: "journey_123",
        legIndex: 0,
        amountPaid: 55.00,
        isPaid: true,
      });

      expect(result.success).toBe(true);
      expect(result.paymentType).toBe("exact");
    });
  });

  describe('Payment Recovery Integration', () => {
    it('should handle payment failure and recovery', async () => {
      const journeyId = 'journey_recovery_123';
      const failedLeg = {
        _id: 'leg_1',
        journeyId,
        legIndex: 0,
        rideId: 'ride_1',
        paymentStatus: 'failed',
        paymentNotes: '',
      };

      const journey = {
        _id: 'journey_1',
        journeyId,
        status: 'active',
      };

      let currentLeg = { ...failedLeg };

      const ctx = {
        db: {
          query: jest.fn(() => ({
            withIndex: jest.fn(() => ({
              first: jest.fn(async () => currentLeg),
            })),
          })),
          patch: jest.fn(async (id, update) => {
            if (id === currentLeg._id) {
              currentLeg = { ...currentLeg, ...update };
            }
            return id;
          }),
        },
      };

      // Log the payment failure
      const errorDetails = {
        errorType: 'network' as const,
        errorMessage: 'Connection timeout',
        attemptNumber: 1,
        timestamp: Date.now(),
      };

      const logResult = await logPaymentFailureHandler(
        ctx as any,
        journeyId,
        0,
        'ride_1',
        errorDetails
      );

      expect(logResult.success).toBe(true);
      expect(logResult.attemptNumber).toBe(1);
    });
  });

  describe('Payment Progression Control', () => {
    it('should block progression when payment is pending', async () => {
      const pendingLeg = {
        _id: 'leg_1',
        journeyId: 'journey_123',
        legIndex: 0,
        paymentStatus: 'pending',
      };

      const ctx = {
        db: {
          query: jest.fn(() => ({
            withIndex: jest.fn(() => ({
              first: jest.fn(async () => pendingLeg),
            })),
          })),
        },
      };

      const result = await checkCanProgressToNextLegHandler(
        ctx as any,
        'journey_123',
        0
      );

      expect(result.canProgress).toBe(false);
      expect(result.reason).toContain('Payment required');
    });

    it('should validate leg start requirements', async () => {
      const result = await validateLegStartRequirementsHandler(
        {} as any,
        'journey_123',
        0
      );

      expect(result.canStart).toBe(true);
      expect(result.reason).toBe('First leg - no payment requirements');
    });
  });
});