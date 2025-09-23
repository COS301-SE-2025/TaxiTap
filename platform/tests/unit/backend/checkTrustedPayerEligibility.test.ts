import { checkTrustedPayerEligibility } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("checkTrustedPayerEligibility", () => {
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

  it("returns eligible when user has 100% payment rate", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: true },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkTrustedPayerEligibility(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: true,
      currentRides: 3,
      paidRides: 3,
      paymentRate: 100,
    });
  });

  it("returns not eligible when user has less than 100% payment rate", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: false },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkTrustedPayerEligibility(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 3,
      paidRides: 2,
      paymentRate: 66.66666666666666,
    });
  });

  it("returns not eligible when user has no rides", async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await checkTrustedPayerEligibility(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 0,
    });
  });

  it("handles rides with null tripPaid values", async () => {
    const mockRides = [
      { tripPaid: true },
      { tripPaid: null },
      { tripPaid: true },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkTrustedPayerEligibility(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 3,
      paidRides: 2,
      paymentRate: 66.66666666666666,
    });
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(checkTrustedPayerEligibility(mockCtx, "user123" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("calculates payment rate correctly with many rides", async () => {
    const mockRides = Array(100).fill({ tripPaid: true });

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkTrustedPayerEligibility(mockCtx, "user123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: true,
      currentRides: 100,
      paidRides: 100,
      paymentRate: 100,
    });
  });
});
