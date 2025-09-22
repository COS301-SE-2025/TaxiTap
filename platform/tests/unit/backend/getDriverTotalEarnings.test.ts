import { getDriverTotalEarnings } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("getDriverTotalEarnings", () => {
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

  it("calculates total earnings correctly", async () => {
    const mockTrips = [
      { fare: 50 },
      { fare: 75 },
      { fare: 100 },
      { fare: 25 },
    ];

    mockCtx.db.collect.mockResolvedValue(mockTrips);

    const result = await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(250); // 50 + 75 + 100 + 25
  });

  it("returns 0 when driver has no trips", async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(0);
  });

  it("calculates earnings from trip fares", async () => {
    const mockTrips = [
      { fare: 50 },
      { fare: 75 },
    ];

    mockCtx.db.collect.mockResolvedValue(mockTrips);

    const result = await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(125); // 50 + 75
  });

  it("handles trips with zero fare", async () => {
    const mockTrips = [
      { fare: 100 },
      { fare: 0 },
      { fare: 200 },
    ];

    mockCtx.db.collect.mockResolvedValue(mockTrips);

    const result = await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(300); // 100 + 0 + 200
  });

  it("handles trips with null fare", async () => {
    const mockTrips = [
      { fare: null },
      { fare: 50 },
      { fare: null },
    ];

    mockCtx.db.collect.mockResolvedValue(mockTrips);

    const result = await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(50); // Only the trip with fare
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("calculates earnings for many trips", async () => {
    const mockTrips = Array.from({ length: 100 }, (_, i) => ({
      fare: i + 1,
    }));

    mockCtx.db.collect.mockResolvedValue(mockTrips);

    const result = await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result).toBe(5050); // Sum of 1 to 100
  });

  it("queries trips table correctly", async () => {
    const mockTrips = [
      { fare: 50 },
    ];

    mockCtx.db.collect.mockResolvedValue(mockTrips);

    await getDriverTotalEarnings(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(mockCtx.db.query).toHaveBeenCalledWith("trips");
    expect(mockCtx.db.withIndex).toHaveBeenCalledWith("by_driver_and_startTime", expect.any(Function));
  });
});
