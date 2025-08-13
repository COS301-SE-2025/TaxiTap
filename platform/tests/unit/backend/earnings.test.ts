import { Id } from "@/convex/_generated/dataModel";
import { earningsHandler } from "../../../convex/functions/earnings/earnings";

describe("getWeeklyEarnings query", () => {
  const driverId = "driver_123" as unknown as Id<"taxiTap_users">; // string ID is enough here

  // Mock db query chain
  const mockCollect = jest.fn();
  const mockWithIndex = jest.fn(() => ({ collect: mockCollect }));

  const ctx = {
    db: {
      query: jest.fn(() => ({
        withIndex: mockWithIndex,
      })),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 4 weeks of earnings data", async () => {
    const now = Date.now();

    const sampleTrips = [
      { startTime: now - 2 * 24 * 60 * 60 * 1000, fare: 100, reservation: true },
      { startTime: now - 1 * 24 * 60 * 60 * 1000, fare: 50, reservation: false },
    ];

    const sampleSessions = [
      { startTime: now - 7 * 24 * 60 * 60 * 1000, endTime: now - 6 * 24 * 60 * 60 * 1000 }, // 24h
      { startTime: now - 2 * 24 * 60 * 60 * 1000, endTime: now - 1 * 24 * 60 * 60 * 1000 }, // 24h
    ];

    mockCollect
      .mockResolvedValueOnce(sampleTrips)    // trips week 0
      .mockResolvedValueOnce(sampleSessions) // sessions week 0
      .mockResolvedValueOnce(sampleTrips)    // trips week 1
      .mockResolvedValueOnce(sampleSessions) // sessions week 1
      .mockResolvedValueOnce(sampleTrips)    // trips week 2
      .mockResolvedValueOnce(sampleSessions) // sessions week 2
      .mockResolvedValueOnce(sampleTrips)    // trips week 3
      .mockResolvedValueOnce(sampleSessions); // sessions week 3

    // Pass driverId as string, no need for "as any"
    const result = await earningsHandler(ctx, { driverId });

    expect(result).toHaveLength(4);

    for (const week of result) {
      expect(week.earnings).toBe(150);
      expect(week.hoursOnline).toBe(48);
      expect(week.averagePerHour).toBe(Math.round(150 / 48));
      expect(week.reservations).toBe(1);
      expect(week.dailyData).toHaveLength(7);
      expect(week.todayEarnings).toBeDefined();
    }
  });

  it("handles sessions without endTime", async () => {
    const sampleTrips: any[] = [];
    const sampleSessions = [{ startTime: 0 }];

    mockCollect
      .mockResolvedValueOnce(sampleTrips)
      .mockResolvedValueOnce(sampleSessions)
      .mockResolvedValueOnce(sampleTrips)
      .mockResolvedValueOnce(sampleSessions)
      .mockResolvedValueOnce(sampleTrips)
      .mockResolvedValueOnce(sampleSessions)
      .mockResolvedValueOnce(sampleTrips)
      .mockResolvedValueOnce(sampleSessions);

    const result = await earningsHandler(ctx, { driverId });

    expect(result[0].hoursOnline).toBe(0);
    expect(result[0].averagePerHour).toBe(0);
  });

  it("calculates today earnings only for current week", async () => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = startOfToday.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const tripsWeek0 = [
      { startTime: todayStart + 1000, fare: 20, reservation: false },
      { startTime: todayStart + 5000, fare: 30, reservation: true },
    ];

    const tripsOtherWeeks: any[] = [];
    const sessions: any[] = [];

    mockCollect
      .mockResolvedValueOnce(tripsWeek0)
      .mockResolvedValueOnce(sessions)
      .mockResolvedValueOnce(tripsOtherWeeks)
      .mockResolvedValueOnce(sessions)
      .mockResolvedValueOnce(tripsOtherWeeks)
      .mockResolvedValueOnce(sessions)
      .mockResolvedValueOnce(tripsOtherWeeks)
      .mockResolvedValueOnce(sessions);

    const result = await earningsHandler(ctx, { driverId });

    expect(result[0].todayEarnings).toBe(50);
    expect(result[1].todayEarnings).toBe(0);
    expect(result[2].todayEarnings).toBe(0);
    expect(result[3].todayEarnings).toBe(0);
  });
});