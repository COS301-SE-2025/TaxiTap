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

export const getWeeklyEarnings = query({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, { driverId }) => {
    const now = Date.now();
    const weeks: any[] = [];

    const currentWeekStart = startOfWeek(new Date(now)).getTime();

    for (let i = 0; i < 4; i++) {
      const from = currentWeekStart - i * 7 * MILLIS_PER_DAY;
      const to = from + 7 * MILLIS_PER_DAY;

      const trips = await ctx.db
        .query("trips")
        .withIndex("by_driver_and_startTime", (q) =>
          q.eq("driverId", driverId)
        )
        .collect();

      const earnings = trips.reduce((sum, trip) => sum + trip.fare, 0);
      const reservations = trips.filter((t) => t.reservation).length;
      const hours = trips.reduce(
        (sum, t) => sum + (t.endTime - t.startTime) / (1000 * 60 * 60),
        0
      );

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

      weeks.push({
        dateRangeStart: from,
        earnings,
        hoursOnline: Math.round(hours),
        reservations,
        dailyData,
      });
    }

    return weeks;
  },
});