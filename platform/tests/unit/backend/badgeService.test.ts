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
});