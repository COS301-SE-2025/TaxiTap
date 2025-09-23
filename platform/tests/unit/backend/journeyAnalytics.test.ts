import { collectJourneyMetricsHandler } from "../../../convex/functions/journeys/journeyAnalytics";

describe("journeyAnalytics", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        unique: jest.fn(),
        collect: jest.fn(),
        insert: jest.fn(),
      }
    };
  });

  describe("collectJourneyMetricsHandler", () => {
    const journeyArgs = {
      journeyId: "journey_123",
      triggeredBy: "journey_completion"
    };

    const mockJourney = {
      _id: "journey_doc_1",
      journeyId: "journey_123",
      passengerId: "user_456",
      status: "completed",
      totalLegs: 3,
      originAddress: "Start Location",
      destinationAddress: "End Location",
      estimatedTotalFare: 300,
      requestedAt: 1000,
      completedAt: 5000
    };

    const mockLegs = [
      {
        _id: "leg_1",
        legIndex: 0,
        status: "completed",
        estimatedFare: 100,
        actualFare: 95,
        requestedAt: 1000,
        completedAt: 2000,
        fromAddress: "Start Location",
        toAddress: "Transfer Point 1"
      },
      {
        _id: "leg_2",
        legIndex: 1,
        status: "completed",
        estimatedFare: 120,
        actualFare: 130,
        requestedAt: 2500,
        completedAt: 3500,
        fromAddress: "Transfer Point 1",
        toAddress: "Transfer Point 2"
      },
      {
        _id: "leg_3",
        legIndex: 2,
        status: "completed",
        estimatedFare: 80,
        actualFare: 85,
        requestedAt: 4000,
        completedAt: 5000,
        fromAddress: "Transfer Point 2",
        toAddress: "End Location"
      }
    ];

    it("should collect journey metrics successfully", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(mockLegs);
      mockCtx.db.insert.mockResolvedValueOnce("analytics_id_123");

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(true);
      expect(result.analyticsId).toBe("analytics_id_123");

      // Verify analytics calculation
      expect(mockCtx.db.insert).toHaveBeenCalledWith("feedback", expect.objectContaining({
        comment: expect.stringContaining("journey_analytics"),
        passengerId: "user_456",
        startLocation: "Start Location",
        endLocation: "End Location"
      }));

      const insertedData = JSON.parse(mockCtx.db.insert.mock.calls[0][1].comment);
      expect(insertedData.type).toBe("journey_analytics");
      expect(insertedData.journeyId).toBe("journey_123");
      expect(insertedData.metrics.totalLegs).toBe(3);
      expect(insertedData.metrics.completedLegs).toBe(3);
      expect(insertedData.metrics.totalEstimatedFare).toBe(300);
      expect(insertedData.metrics.totalActualFare).toBe(310);
      expect(insertedData.metrics.fareAccuracy).toBeCloseTo(96.77);
      expect(insertedData.metrics.journeyDuration).toBe(4000);
      expect(insertedData.metrics.efficiencyScore).toBeGreaterThan(0);
    });

    it("should handle journey not found", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(null);

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Journey not found");
    });

    it("should handle journey not completed", async () => {
      const incompleteJourney = {
        ...mockJourney,
        status: "active"
      };

      mockCtx.db.unique.mockResolvedValueOnce(incompleteJourney);

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Journey not completed yet");
    });

    it("should handle missing journey legs", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce([]);

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No journey legs found");
    });

    it("should calculate metrics for partially completed journey", async () => {
      const partialLegs = [
        {
          ...mockLegs[0],
          status: "completed"
        },
        {
          ...mockLegs[1],
          status: "completed"
        },
        {
          ...mockLegs[2],
          status: "failed"
        }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(partialLegs);
      mockCtx.db.insert.mockResolvedValueOnce("analytics_id_456");

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(true);

      const insertedData = JSON.parse(mockCtx.db.insert.mock.calls[0][1].comment);
      expect(insertedData.metrics.completedLegs).toBe(2);
      expect(insertedData.metrics.completionRate).toBeCloseTo(66.67);
      expect(insertedData.metrics.totalActualFare).toBe(225); // Only completed legs
    });

    it("should handle transfer time calculations", async () => {
      const legsWithTransfers = [
        {
          ...mockLegs[0],
          completedAt: 2000
        },
        {
          ...mockLegs[1],
          requestedAt: 2300, // 5 minute transfer
          completedAt: 3500
        },
        {
          ...mockLegs[2],
          requestedAt: 3800, // 5 minute transfer
          completedAt: 5000
        }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(legsWithTransfers);
      mockCtx.db.insert.mockResolvedValueOnce("analytics_id_789");

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(true);

      const insertedData = JSON.parse(mockCtx.db.insert.mock.calls[0][1].comment);
      expect(insertedData.metrics.totalTransferTime).toBe(600000); // 10 minutes in milliseconds
      expect(insertedData.metrics.averageTransferTime).toBe(300000); // 5 minutes average
    });

    it("should calculate correct efficiency score", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(mockLegs);
      mockCtx.db.insert.mockResolvedValueOnce("analytics_id_efficiency");

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(true);

      const insertedData = JSON.parse(mockCtx.db.insert.mock.calls[0][1].comment);

      // Efficiency score should be between 0 and 100
      expect(insertedData.metrics.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(insertedData.metrics.efficiencyScore).toBeLessThanOrEqual(100);

      // Should have high completion rate (100%)
      expect(insertedData.metrics.completionRate).toBe(100);
    });

    it("should handle database insertion failure gracefully", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(mockLegs);
      mockCtx.db.insert.mockRejectedValueOnce(new Error("Database insertion failed"));

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database insertion failed");
    });

    it("should handle missing timestamps gracefully", async () => {
      const legsWithMissingTimes = mockLegs.map(leg => ({
        ...leg,
        requestedAt: undefined,
        completedAt: undefined
      }));

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(legsWithMissingTimes);
      mockCtx.db.insert.mockResolvedValueOnce("analytics_id_missing_times");

      const result = await collectJourneyMetricsHandler(mockCtx, journeyArgs);

      expect(result.success).toBe(true);

      const insertedData = JSON.parse(mockCtx.db.insert.mock.calls[0][1].comment);
      expect(insertedData.metrics.journeyDuration).toBe(0);
      expect(insertedData.metrics.totalTransferTime).toBe(0);
    });
  });
});