import { checkAndAwardTopEarnerBadge } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("checkAndAwardTopEarnerBadge", () => {
  let mockCtx: any;

  beforeEach(() => {
    // Mock drivers for getTopEarners
    const mockDrivers = [
      { _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver2" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver3" as Id<"taxiTap_users">, accountType: "driver" },
    ];

    // Mock trips for getDriverTotalEarnings
    const mockTrips = [
      { fare: 500, status: "completed" },
      { fare: 300, status: "completed" },
      { fare: 200, status: "completed" },
    ];

    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        collect: jest.fn()
          .mockResolvedValueOnce(mockDrivers) // For getTopEarners - get drivers
          .mockResolvedValueOnce(mockTrips) // For getDriverTotalEarnings - get trips for driver1
          .mockResolvedValueOnce(mockTrips) // For getDriverTotalEarnings - get trips for driver2
          .mockResolvedValueOnce(mockTrips) // For getDriverTotalEarnings - get trips for driver3
          .mockResolvedValueOnce(mockTrips) // For getDriverTotalEarnings - get trips for driver1 (in checkTopEarnerEligibility)
          .mockResolvedValueOnce(mockTrips), // For getDriverTotalEarnings - get trips for driver1 (in checkAndAwardTopEarnerBadge)
        first: jest.fn().mockResolvedValue(null), // For awardBadge - check existing badge
        insert: jest.fn().mockResolvedValue("badge_id_123"),
        patch: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
      },
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it("awards badge when driver is eligible and doesn't have it", async () => {
    const result = await checkAndAwardTopEarnerBadge(mockCtx, "driver1" as Id<"taxiTap_users">);

    expect(result).toBe(true);

    // Should insert a new badge
    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "driver1",
      badgeType: "top_earner",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalEarnings: 1000, // 500 + 300 + 200
      },
    });
  });

  it("does not award badge when driver is not eligible", async () => {
    // Mock empty drivers so driver10 is not in top earners
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await checkAndAwardTopEarnerBadge(mockCtx, "driver10" as Id<"taxiTap_users">);

    expect(result).toBe(false);

    expect(mockCtx.db.insert).not.toHaveBeenCalled();
  });

  it("does not award badge when driver already has it", async () => {
    // Mock existing badge
    const existingBadge = {
      _id: "existing_badge_id",
      badgeType: "top_earner",
      isActive: true,
    };
    mockCtx.db.first.mockResolvedValue(existingBadge);

    const result = await checkAndAwardTopEarnerBadge(mockCtx, "driver1" as Id<"taxiTap_users">);

    expect(result).toBe(true); // Function returns true because it updates existing badge

    expect(mockCtx.db.insert).not.toHaveBeenCalled();
    expect(mockCtx.db.patch).toHaveBeenCalledWith("existing_badge_id", {
      isActive: true,
      earnedAt: expect.any(Number),
      metadata: {
        totalEarnings: 1000,
      },
    });
  });

  it("handles database errors gracefully", async () => {
    // Reset the mock to reject on the first call
    mockCtx.db.collect.mockReset();
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(checkAndAwardTopEarnerBadge(mockCtx, "driver1" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("handles insert errors gracefully", async () => {
    mockCtx.db.insert.mockRejectedValue(new Error("Insert failed"));

    await expect(checkAndAwardTopEarnerBadge(mockCtx, "driver1" as Id<"taxiTap_users">))
      .rejects.toThrow("Insert failed");
  });

  it("includes correct metadata when awarding badge", async () => {
    // Mock higher earnings
    const mockTrips = [
      { fare: 800, status: "completed" },
      { fare: 700, status: "completed" },
    ];
    
    // Reset and set up mocks for this specific test
    mockCtx.db.collect.mockReset();
    mockCtx.db.collect
      .mockResolvedValueOnce([{ _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" }]) // For getTopEarners - get drivers
      .mockResolvedValueOnce(mockTrips) // For getDriverTotalEarnings - get trips for driver1
      .mockResolvedValueOnce(mockTrips) // For getDriverTotalEarnings - get trips for driver1 (in checkTopEarnerEligibility)
      .mockResolvedValueOnce(mockTrips); // For getDriverTotalEarnings - get trips for driver1 (in checkAndAwardTopEarnerBadge)

    await checkAndAwardTopEarnerBadge(mockCtx, "driver1" as Id<"taxiTap_users">);

    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "driver1",
      badgeType: "top_earner",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalEarnings: 1500, // 800 + 700
      },
    });
  });
});