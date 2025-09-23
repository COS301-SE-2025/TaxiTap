import {
  handleFailedLegHandler,
  getJourneyRecoveryOptionsHandler
} from "../../../convex/functions/journeys/journeyFailureHandler";

describe("journeyFailureHandler", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        unique: jest.fn(),
        collect: jest.fn(),
        patch: jest.fn(),
        insert: jest.fn(),
      },
      runMutation: jest.fn(),
    };
  });

  describe("handleFailedLegHandler", () => {
    const failureArgs = {
      journeyId: "journey_123",
      legIndex: 1,
      passengerId: "user_456",
      failureReason: "Driver cancelled",
      rideId: "ride_789"
    };

    const mockJourney = {
      _id: "journey_doc_1",
      journeyId: "journey_123",
      passengerId: "user_456",
      status: "active",
      totalLegs: 3,
      originAddress: "Start Location",
      destinationAddress: "End Location"
    };

    const mockFailedLeg = {
      _id: "leg_doc_1",
      journeyId: "journey_123",
      legIndex: 1,
      status: "pending",
      fromAddress: "Transfer Point 1",
      toAddress: "Transfer Point 2",
      rideId: "ride_789"
    };

    const mockAllLegs = [
      { _id: "leg_1", legIndex: 0, status: "completed" },
      { _id: "leg_2", legIndex: 1, status: "pending" },
      { _id: "leg_3", legIndex: 2, status: "pending" }
    ];

    it("should handle first leg failure by cancelling journey", async () => {
      const firstLegFailure = {
        ...failureArgs,
        legIndex: 0
      };

      const firstLegFailedLeg = {
        ...mockFailedLeg,
        legIndex: 0
      };

      const firstLegAllLegs = [
        { _id: "leg_1", legIndex: 0, status: "pending" },
        { _id: "leg_2", legIndex: 1, status: "pending" },
        { _id: "leg_3", legIndex: 2, status: "pending" }
      ];

      mockCtx.db.unique
        .mockResolvedValueOnce(mockJourney)
        .mockResolvedValueOnce(firstLegFailedLeg);
      mockCtx.db.collect.mockResolvedValueOnce(firstLegAllLegs);
      mockCtx.db.patch.mockResolvedValue(undefined);
      mockCtx.db.insert.mockResolvedValue("feedback_id_123");
      mockCtx.runMutation.mockResolvedValue(undefined);

      const result = await handleFailedLegHandler(mockCtx, firstLegFailure);

      expect(result.success).toBe(true);
      expect(result.fallbackStrategy).toBe("cancel_journey");
      expect(result.journeyStatus).toBe("cancelled");

      // Should update failed leg status
      expect(mockCtx.db.patch).toHaveBeenCalledWith(firstLegFailedLeg._id, expect.objectContaining({
        status: "failed",
        failureReason: "Driver cancelled",
        failedAt: expect.any(Number)
      }));

      // Should update journey status to cancelled
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockJourney._id, expect.objectContaining({
        status: "cancelled",
        cancelledAt: expect.any(Number)
      }));

      // Should create cancellation record
      expect(mockCtx.db.insert).toHaveBeenCalledWith("feedback", expect.objectContaining({
        passengerId: "user_456",
        rating: 1,
        comment: expect.stringContaining("journey_cancellation")
      }));
    });

    it("should handle partial completion for 75%+ completed journey", async () => {
      const partialCompletionLegs = [
        { _id: "leg_1", legIndex: 0, status: "completed", estimatedFare: 100 },
        { _id: "leg_2", legIndex: 1, status: "completed", estimatedFare: 120 },
        { _id: "leg_3", legIndex: 2, status: "completed", estimatedFare: 80 },
        { _id: "leg_4", legIndex: 3, status: "pending", estimatedFare: 90 }
      ];

      const partialCompletionJourney = {
        ...mockJourney,
        totalLegs: 4
      };

      mockCtx.db.unique
        .mockResolvedValueOnce(partialCompletionJourney)
        .mockResolvedValueOnce({ ...mockFailedLeg, legIndex: 3 });
      mockCtx.db.collect.mockResolvedValueOnce(partialCompletionLegs);
      mockCtx.db.patch.mockResolvedValue(undefined);
      mockCtx.db.insert.mockResolvedValue("feedback_id_456");
      mockCtx.runMutation.mockResolvedValue(undefined);

      const result = await handleFailedLegHandler(mockCtx, { ...failureArgs, legIndex: 3 });

      expect(result.success).toBe(true);
      expect(result.fallbackStrategy).toBe("partial_completion");
      expect(result.journeyStatus).toBe("completed");

      // Should create partial completion record
      expect(mockCtx.db.insert).toHaveBeenCalledWith("feedback", expect.objectContaining({
        rating: expect.any(Number),
        comment: expect.stringContaining("journey_partial_completion")
      }));
    });

    it("should continue journey for mid-journey failures", async () => {
      mockCtx.db.unique
        .mockResolvedValueOnce(mockJourney)
        .mockResolvedValueOnce(mockFailedLeg);
      mockCtx.db.collect.mockResolvedValueOnce(mockAllLegs);
      mockCtx.db.patch.mockResolvedValue(undefined);
      mockCtx.db.insert.mockResolvedValue("feedback_id_789");
      mockCtx.runMutation.mockResolvedValue(undefined);

      const result = await handleFailedLegHandler(mockCtx, failureArgs);

      expect(result.success).toBe(true);
      expect(result.fallbackStrategy).toBe("continue_journey");
      expect(result.journeyStatus).toBe("active"); // Journey continues

      // Should create continuation record
      expect(mockCtx.db.insert).toHaveBeenCalledWith("feedback", expect.objectContaining({
        rating: 3,
        comment: expect.stringContaining("journey_continuation")
      }));
    });

    it("should cancel journey for multiple failures", async () => {
      const multipleFailureLegs = [
        { _id: "leg_1", legIndex: 0, status: "failed" },
        { _id: "leg_2", legIndex: 1, status: "failed" },
        { _id: "leg_3", legIndex: 2, status: "pending" },
        { _id: "leg_4", legIndex: 3, status: "pending" }
      ];

      mockCtx.db.unique
        .mockResolvedValueOnce({ ...mockJourney, totalLegs: 4 })
        .mockResolvedValueOnce({ ...mockFailedLeg, legIndex: 1 });
      mockCtx.db.collect.mockResolvedValueOnce(multipleFailureLegs);
      mockCtx.db.patch.mockResolvedValue(undefined);
      mockCtx.db.insert.mockResolvedValue("feedback_id_multiple");
      mockCtx.runMutation.mockResolvedValue(undefined);

      const result = await handleFailedLegHandler(mockCtx, failureArgs);

      expect(result.success).toBe(true);
      expect(result.fallbackStrategy).toBe("cancel_journey");
      expect(result.journeyStatus).toBe("cancelled");
    });

    it("should handle journey not found", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(null);

      const result = await handleFailedLegHandler(mockCtx, failureArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Journey not found");
    });

    it("should handle unauthorized passenger", async () => {
      const unauthorizedJourney = {
        ...mockJourney,
        passengerId: "different_user"
      };

      mockCtx.db.unique.mockResolvedValueOnce(unauthorizedJourney);

      const result = await handleFailedLegHandler(mockCtx, failureArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized: Journey does not belong to this passenger");
    });

    it("should handle failed leg not found", async () => {
      mockCtx.db.unique
        .mockResolvedValueOnce(mockJourney)
        .mockResolvedValueOnce(null);

      const result = await handleFailedLegHandler(mockCtx, failureArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed leg not found");
    });

    it("should handle reroute strategy for few remaining legs", async () => {
      const rerouteLegs = [
        { _id: "leg_1", legIndex: 0, status: "completed" },
        { _id: "leg_2", legIndex: 1, status: "completed" },
        { _id: "leg_3", legIndex: 2, status: "pending" },
        { _id: "leg_4", legIndex: 3, status: "pending" }
      ];

      mockCtx.db.unique
        .mockResolvedValueOnce({ ...mockJourney, totalLegs: 4 })
        .mockResolvedValueOnce({ ...mockFailedLeg, legIndex: 2 });
      mockCtx.db.collect.mockResolvedValueOnce(rerouteLegs);
      mockCtx.db.patch.mockResolvedValue(undefined);
      mockCtx.runMutation.mockResolvedValue(undefined);

      const result = await handleFailedLegHandler(mockCtx, { ...failureArgs, legIndex: 2 });

      expect(result.success).toBe(true);
      expect(result.fallbackStrategy).toBe("reroute_journey");
      expect(result.journeyStatus).toBe("active");
    });

    it("should send appropriate notifications", async () => {
      mockCtx.db.unique
        .mockResolvedValueOnce(mockJourney)
        .mockResolvedValueOnce(mockFailedLeg);
      mockCtx.db.collect.mockResolvedValueOnce(mockAllLegs);
      mockCtx.db.patch.mockResolvedValue(undefined);
      mockCtx.db.insert.mockResolvedValue("feedback_id_notification");
      mockCtx.runMutation.mockResolvedValue(undefined);

      const result = await handleFailedLegHandler(mockCtx, failureArgs);

      expect(result.success).toBe(true);

      // Should send notification
      expect(mockCtx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          rideId: "ride_789",
          type: "system_maintenance",
          passengerId: "user_456",
          metadata: expect.objectContaining({
            journeyId: "journey_123",
            failedLegIndex: 1,
            fallbackAction: "continue_journey"
          })
        })
      );
    });
  });

  describe("getJourneyRecoveryOptionsHandler", () => {
    const recoveryArgs = {
      journeyId: "journey_123",
      passengerId: "user_456"
    };

    const mockJourney = {
      _id: "journey_doc_1",
      journeyId: "journey_123",
      passengerId: "user_456",
      status: "active"
    };

    it("should provide recovery options for partially completed journey", async () => {
      const partialLegs = [
        { _id: "leg_1", legIndex: 0, status: "completed" },
        { _id: "leg_2", legIndex: 1, status: "failed" },
        { _id: "leg_3", legIndex: 2, status: "pending" }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(partialLegs);

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(true);
      expect(result.options).toHaveLength(3); // cancel_remaining, continue_journey, request_assistance
      expect(result.stats.total).toBe(3);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.pending).toBe(1);

      const optionTypes = result.options.map((option: any) => option.action);
      expect(optionTypes).toContain("cancel_remaining");
      expect(optionTypes).toContain("continue_journey");
      expect(optionTypes).toContain("request_assistance");
    });

    it("should not offer continue option for multiple failures", async () => {
      const multipleFailureLegs = [
        { _id: "leg_1", legIndex: 0, status: "completed" },
        { _id: "leg_2", legIndex: 1, status: "failed" },
        { _id: "leg_3", legIndex: 2, status: "failed" },
        { _id: "leg_4", legIndex: 3, status: "pending" }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(multipleFailureLegs);

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(true);

      const optionTypes = result.options.map((option: any) => option.action);
      expect(optionTypes).toContain("cancel_remaining");
      expect(optionTypes).not.toContain("continue_journey"); // Should not offer continue
      expect(optionTypes).toContain("request_assistance");
    });

    it("should handle journey not found", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(null);

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Journey not found");
    });

    it("should recommend cancel for high completion rate", async () => {
      const highCompletionLegs = [
        { _id: "leg_1", legIndex: 0, status: "completed" },
        { _id: "leg_2", legIndex: 1, status: "completed" },
        { _id: "leg_3", legIndex: 2, status: "completed" },
        { _id: "leg_4", legIndex: 3, status: "pending" }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(highCompletionLegs);

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(true);
      expect(result.completionRate).toBe(0.75);

      const cancelOption = result.options.find((option: any) => option.action === "cancel_remaining");
      expect(cancelOption.recommended).toBe(true);
    });

    it("should recommend continue for no failures", async () => {
      const noFailureLegs = [
        { _id: "leg_1", legIndex: 0, status: "completed" },
        { _id: "leg_2", legIndex: 1, status: "pending" },
        { _id: "leg_3", legIndex: 2, status: "pending" }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(noFailureLegs);

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(true);

      const continueOption = result.options.find((option: any) => option.action === "continue_journey");
      expect(continueOption.recommended).toBe(true);
    });

    it("should recommend assistance for multiple failures", async () => {
      const multipleFailureLegs = [
        { _id: "leg_1", legIndex: 0, status: "failed" },
        { _id: "leg_2", legIndex: 1, status: "failed" },
        { _id: "leg_3", legIndex: 2, status: "pending" }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(multipleFailureLegs);

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(true);

      const assistanceOption = result.options.find((option: any) => option.action === "request_assistance");
      expect(assistanceOption.recommended).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      mockCtx.db.unique.mockRejectedValueOnce(new Error("Database error"));

      const result = await getJourneyRecoveryOptionsHandler(mockCtx, recoveryArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });
});