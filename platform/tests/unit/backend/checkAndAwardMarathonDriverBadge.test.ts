import { checkAndAwardMarathonDriverBadge } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("checkAndAwardMarathonDriverBadge", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        collect: jest.fn().mockResolvedValue([]),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue("badge_id_123"),
        patch: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
      },
    };
  });

  it("awards badge when driver is eligible and doesn't have it", async () => {
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockRides) // First call for rides
      .mockResolvedValueOnce([]); // Second call for existing badges

    const result = await checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(true);

    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "driver123",
      badgeType: "marathon_driver",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalRides: 3,
      },
    });
  });

  it("does not award badge when driver is not eligible", async () => {
    // Mock returns empty array because filter excludes non-completed rides
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(false);

    expect(mockCtx.db.insert).not.toHaveBeenCalled();
  });

  it("does not award badge when driver already has it", async () => {
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
    ];

    const existingBadge = {
      badgeType: "marathon_driver",
      isActive: true,
    };

    mockCtx.db.collect.mockResolvedValue(mockRides); // Mock rides for eligibility check
    mockCtx.db.first.mockResolvedValue(existingBadge); // Mock existing badge check

    const result = await checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(true); // Function returns true because it updates existing badge

    expect(mockCtx.db.insert).not.toHaveBeenCalled();
    expect(mockCtx.db.patch).toHaveBeenCalled(); // Should patch existing badge instead
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("handles insert errors gracefully", async () => {
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockRides)
      .mockResolvedValueOnce([]);
    mockCtx.db.insert.mockRejectedValue(new Error("Insert failed"));

    await expect(checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">))
      .rejects.toThrow("Insert failed");
  });

  it("includes correct metadata when awarding badge", async () => {
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockRides)
      .mockResolvedValueOnce([]);

    await checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "driver123",
      badgeType: "marathon_driver",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalRides: 5,
      },
    });
  });

  it("awards badge with single completed ride", async () => {
    const mockRides = [
      { status: "completed" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockRides)
      .mockResolvedValueOnce([]);

    const result = await checkAndAwardMarathonDriverBadge(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(true);

    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "driver123",
      badgeType: "marathon_driver",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalRides: 1,
      },
    });
  });
});
