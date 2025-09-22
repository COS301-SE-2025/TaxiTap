import { getTopEarners } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

describe("getTopEarners", () => {
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

  it("returns top earners sorted by earnings", async () => {
    const mockDrivers = [
      { _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver2" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver3" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver4" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver5" as Id<"taxiTap_users">, accountType: "driver" },
    ];

    // Mock trips for each driver
    const mockTrips = [
      { fare: 1000 }, // driver1
      { fare: 900 },  // driver2
      { fare: 800 },  // driver3
      { fare: 700 },  // driver4
      { fare: 600 },  // driver5
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockDrivers) // First call for drivers
      .mockResolvedValueOnce(mockTrips)   // driver1 trips
      .mockResolvedValueOnce(mockTrips.slice(1)) // driver2 trips
      .mockResolvedValueOnce(mockTrips.slice(2)) // driver3 trips
      .mockResolvedValueOnce(mockTrips.slice(3)) // driver4 trips
      .mockResolvedValueOnce(mockTrips.slice(4)); // driver5 trips

    const result = await getTopEarners(mockCtx);

    expect(result).toEqual([
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 4000 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 3000 },
      { driverId: "driver3" as Id<"taxiTap_users">, totalEarnings: 2100 },
      { driverId: "driver4" as Id<"taxiTap_users">, totalEarnings: 1300 },
      { driverId: "driver5" as Id<"taxiTap_users">, totalEarnings: 600 },
    ]);
  });

  it("returns empty array when no drivers", async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await getTopEarners(mockCtx);

    expect(result).toEqual([]);
  });

  it("handles drivers with zero earnings", async () => {
    const mockDrivers = [
      { _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver2" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver3" as Id<"taxiTap_users">, accountType: "driver" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockDrivers) // First call for drivers
      .mockResolvedValueOnce([{ fare: 1000 }]) // driver1 trips
      .mockResolvedValueOnce([]) // driver2 trips (no trips = 0 earnings)
      .mockResolvedValueOnce([{ fare: 500 }]); // driver3 trips

    const result = await getTopEarners(mockCtx);

    expect(result).toEqual([
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver3" as Id<"taxiTap_users">, totalEarnings: 500 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 0 },
    ]);
  });

  it("handles drivers with null earnings", async () => {
    const mockDrivers = [
      { _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver2" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver3" as Id<"taxiTap_users">, accountType: "driver" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockDrivers) // First call for drivers
      .mockResolvedValueOnce([{ fare: 1000 }]) // driver1 trips
      .mockResolvedValueOnce([{ fare: null }]) // driver2 trips (null fare = 0 earnings)
      .mockResolvedValueOnce([{ fare: 500 }]); // driver3 trips

    const result = await getTopEarners(mockCtx);

    expect(result).toEqual([
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver3" as Id<"taxiTap_users">, totalEarnings: 500 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 0 },
    ]);
  });

  it("handles database errors gracefully", async () => {
    mockCtx.db.collect.mockRejectedValue(new Error("Database error"));

    await expect(getTopEarners(mockCtx))
      .rejects.toThrow("Database error");
  });

  it("sorts correctly with many drivers", async () => {
    const mockDrivers = Array.from({ length: 5 }, (_, i) => ({
      _id: `driver${i + 1}` as Id<"taxiTap_users">,
      accountType: "driver",
    }));

    mockCtx.db.collect
      .mockResolvedValueOnce(mockDrivers) // First call for drivers
      .mockResolvedValueOnce([{ fare: 1000 }]) // driver1
      .mockResolvedValueOnce([{ fare: 500 }])  // driver2
      .mockResolvedValueOnce([{ fare: 800 }])  // driver3
      .mockResolvedValueOnce([{ fare: 300 }])  // driver4
      .mockResolvedValueOnce([{ fare: 600 }]); // driver5

    const result = await getTopEarners(mockCtx);

    // Check that results are sorted in descending order
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].totalEarnings).toBeGreaterThanOrEqual(result[i + 1].totalEarnings);
    }
  });

  it("handles duplicate earnings correctly", async () => {
    const mockDrivers = [
      { _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver2" as Id<"taxiTap_users">, accountType: "driver" },
      { _id: "driver3" as Id<"taxiTap_users">, accountType: "driver" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockDrivers) // First call for drivers
      .mockResolvedValueOnce([{ fare: 1000 }]) // driver1
      .mockResolvedValueOnce([{ fare: 1000 }]) // driver2
      .mockResolvedValueOnce([{ fare: 500 }]); // driver3

    const result = await getTopEarners(mockCtx);

    expect(result).toEqual([
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver3" as Id<"taxiTap_users">, totalEarnings: 500 },
    ]);
  });

  it("queries drivers table correctly", async () => {
    const mockDrivers = [
      { _id: "driver1" as Id<"taxiTap_users">, accountType: "driver" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(mockDrivers) // First call for drivers
      .mockResolvedValueOnce([{ fare: 1000 }]); // driver1 trips

    await getTopEarners(mockCtx);

    expect(mockCtx.db.query).toHaveBeenCalledWith("taxiTap_users");
    expect(mockCtx.db.filter).toHaveBeenCalledWith(expect.any(Function));
  });
});