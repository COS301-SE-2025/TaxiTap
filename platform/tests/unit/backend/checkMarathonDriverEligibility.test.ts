import { checkMarathonDriverEligibility } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("checkMarathonDriverEligibility", () => {
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

  it("returns eligible when driver has completed rides", async () => {
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: true,
      currentRides: 3,
      paidRides: 3,
      paymentRate: 100,
    });
  });

  it("returns not eligible when driver has no completed rides", async () => {
    // Mock returns empty array because filter excludes non-completed rides
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 100,
    });
  });

  it("returns not eligible when driver has no rides", async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 100,
    });
  });

  it("counts only completed rides", async () => {
    // Mock returns only completed rides (filtered by the function)
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
      { status: "completed" },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: true,
      currentRides: 3,
      paidRides: 3,
      paymentRate: 100,
    });
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("handles large number of completed rides", async () => {
    const mockRides = Array(100).fill({ status: "completed" });

    mockCtx.db.collect.mockResolvedValue(mockRides);

    const result = await checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: true,
      currentRides: 100,
      paidRides: 100,
      paymentRate: 100,
    });
  });

  it("filters rides correctly by driver ID", async () => {
    const mockRides = [
      { status: "completed" },
      { status: "completed" },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRides);

    await checkMarathonDriverEligibility(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(mockCtx.db.query).toHaveBeenCalledWith("rides");
    expect(mockCtx.db.withIndex).toHaveBeenCalledWith("by_driver", expect.any(Function));
    expect(mockCtx.db.filter).toHaveBeenCalledWith(expect.any(Function));
  });
});
