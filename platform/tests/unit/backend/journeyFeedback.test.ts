import {
  submitJourneyFeedbackHandler,
  canSubmitFeedbackHandler,
  getJourneyForFeedbackHandler,
  requestJourneyFeedbackHandler
} from "../../../convex/functions/journeys/journeyFeedback";

describe("journeyFeedback", () => {
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
        patch: jest.fn(),
        get: jest.fn(),
        filter: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        and: jest.fn().mockReturnThis(),
        field: jest.fn(),
      },
      runMutation: jest.fn(),
    };
  });

  describe("submitJourneyFeedbackHandler", () => {
    const feedbackArgs = {
      journeyId: "journey_123",
      passengerId: "user_456",
      overallRating: 4,
      overallComment: "Good journey overall",
      legFeedback: [
        {
          legIndex: 0,
          driverId: "driver_1",
          rating: 4,
          comment: "Good first leg"
        },
        {
          legIndex: 1,
          driverId: "driver_2",
          rating: 5,
          comment: "Excellent second leg"
        }
      ],
      transferFeedback: [
        {
          transferIndex: 0,
          rating: 3,
          waitTime: 10
        }
      ],
      journeyMetrics: {
        totalDuration: 3600000,
        expectedDuration: 3000000,
        totalCost: 250,
        expectedCost: 200,
        wouldUseAgain: true,
        wouldRecommend: true
      },
      improvementSuggestions: "Better transfer coordination",
      additionalComments: "Overall satisfied"
    };

    it("should submit journey feedback successfully", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: "user_456",
        status: "completed",
        originAddress: "Start Location",
        destinationAddress: "End Location"
      };

      const mockLegs = [
        {
          _id: "leg_1",
          legIndex: 0,
          rideId: "ride_1",
          estimatedFare: 100
        },
        {
          _id: "leg_2",
          legIndex: 1,
          rideId: "ride_2",
          estimatedFare: 150
        }
      ];

      mockCtx.db.unique
        .mockResolvedValueOnce(mockJourney) // Journey query
        .mockResolvedValueOnce(null); // First ride query for driverId

      mockCtx.db.collect.mockResolvedValueOnce(mockLegs);
      mockCtx.db.get.mockResolvedValue({ driverId: "driver_1" });
      mockCtx.db.insert.mockResolvedValue("feedback_id_123");

      const result = await submitJourneyFeedbackHandler(mockCtx, feedbackArgs);

      expect(result.success).toBe(true);
      expect(result.journeyFeedbackId).toBe("feedback_id_123");
      expect(mockCtx.db.insert).toHaveBeenCalledWith("feedback", expect.objectContaining({
        passengerId: "user_456",
        rating: 4,
        startLocation: "Start Location",
        endLocation: "End Location"
      }));
    });

    it("should throw error if journey not found", async () => {
      mockCtx.db.unique.mockResolvedValueOnce(null);

      const result = await submitJourneyFeedbackHandler(mockCtx, feedbackArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Journey not found");
    });

    it("should throw error if journey not completed", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: "user_456",
        status: "active"
      };

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);

      const result = await submitJourneyFeedbackHandler(mockCtx, feedbackArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot submit feedback for incomplete journey");
    });

    it("should throw error if unauthorized passenger", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: "different_user",
        status: "completed"
      };

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);

      const result = await submitJourneyFeedbackHandler(mockCtx, feedbackArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized: Journey does not belong to this passenger");
    });
  });

  describe("canSubmitFeedbackHandler", () => {
    const checkArgs = {
      journeyId: "journey_123",
      passengerId: "user_456"
    };

    it("should allow feedback submission for completed journey", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: "user_456",
        status: "completed",
        completedAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
        totalLegs: 2,
        estimatedTotalFare: 250
      };

      mockCtx.db.unique
        .mockResolvedValueOnce(mockJourney) // Journey query
        .mockResolvedValueOnce(null); // Existing feedback query

      mockCtx.db.collect.mockResolvedValueOnce([]); // No existing feedback

      const result = await canSubmitFeedbackHandler(mockCtx, checkArgs);

      expect(result.canSubmit).toBe(true);
      expect(result.journey).toBeDefined();
      expect(result.journey.journeyId).toBe("journey_123");
    });

    it("should not allow feedback if already submitted", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: "user_456",
        status: "completed",
        completedAt: Date.now() - 24 * 60 * 60 * 1000
      };

      const mockExistingFeedback = {
        _id: "feedback_1",
        createdAt: Date.now() - 12 * 60 * 60 * 1000,
        rating: 4,
        comment: JSON.stringify({
          type: "journey_feedback",
          journeyId: "journey_123"
        })
      };

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce([mockExistingFeedback]);

      const result = await canSubmitFeedbackHandler(mockCtx, checkArgs);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe("Feedback already submitted");
      expect(result.existingFeedback).toBeDefined();
    });

    it("should not allow feedback if window expired", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        passengerId: "user_456",
        status: "completed",
        completedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
      };

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce([]);

      const result = await canSubmitFeedbackHandler(mockCtx, checkArgs);

      expect(result.canSubmit).toBe(false);
      expect(result.reason).toBe("Feedback window expired");
    });
  });

  describe("requestJourneyFeedbackHandler", () => {
    const requestArgs = {
      journeyId: "journey_123",
      passengerId: "user_456",
      delayMinutes: 5
    };

    it("should request feedback for completed journey", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        status: "completed",
        totalLegs: 2
      };

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce([]); // No recent notifications

      const result = await requestJourneyFeedbackHandler(mockCtx, requestArgs);

      expect(result.success).toBe(true);
      expect(result.scheduledFor).toBeDefined();
      expect(result.message).toBe("Feedback request scheduled successfully");
    });

    it("should not request if already sent", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        status: "completed",
        totalLegs: 2
      };

      const mockRecentNotifications = [
        {
          metadata: { journeyId: "journey_123" },
          createdAt: Date.now() - 60 * 60 * 1000 // 1 hour ago
        }
      ];

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);
      mockCtx.db.collect.mockResolvedValueOnce(mockRecentNotifications);

      const result = await requestJourneyFeedbackHandler(mockCtx, requestArgs);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Feedback request already sent");
    });

    it("should not request if journey not completed", async () => {
      const mockJourney = {
        _id: "journey_doc_1",
        journeyId: "journey_123",
        status: "active"
      };

      mockCtx.db.unique.mockResolvedValueOnce(mockJourney);

      const result = await requestJourneyFeedbackHandler(mockCtx, requestArgs);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Journey not completed");
    });
  });
});