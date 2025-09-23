import { checkAndAwardJourneyBadgesHandler } from "../../../convex/functions/badges/journeyBadges";

describe("journeyBadges", () => {
  let mockCtx: any;

  beforeEach(() => {
    const mockChain = {
      query: jest.fn().mockReturnThis(),
      withIndex: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      unique: jest.fn(),
      collect: jest.fn(),
      first: jest.fn(),
      insert: jest.fn(),
    };

    mockCtx = {
      db: mockChain,
    };
  });

  describe("checkAndAwardJourneyBadgesHandler", () => {
    const badgeArgs = {
      userId: "user_456",
      journeyId: "journey_123",
      triggeredBy: "journey_completion"
    };

    it("should award Journey Pioneer badge for first completed journey", async () => {
      // Mock the sequence of database queries made by the badge checking functions

      // Mock .first() calls (checking for existing badges)
      mockCtx.db.first
        .mockResolvedValueOnce(null) // No existing journey_pioneer badge
        .mockResolvedValueOnce(null) // No existing journey_master badge
        .mockResolvedValueOnce(null); // No existing transfer_expert badge

      // Mock .collect() calls (getting completed journeys and feedback)
      mockCtx.db.collect
        .mockResolvedValueOnce([{ journeyId: "journey_123", status: "completed" }]) // One completed journey for pioneer check
        .mockResolvedValueOnce([{ journeyId: "journey_123", status: "completed" }]) // One completed journey for master check (not enough for 10+)
        .mockResolvedValueOnce([]); // No feedback records for transfer check

      mockCtx.db.insert.mockResolvedValueOnce("badge_id_123");

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(1);
      expect(result.badgesAwarded[0]).toBe("journey_pioneer");

      expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", expect.objectContaining({
        userId: "user_456",
        badgeType: "journey_pioneer",
        isActive: true,
        earnedAt: expect.any(Number),
        metadata: expect.objectContaining({
          totalJourneys: 1,
          awardedForJourney: "journey_123"
        })
      }));
    });

    it("should not award Journey Pioneer if already awarded", async () => {
      // Mock existing Journey Pioneer badge check with .first()
      mockCtx.db.first
        .mockResolvedValueOnce({ badgeType: "journey_pioneer", awardedAt: Date.now() - 86400000 }) // existing journey_pioneer badge
        .mockResolvedValueOnce(null) // no existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      // Mock journey collection calls
      mockCtx.db.collect
        .mockResolvedValueOnce([{ journeyId: "journey_123", status: "completed" }]) // completed journeys for master check
        .mockResolvedValueOnce([]); // no feedback for transfer check

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(0);
      expect(mockCtx.db.insert).not.toHaveBeenCalled();
    });

    it("should award Journey Master badge for 10+ completed journeys", async () => {
      // Mock badge existence checks with .first()
      mockCtx.db.first
        .mockResolvedValueOnce({ badgeType: "journey_pioneer", awardedAt: Date.now() - 86400000 }) // existing journey_pioneer badge
        .mockResolvedValueOnce(null) // no existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      // Mock journey collection calls
      mockCtx.db.collect
        .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => ({ journeyId: `journey_${i + 1}`, status: "completed" }))) // 10 completed journeys for pioneer check
        .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => ({ journeyId: `journey_${i + 1}`, status: "completed" }))) // 10 completed journeys for master check
        .mockResolvedValueOnce([]); // no feedback for transfer check

      mockCtx.db.insert.mockResolvedValueOnce("badge_id_456");

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(1);
      expect(result.badgesAwarded[0]).toBe("journey_master");

      expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", expect.objectContaining({
        userId: "user_456",
        badgeType: "journey_master",
        isActive: true,
        metadata: expect.objectContaining({
          totalJourneys: 10,
          awardedForJourney: "journey_123"
        })
      }));
    });

    it("should award Transfer Expert badge for high transfer ratings", async () => {
      // Mock badge existence checks with .first() - pioneer and master already exist
      mockCtx.db.first
        .mockResolvedValueOnce({ badgeType: "journey_pioneer", awardedAt: Date.now() - 86400000 }) // existing journey_pioneer badge
        .mockResolvedValueOnce({ badgeType: "journey_master", awardedAt: Date.now() - 86400000 }) // existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      // Mock collection calls - only need feedback for transfer expert check since other badges already exist
      mockCtx.db.collect
        .mockResolvedValueOnce([
          // Mock 5+ journeys with transfer feedback and high ratings
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 5 },
                { transferIndex: 1, rating: 4 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 4 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 5 },
                { transferIndex: 1, rating: 5 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 4 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 5 }
              ]
            })
          }
        ]);

      mockCtx.db.insert.mockResolvedValueOnce("badge_id_789");

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(1);
      expect(result.badgesAwarded[0]).toBe("transfer_expert");

      expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", expect.objectContaining({
        userId: "user_456",
        badgeType: "transfer_expert",
        isActive: true,
        metadata: expect.objectContaining({
          averageTransferRating: expect.any(Number),
          qualifyingJourneys: 5,
          awardedForJourney: "journey_123"
        })
      }));
    });

    it("should not award Transfer Expert if average rating is below 4.0", async () => {
      // Mock existing badges with .first()
      mockCtx.db.first
        .mockResolvedValueOnce({ badgeType: "journey_pioneer", awardedAt: Date.now() - 86400000 }) // existing journey_pioneer badge
        .mockResolvedValueOnce({ badgeType: "journey_master", awardedAt: Date.now() - 86400000 }) // existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      mockCtx.db.collect
        .mockResolvedValueOnce([
          // Mock journeys with low transfer ratings
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 3 },
                { transferIndex: 1, rating: 2 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 3 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 2 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 3 }
              ]
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [
                { transferIndex: 0, rating: 2 }
              ]
            })
          }
        ]);

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(0);
      expect(mockCtx.db.insert).not.toHaveBeenCalled();
    });

    it("should award multiple badges when eligible", async () => {
      // Mock no existing badges with .first()
      mockCtx.db.first
        .mockResolvedValueOnce(null) // no existing journey_pioneer badge
        .mockResolvedValueOnce(null) // no existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      // Mock collection calls - scenario: user completing their first journey with good transfers
      mockCtx.db.collect
        .mockResolvedValueOnce([{ journeyId: "journey_1", status: "completed" }]) // 1 completed journey for pioneer check (eligible)
        .mockResolvedValueOnce([{ journeyId: "journey_1", status: "completed" }]) // 1 completed journey for master check (not eligible)
        .mockResolvedValueOnce([
          // Mock 5+ journeys with transfer feedback and high ratings (including previous journeys from other systems)
          ...Array.from({ length: 5 }, (_, i) => ({
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: [{ transferIndex: 0, rating: 5 }]
            })
          }))
        ]); // feedback for transfer expert (eligible)

      mockCtx.db.insert
        .mockResolvedValueOnce("badge_pioneer_id")
        .mockResolvedValueOnce("badge_transfer_id");

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(2);
      expect(result.badgesAwarded).toContain("journey_pioneer");
      expect(result.badgesAwarded).toContain("transfer_expert");

      expect(mockCtx.db.insert).toHaveBeenCalledTimes(2);
    });

    it("should handle database errors gracefully", async () => {
      mockCtx.db.first.mockRejectedValueOnce(new Error("Database connection failed"));

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error: Database connection failed");
    });

    it("should handle invalid feedback data gracefully", async () => {
      // Mock no existing badges with .first()
      mockCtx.db.first
        .mockResolvedValueOnce(null) // no existing journey_pioneer badge
        .mockResolvedValueOnce(null) // no existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      mockCtx.db.collect
        .mockResolvedValueOnce([{ journeyId: "journey_123", status: "completed" }]) // 1 journey for pioneer
        .mockResolvedValueOnce([{ journeyId: "journey_123", status: "completed" }]) // 1 journey for master
        .mockResolvedValueOnce([
          // Mock invalid JSON in feedback
          { comment: "invalid json string" },
          { comment: JSON.stringify({ type: "other_feedback" }) }
        ]);

      mockCtx.db.insert.mockResolvedValueOnce("badge_id_pioneer");

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(1);
      expect(result.badgesAwarded[0]).toBe("journey_pioneer");
    });

    it("should not award badges if user has no completed journeys", async () => {
      // Mock no existing badges with .first()
      mockCtx.db.first
        .mockResolvedValueOnce(null) // no existing journey_pioneer badge
        .mockResolvedValueOnce(null) // no existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      mockCtx.db.collect
        .mockResolvedValueOnce([]) // No completed journeys for pioneer
        .mockResolvedValueOnce([]) // No completed journeys for master
        .mockResolvedValueOnce([]); // No feedback for transfer

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(0);
      expect(mockCtx.db.insert).not.toHaveBeenCalled();
    });

    it("should handle journey feedback with no transfers", async () => {
      // Mock existing pioneer and master badges with .first()
      mockCtx.db.first
        .mockResolvedValueOnce({ badgeType: "journey_pioneer", awardedAt: Date.now() - 86400000 }) // existing journey_pioneer badge
        .mockResolvedValueOnce({ badgeType: "journey_master", awardedAt: Date.now() - 86400000 }) // existing journey_master badge
        .mockResolvedValueOnce(null); // no existing transfer_expert badge

      mockCtx.db.collect
        .mockResolvedValueOnce([
          // Mock journeys with no transfer feedback
          {
            comment: JSON.stringify({
              type: "journey_feedback",
              transferFeedback: []
            })
          },
          {
            comment: JSON.stringify({
              type: "journey_feedback"
              // No transferFeedback property
            })
          }
        ]);

      const result = await checkAndAwardJourneyBadgesHandler(mockCtx, badgeArgs);

      expect(result.success).toBe(true);
      expect(result.badgesAwarded).toHaveLength(0);
    });
  });
});