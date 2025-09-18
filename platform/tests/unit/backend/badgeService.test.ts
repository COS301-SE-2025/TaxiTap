import { checkTrustedPayerEligibility, getUserBadges, awardBadge } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

// Mock context
const mockCtx = {
  db: {
    query: jest.fn(),
    get: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
  },
} as any;

describe("Badge Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkTrustedPayerEligibility", () => {
    it("should return not eligible for user with no rides", async () => {
      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await checkTrustedPayerEligibility(mockCtx, "user1" as Id<"taxiTap_users">);
      
      expect(result.isEligible).toBe(false);
      expect(result.currentRides).toBe(0);
      expect(result.paidRides).toBe(0);
      expect(result.paymentRate).toBe(0);
    });

    it("should return eligible for user with 100% payment rate", async () => {
      const mockRides = [
        { status: "completed", tripPaid: true },
        { status: "completed", tripPaid: true },
        { status: "completed", tripPaid: true },
      ];

      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRides),
          }),
        }),
      });

      const result = await checkTrustedPayerEligibility(mockCtx, "user1" as Id<"taxiTap_users">);
      
      expect(result.isEligible).toBe(true);
      expect(result.currentRides).toBe(3);
      expect(result.paidRides).toBe(3);
      expect(result.paymentRate).toBe(100);
    });

    it("should return not eligible for user with less than 100% payment rate", async () => {
      const mockRides = [
        { status: "completed", tripPaid: true },
        { status: "completed", tripPaid: false },
        { status: "completed", tripPaid: true },
      ];

      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRides),
          }),
        }),
      });

      const result = await checkTrustedPayerEligibility(mockCtx, "user1" as Id<"taxiTap_users">);
      
      expect(result.isEligible).toBe(false);
      expect(result.currentRides).toBe(3);
      expect(result.paidRides).toBe(2);
      expect(result.paymentRate).toBe(66.66666666666666);
    });
  });

  describe("getUserBadges", () => {
    it("should return user badges", async () => {
      const mockBadges = [
        {
          badgeType: "trusted_payer",
          earnedAt: Date.now(),
          isActive: true,
          metadata: { totalRides: 5, paymentRate: 100 },
        },
      ];

      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockBadges),
          }),
        }),
      });

      const result = await getUserBadges(mockCtx, "user1" as Id<"taxiTap_users">);
      
      expect(result).toHaveLength(1);
      expect(result[0].badgeType).toBe("trusted_payer");
      expect(result[0].name).toBe("Trusted Payer");
      expect(result[0].color).toBe("#10B981");
    });
  });

  describe("awardBadge", () => {
    it("should create new badge if user doesn't have it", async () => {
      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(null),
        }),
      });

      mockCtx.db.insert.mockResolvedValue("badge123");

      await awardBadge(mockCtx, "user1" as Id<"taxiTap_users">, "trusted_payer", { totalRides: 5 });

      expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
        userId: "user1",
        badgeType: "trusted_payer",
        earnedAt: expect.any(Number),
        isActive: true,
        metadata: { totalRides: 5 },
      });
    });

    it("should update existing badge if user already has it", async () => {
      const existingBadge = {
        _id: "badge123",
        userId: "user1",
        badgeType: "trusted_payer",
        earnedAt: Date.now() - 1000,
        isActive: false,
      };

      mockCtx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(existingBadge),
        }),
      });

      mockCtx.db.patch.mockResolvedValue(undefined);

      await awardBadge(mockCtx, "user1" as Id<"taxiTap_users">, "trusted_payer", { totalRides: 5 });

      expect(mockCtx.db.patch).toHaveBeenCalledWith("badge123", {
        isActive: true,
        earnedAt: expect.any(Number),
        metadata: { totalRides: 5 },
      });
    });
  });
});

