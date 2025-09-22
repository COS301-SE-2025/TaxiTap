import { getUserBadges } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("getDriverBadges (using getUserBadges)", () => {
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

  it("returns driver badges including marathon driver badge", async () => {
    const mockBadges = [
      {
        badgeType: "marathon_driver",
        earnedAt: 1640995200000,
        isActive: true,
        metadata: { ridesCompleted: 1 },
      },
      {
        badgeType: "top_earner",
        earnedAt: 1640995200000,
        isActive: true,
        metadata: { earnings: 1000 },
      },
    ];

    mockCtx.db.collect.mockResolvedValue(mockBadges);

    const result = await getUserBadges(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      badgeType: "marathon_driver",
      name: "Marathon Driver",
      description: "Completed at least one ride",
      icon: "trophy",
      color: "#FF6B35",
      earnedAt: 1640995200000,
      isActive: true,
      metadata: { ridesCompleted: 1 },
    });
    expect(result[1]).toEqual({
      badgeType: "top_earner",
      name: "Top Earner",
      description: "Top 10 driver by earnings",
      icon: "diamond",
      color: "#FFD700",
      earnedAt: 1640995200000,
      isActive: true,
      metadata: { earnings: 1000 },
    });
  });

  it("returns empty array when driver has no badges", async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await getUserBadges(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toEqual([]);
  });

  it("handles driver-specific badge metadata", async () => {
    const mockBadges = [
      {
        badgeType: "marathon_driver",
        earnedAt: 1640995200000,
        isActive: true,
        metadata: { 
          ridesCompleted: 5,
          totalEarnings: 500,
          averageRating: 4.8
        },
      },
    ];

    mockCtx.db.collect.mockResolvedValue(mockBadges);

    const result = await getUserBadges(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result[0].metadata).toEqual({
      ridesCompleted: 5,
      totalEarnings: 500,
      averageRating: 4.8
    });
  });
});
