import { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { v } from "convex/values";

const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfWeek(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function startOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

export const earningsHandler = async (ctx: any, args: { driverId: Id<"taxiTap_users"> }) => {
    const { driverId } = args;
    const now = Date.now();
    const weeks: any[] = [];

    const currentWeekStart = startOfWeek(new Date(now)).getTime();
    const todayStart = startOfToday();
    const todayEnd = todayStart + MILLIS_PER_DAY;

    for (let i = 0; i < 4; i++) {
      const from = currentWeekStart - i * 7 * MILLIS_PER_DAY;
      const to = from + 7 * MILLIS_PER_DAY;

      const trips = await ctx.db
        .query("trips")
        .withIndex("by_driver_and_startTime", (q: any) =>
          q.eq("driverId", driverId).gt("startTime", from).lt("startTime", to)
        )
        .collect();

      const sessions = await ctx.db
        .query("work_sessions")
        .withIndex("by_driver_and_start", (q: any) =>
          q.eq("driverId", driverId).gt("startTime", from).lt("startTime", to)
        )
        .collect();

      const hoursOnline = sessions.reduce((sum: any, session: any) => {
        if (session.endTime !== undefined) {
          const duration = (session.endTime - session.startTime) / (1000 * 60 * 60); // hours
          return sum + duration;
        }
        return sum;
      }, 0);

      const earnings = trips.reduce((sum: any, trip: any) => sum + trip.fare, 0);
      const reservations = trips.filter((t: any) => t.reservation).length;

      const dailyData = Array.from({ length: 7 }, (_, dayOffset) => {
        const dayStart = from + dayOffset * MILLIS_PER_DAY;
        const dayEnd = dayStart + MILLIS_PER_DAY;

        const dayEarnings = trips
          .filter((t: any) => t.startTime >= dayStart && t.startTime < dayEnd)
          .reduce((sum: any, t: any) => sum + t.fare, 0);

        return {
          day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayOffset],
          earnings: Math.round(dayEarnings),
        };
      });

      const todayEarnings = i === 0
        ? trips
            .filter((t: any) => t.startTime >= todayStart && t.startTime < todayEnd)
            .reduce((sum: any, t: any) => sum + t.fare, 0)
        : 0;

      weeks.push({
        dateRangeStart: from,
        earnings,
        hoursOnline: Math.round(hoursOnline),
        averagePerHour: hoursOnline > 0 ? Math.round(earnings / hoursOnline) : 0,
        reservations,
        dailyData,
        todayEarnings: Math.round(todayEarnings),
      });
    }

    return weeks;
};

export const getWeeklyEarnings = query({
  args: { driverId: v.string() },
  handler: earningsHandler,
});