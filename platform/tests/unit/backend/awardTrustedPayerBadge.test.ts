import { checkAndAwardTrustedPayerBadge } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("checkAndAwardTrustedPayerBadge", () => {
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

  it("awards badge when user is eligible and doesn't have it", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkAndAwardTrustedPayerBadge(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toBe(true);

    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "user123",
      badgeType: "trusted_payer",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalRides: 3,
        paymentRate: 100,
      },
    });
  });

  it("does not award badge when user is not eligible", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: false },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkAndAwardTrustedPayerBadge(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toBe(false);

    expect(mockCtx.db.insert).not.toHaveBeenCalled();
  });

  it("does not award badge when user already has it", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
    ];

    const existingBadge = {
      badgeType: "trusted_payer",
      isActive: true,
    };

    mockCtx.db.collect.mockResolvedValue(mockRides); // Mock rides for eligibility check
    mockCtx.db.first.mockResolvedValue(existingBadge); // Mock existing badge check

    const result = await checkAndAwardTrustedPayerBadge(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toBe(true); // Function returns true because it updates existing badge

    expect(mockCtx.db.insert).not.toHaveBeenCalled();
    expect(mockCtx.db.patch).toHaveBeenCalled(); // Should patch existing badge instead
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(checkAndAwardTrustedPayerBadge(mockCtx, "user123" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("handles insert errors gracefully", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);
    mockCtx.db.insert.mockRejectedValue(new Error("Insert failed"));

    await expect(checkAndAwardTrustedPayerBadge(mockCtx, "user123" as Id<"taxiTap_users">))
      .rejects.toThrow("Insert failed");
  });

  it("includes correct metadata when awarding badge", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    await checkAndAwardTrustedPayerBadge(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(mockCtx.db.insert).toHaveBeenCalledWith("badges", {
      userId: "user123",
      badgeType: "trusted_payer",
      earnedAt: expect.any(Number),
      isActive: true,
      metadata: {
        totalRides: 5,
        paymentRate: 100,
      },
    });
  });
});
