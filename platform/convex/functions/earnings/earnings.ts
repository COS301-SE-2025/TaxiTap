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

export const getWeeklyEarnings = query({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, { driverId }) => {
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
        .withIndex("by_driver_and_startTime", (q) =>
          q.eq("driverId", driverId).gt("startTime", from).lt("startTime", to)
        )
        .collect();

      const sessions = await ctx.db
        .query("work_sessions")
        .withIndex("by_driver_and_start", (q) =>
          q.eq("driverId", driverId).gt("startTime", from).lt("startTime", to)
        )
        .collect();

      const hoursOnline = sessions.reduce((sum, session) => {
        if (session.endTime !== undefined) {
          const duration = (session.endTime - session.startTime) / (1000 * 60 * 60); // hours
          return sum + duration;
        }
        return sum;
      }, 0);

      const earnings = trips.reduce((sum, trip) => sum + trip.fare, 0);
      const reservations = trips.filter((t) => t.reservation).length;

      const dailyData = Array.from({ length: 7 }, (_, dayOffset) => {
        const dayStart = from + dayOffset * MILLIS_PER_DAY;
        const dayEnd = dayStart + MILLIS_PER_DAY;

        const dayEarnings = trips
          .filter((t) => t.startTime >= dayStart && t.startTime < dayEnd)
          .reduce((sum, t) => sum + t.fare, 0);

        return {
          day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayOffset],
          earnings: Math.round(dayEarnings),
        };
      });

      const todayEarnings = i === 0
        ? trips
            .filter((t) => t.startTime >= todayStart && t.startTime < todayEnd)
            .reduce((sum, t) => sum + t.fare, 0)
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
  },
});