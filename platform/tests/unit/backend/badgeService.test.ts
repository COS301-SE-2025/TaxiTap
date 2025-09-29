// tests/unit/backend/badgeService.test.ts
import * as badgeService from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("Badge Service", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  describe("Trusted Payer Badge", () => {
    it("returns not eligible if user has no completed rides", async () => {
      mockCtx.db.query.mockReturnValue({
        withIndex: () => ({
          filter: () => ({ collect: async () => [] }),
        }),
      });

      const result = await badgeService.checkTrustedPayerEligibility(mockCtx, "user1" as Id<"taxiTap_users">);
      expect(result.isEligible).toBe(false);
      expect(result.currentRides).toBe(0);
      expect(result.paidRides).toBe(0);
      expect(result.paymentRate).toBe(0);
    });

    it("returns eligible if all rides are paid", async () => {
      const rides = [
        { tripPaid: true },
        { tripPaid: true },
      ];

      mockCtx.db.query.mockReturnValue({
        withIndex: () => ({
          filter: () => ({ collect: async () => rides }),
        }),
      });

      const result = await badgeService.checkTrustedPayerEligibility(mockCtx, "user2" as Id<"taxiTap_users">);
      expect(result.isEligible).toBe(true);
      expect(result.currentRides).toBe(2);
      expect(result.paidRides).toBe(2);
      expect(result.paymentRate).toBe(100);
    });
  });

  describe("Awarding Badges", () => {
    it("creates a new badge if none exists", async () => {
      mockCtx.db.query.mockReturnValue({
        withIndex: () => ({
          first: async () => null,
        }),
      });
      await badgeService.awardBadge(mockCtx, "user1" as Id<"taxiTap_users">, "trusted_payer");
      expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", expect.objectContaining({
        userId: "user1",
        badgeType: "trusted_payer",
        isActive: true,
      }));
    });

    it("updates existing badge if already present", async () => {
      const existingBadge = { _id: "badge1", isActive: false };
      mockCtx.db.query.mockReturnValue({
        withIndex: () => ({
          first: async () => existingBadge,
        }),
      });
      await badgeService.awardBadge(mockCtx, "user1" as Id<"taxiTap_users">, "trusted_payer");
      expect(mockCtx.db.patch).toHaveBeenCalledWith("badge1", expect.objectContaining({
        isActive: true,
      }));
    });
  });

  describe("Top Earner Badge", () => {
    it("returns not eligible if user not in top 10", async () => {
    mockCtx.db.query.mockImplementation((table: any) => {
        if (table === "taxiTap_users") {
        return {
            filter: () => ({ collect: async () => [] }),
        };
        } else if (table === "trips") {
        return {
            withIndex: () => ({ collect: async () => [] }),
        };
        }
        return { collect: async () => [] };
    });

    const result = await badgeService.checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);
    expect(result.isEligible).toBe(false);
    });

    it("returns eligible if user is in top 10", async () => {
      const driver = { _id: "driver1", accountType: "driver" };
      const trips = [{ fare: 50 }];
      
      mockCtx.db.query.mockImplementation((table: any) => {
        if (table === "taxiTap_users") {
          return { filter: () => ({ collect: async () => [driver] }) };
        } else if (table === "trips") {
          return { withIndex: () => ({ collect: async () => trips }) };
        }
        return { collect: async () => [] };
      });

      const result = await badgeService.checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);
      expect(result.isEligible).toBe(true);
    });
  });

  describe("Marathon Driver Badge", () => {
    it("returns eligible if driver has completed rides", async () => {
      const rides = [{}, {}];
      mockCtx.db.query.mockReturnValue({
        withIndex: () => ({
          filter: () => ({ collect: async () => rides }),
        }),
      });

      const result = await badgeService.checkMarathonDriverEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);
      expect(result.isEligible).toBe(true);
      expect(result.currentRides).toBe(2);
    });

    it("returns not eligible if driver has no rides", async () => {
      mockCtx.db.query.mockReturnValue({
        withIndex: () => ({
          filter: () => ({ collect: async () => [] }),
        }),
      });

      const result = await badgeService.checkMarathonDriverEligibility(mockCtx, "driver2" as Id<"taxiTap_users">);
      expect(result.isEligible).toBe(false);
    });
  });

  describe("Additional Badge Service Tests", () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        db: {
          query: jest.fn(),
          insert: jest.fn(),
          patch: jest.fn(),
        },
      };
    });

    describe("Trusted Payer Badge edge cases", () => {
      it("returns not eligible if some rides are unpaid", async () => {
        const rides = [
          { tripPaid: true },
          { tripPaid: false },
          { tripPaid: true },
        ];

        mockCtx.db.query.mockReturnValue({
          withIndex: () => ({
            filter: () => ({ collect: async () => rides }),
          }),
        });

        const result = await badgeService.checkTrustedPayerEligibility(mockCtx, "user3" as Id<"taxiTap_users">);
        expect(result.isEligible).toBe(false);
        expect(result.currentRides).toBe(3);
        expect(result.paidRides).toBe(2);
        expect(result.paymentRate).toBeCloseTo(66.666, 1);
      });
    });

    describe("Top Earner Badge edge cases", () => {
      it("does not award badge if top 10 has zero earnings", async () => {
        mockCtx.db.query.mockImplementation((table: any) => {
          if (table === "taxiTap_users") {
            return { filter: () => ({ collect: async () => [{ _id: "driver1" }] }) };
          } else if (table === "trips") {
            return { withIndex: () => ({ collect: async () => [{ fare: 0 }] }) };
          }
          return { collect: async () => [] };
        });

        const result = await badgeService.checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);
        expect(result.isEligible).toBe(false);
      });

      it("correctly awards badge to top earner", async () => {
        const trips = [{ fare: 100 }, { fare: 200 }];
        const driver = { _id: "driverTop", accountType: "driver" };

        mockCtx.db.query.mockImplementation((table: any) => {
          if (table === "taxiTap_users") {
            return { filter: () => ({ collect: async () => [driver] }) };
          } else if (table === "trips") {
            return { withIndex: () => ({ collect: async () => trips }) };
          } else if (table === "badges") {
            return {
              withIndex: () => ({
                first: async () => null, // simulate no existing badge
              }),
            };
          }
          return { collect: async () => [] };
        });

        const result = await badgeService.checkAndAwardTopEarnerBadge(
          mockCtx,
          "driverTop" as Id<"taxiTap_users">
        );

        expect(mockCtx.db.insert).toHaveBeenCalledWith(
          "badges",
          expect.objectContaining({
            userId: "driverTop",
            badgeType: "top_earner",
          })
        );
        expect(result).toBe(true);
      });
    });

    describe("Marathon Driver Badge edge cases", () => {
      it("awards badge for first completed ride", async () => {
        mockCtx.db.query.mockImplementation((table: any) => {
          if (table === "rides") {
            return {
              withIndex: () => ({
                filter: () => ({ collect: async () => [{}] }), // one ride completed
              }),
            };
          } else if (table === "badges") {
            return {
              withIndex: () => ({
                first: async () => null, // simulate no existing badge
              }),
            };
          }
          return { collect: async () => [] };
        });

        const result = await badgeService.checkAndAwardMarathonDriverBadge(
          mockCtx,
          "driverOne" as Id<"taxiTap_users">
        );

        expect(result).toBe(true);
        expect(mockCtx.db.insert).toHaveBeenCalledWith(
          "badges",
          expect.objectContaining({
            userId: "driverOne",
            badgeType: "marathon_driver",
          })
        );
      });
    });

    describe("getUserBadges", () => {
      it("returns formatted badges with definitions", async () => {
        const badgeRecord = {
          badgeType: "trusted_payer",
          earnedAt: 123456,
          isActive: true,
          metadata: { totalRides: 5 },
        };
        mockCtx.db.query.mockReturnValue({
          withIndex: () => ({
            filter: () => ({ collect: async () => [badgeRecord] }),
          }),
        });

        const badges = await badgeService.getUserBadges(mockCtx, "userX" as Id<"taxiTap_users">);
        expect(badges[0]).toMatchObject({
          badgeType: "trusted_payer",
          name: "Trusted Payer",
          earnedAt: 123456,
          isActive: true,
          metadata: { totalRides: 5 },
        });
      });
    });
  });
});