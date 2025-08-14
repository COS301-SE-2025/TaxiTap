import { earningsHandler } from "../../convex/functions/earnings/earnings";
import { Id } from "@/convex/_generated/dataModel";

type Trip = {
  driverId: Id<"taxiTap_users">;
  startTime: number;
  fare: number;
  reservation: boolean;
};

type Session = {
  driverId: Id<"taxiTap_users">;
  startTime: number;
  endTime?: number;
};

describe("Integration tests for getWeeklyEarnings", () => {
  // In-memory mock DB tables
  let tripsTable: Trip[] = [];
  let sessionsTable: Session[] = [];

  // Mock context with query function to simulate DB access
  const ctx = {
    db: {
      query: jest.fn((tableName: string) => ({
        withIndex: jest.fn((indexName: string, queryFn: Function) => ({
          collect: jest.fn(async () => {
            const conditions: any = {};
            const mockQ = {
              eq: (field: string, val: any) => {
                conditions.eq = { field, val };
                return mockQ;
              },
              gt: (field: string, val: any) => {
                conditions.gt = { field, val };
                return mockQ;
              },
              lt: (field: string, val: any) => {
                conditions.lt = { field, val };
                return mockQ;
              },
            };
            queryFn(mockQ);

            if (tableName === "trips") {
              return tripsTable.filter((trip) => {
                if (
                  conditions.eq &&
                  conditions.eq.field === "driverId" &&
                  trip.driverId !== conditions.eq.val
                )
                  return false;
                if (
                  conditions.gt &&
                  conditions.gt.field === "startTime" &&
                  !(trip.startTime > conditions.gt.val)
                )
                  return false;
                if (
                  conditions.lt &&
                  conditions.lt.field === "startTime" &&
                  !(trip.startTime < conditions.lt.val)
                )
                  return false;
                return true;
              });
            } else if (tableName === "work_sessions") {
              return sessionsTable.filter((session) => {
                if (
                  conditions.eq &&
                  conditions.eq.field === "driverId" &&
                  session.driverId !== conditions.eq.val
                )
                  return false;
                if (
                  conditions.gt &&
                  conditions.gt.field === "startTime" &&
                  !(session.startTime > conditions.gt.val)
                )
                  return false;
                if (
                  conditions.lt &&
                  conditions.lt.field === "startTime" &&
                  !(session.startTime < conditions.lt.val)
                )
                  return false;
                return true;
              });
            }

            return [];
          }),
        })),
      })),
    },
  };

  const driverId = "driver_123" as unknown as Id<"taxiTap_users">;

  beforeEach(() => {
    // Reset tables before each test
    tripsTable = [];
    sessionsTable = [];
    jest.clearAllMocks();
  });

  it("calculates earnings and hours for 4 weeks correctly", async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Setup trips - 2 trips per week, fares 100 and 50, one reservation
    for (let i = 0; i < 4; i++) {
        const weekStart = now - i * 7 * oneDay;
        tripsTable.push(
            {
            driverId,
            startTime: weekStart + oneDay, // day 1 of week
            fare: 100,
            reservation: true,
            },
            {
            driverId,
            startTime: weekStart + 2 * oneDay, // day 2 of week
            fare: 50,
            reservation: false,
            }
        );

        // Sessions - 2 sessions per week, 24h each
        sessionsTable.push(
            {
            driverId,
            startTime: weekStart + oneDay,
            endTime: weekStart + 2 * oneDay,
            },
            {
            driverId,
            startTime: weekStart + 3 * oneDay,
            endTime: weekStart + 4 * oneDay,
            }
        );
    }

    const results = await earningsHandler(ctx, { driverId });

    expect(results).toHaveLength(4);

    for (const week of results) {
      expect(week.earnings).toBe(150);
      expect(week.hoursOnline).toBe(48);
      expect(week.averagePerHour).toBe(Math.round(150 / 48));
      expect(week.reservations).toBe(1);
      expect(week.dailyData).toHaveLength(7);
      expect(typeof week.todayEarnings).toBe("number");
    }
  });

  it("returns 0 hoursOnline if session endTime missing", async () => {
    sessionsTable.push({
      driverId,
      startTime: Date.now() - 10000,
      // endTime missing
    });

    const results = await earningsHandler(ctx, { driverId });

    expect(results[0].hoursOnline).toBe(0);
    expect(results[0].averagePerHour).toBe(0);
  });

  it("calculates today earnings correctly for current week", async () => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    // Only add trips for current week
    tripsTable.push(
      { driverId, startTime: todayStartTime + 1000, fare: 20, reservation: false },
      { driverId, startTime: todayStartTime + 5000, fare: 30, reservation: true }
    );

    const results = await earningsHandler(ctx, { driverId });

    expect(results[0].todayEarnings).toBe(50);
    expect(results[1].todayEarnings).toBe(0);
    expect(results[2].todayEarnings).toBe(0);
    expect(results[3].todayEarnings).toBe(0);
  });
});