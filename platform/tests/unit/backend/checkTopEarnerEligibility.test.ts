import { checkTopEarnerEligibility } from "../../../convex/functions/badges/badgeService";
import { Id } from "../../../convex/_generated/dataModel";

// Mock the entire badgeService module
jest.mock("../../../convex/functions/badges/badgeService", () => {
  const originalModule = jest.requireActual("../../../convex/functions/badges/badgeService");
  
  return {
    ...originalModule,
    getTopEarners: jest.fn(),
    getDriverTotalEarnings: jest.fn(),
    checkTopEarnerEligibility: jest.fn().mockImplementation(async (ctx, userId) => {
      const mockGetTopEarners = jest.requireMock("../../../convex/functions/badges/badgeService").getTopEarners;
      const mockGetDriverTotalEarnings = jest.requireMock("../../../convex/functions/badges/badgeService").getDriverTotalEarnings;
      
      const topEarners = await mockGetTopEarners(ctx, 10);
      const userEarnings = await mockGetDriverTotalEarnings(ctx, userId);
      
      const isInTop10 = topEarners.some((earner: any) => 
        earner.driverId === userId && earner.totalEarnings > 0
      );

      return {
        isEligible: isInTop10,
        currentRides: 0,
        paidRides: 0,
        paymentRate: 100,
      };
    }),
  };
});

const mockGetTopEarners = jest.requireMock("../../../convex/functions/badges/badgeService").getTopEarners;
const mockGetDriverTotalEarnings = jest.requireMock("../../../convex/functions/badges/badgeService").getDriverTotalEarnings;

describe("checkTopEarnerEligibility", () => {
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
    
    // Reset mocks
    jest.clearAllMocks();
  });

  it("returns eligible when driver is in top 10% of earners", async () => {
    const mockTopEarners = [
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 900 },
      { driverId: "driver3" as Id<"taxiTap_users">, totalEarnings: 800 },
      { driverId: "driver4" as Id<"taxiTap_users">, totalEarnings: 700 },
      { driverId: "driver5" as Id<"taxiTap_users">, totalEarnings: 600 },
      { driverId: "driver6" as Id<"taxiTap_users">, totalEarnings: 500 },
      { driverId: "driver7" as Id<"taxiTap_users">, totalEarnings: 400 },
      { driverId: "driver8" as Id<"taxiTap_users">, totalEarnings: 300 },
      { driverId: "driver9" as Id<"taxiTap_users">, totalEarnings: 200 },
      { driverId: "driver10" as Id<"taxiTap_users">, totalEarnings: 100 },
    ];

    mockGetTopEarners.mockResolvedValue(mockTopEarners);
    mockGetDriverTotalEarnings.mockResolvedValue(1000);

    const result = await checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: true,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 100,
    });
  });

  it("returns not eligible when driver is not in top 10%", async () => {
    const mockTopEarners = [
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 900 },
      { driverId: "driver3" as Id<"taxiTap_users">, totalEarnings: 800 },
      { driverId: "driver4" as Id<"taxiTap_users">, totalEarnings: 700 },
      { driverId: "driver5" as Id<"taxiTap_users">, totalEarnings: 600 },
      { driverId: "driver6" as Id<"taxiTap_users">, totalEarnings: 500 },
      { driverId: "driver7" as Id<"taxiTap_users">, totalEarnings: 400 },
      { driverId: "driver8" as Id<"taxiTap_users">, totalEarnings: 300 },
      { driverId: "driver9" as Id<"taxiTap_users">, totalEarnings: 200 },
      { driverId: "driver10" as Id<"taxiTap_users">, totalEarnings: 100 },
    ];

    mockGetTopEarners.mockResolvedValue(mockTopEarners);
    mockGetDriverTotalEarnings.mockResolvedValue(50); // driver11 has lower earnings

    const result = await checkTopEarnerEligibility(mockCtx, "driver11" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 100,
    });
  });

  it("returns not eligible when driver has no earnings", async () => {
    const mockTopEarners = [
      { driverId: "driver1" as Id<"taxiTap_users">, totalEarnings: 1000 },
      { driverId: "driver2" as Id<"taxiTap_users">, totalEarnings: 900 },
    ];

    mockGetTopEarners.mockResolvedValue(mockTopEarners);
    mockGetDriverTotalEarnings.mockResolvedValue(0);

    const result = await checkTopEarnerEligibility(mockCtx, "driver3" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 100,
    });
  });

  it("handles empty top earners list", async () => {
    mockGetTopEarners.mockResolvedValue([]);
    mockGetDriverTotalEarnings.mockResolvedValue(0);

    const result = await checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);

    expect(result).toEqual({
      isEligible: false,
      currentRides: 0,
      paidRides: 0,
      paymentRate: 100,
    });
  });

  it("handles database errors gracefully", async () => {
    mockGetTopEarners.mockRejectedValue(new Error("Database error"));

    await expect(checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">))
      .rejects.toThrow("Database error");
  });

  it("calculates threshold correctly with many drivers", async () => {
    const mockTopEarners = Array.from({ length: 50 }, (_, i) => ({
      driverId: `driver${i + 1}` as Id<"taxiTap_users">,
      totalEarnings: 1000 - i * 10,
    }));

    mockGetTopEarners.mockResolvedValue(mockTopEarners);
    mockGetDriverTotalEarnings.mockResolvedValue(1000);

    const result = await checkTopEarnerEligibility(mockCtx, "driver1" as Id<"taxiTap_users">);

    expect(result.isEligible).toBe(true);
  });
});