import { getUserBadges } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("getUserBadges", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        collect: jest.fn().mockResolvedValue([]),
        get: jest.fn(),
      },
    };
  });

  it("returns empty array when user has no badges", async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await getUserBadges(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toEqual([]);
    expect(mockCtx.db.query).toHaveBeenCalledWith("badges");
    expect(mockCtx.db.withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
    expect(mockCtx.db.filter).toHaveBeenCalledWith(expect.any(Function));
  });

  it("returns formatted badges when user has badges", async () => {
    const mockBadges = [
      {
        badgeType: "trusted_payer",
        earnedAt: 1640995200000,
        isActive: true,
        metadata: { ridesCount: 5 },
      },
      {
        badgeType: "frequent_rider",
        earnedAt: 1640995200000,
        isActive: true,
        metadata: { ridesCount: 15 },
      },
    ];

    mockCtx.db.collect.mockResolvedValue(mockBadges);

    const result = await getUserBadges(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      badgeType: "trusted_payer",
      name: "Trusted Payer",
      description: "Paid for 100% of rides",
      icon: "shield-check",
      color: "#10B981",
      earnedAt: 1640995200000,
      isActive: true,
      metadata: { ridesCount: 5 },
    });
    expect(result[1]).toEqual({
      badgeType: "frequent_rider",
      name: "Frequent Rider",
      description: "Completed 10+ rides",
      icon: "star",
      color: "#3B82F6",
      earnedAt: 1640995200000,
      isActive: true,
      metadata: { ridesCount: 15 },
    });
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(getUserBadges(mockCtx, "user123" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("returns only active badges (filtered by database query)", async () => {
    // The getUserBadges function filters for active badges at the database level
    // So we only get active badges in the result
    const mockBadges = [
      {
        badgeType: "trusted_payer",
        earnedAt: 1640995200000,
        isActive: true,
        metadata: {},
      },
    ];

    mockCtx.db.collect.mockResolvedValue(mockBadges);

    const result = await getUserBadges(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toHaveLength(1);
    expect(result[0].badgeType).toBe("trusted_payer");
    expect(result[0].isActive).toBe(true);
  });
});
