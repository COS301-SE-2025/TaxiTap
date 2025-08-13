import { Id } from "../../_generated/dataModel";

export async function getFareForLatestTripHandler(
  ctx: any,
  args: { userId: Id<"taxiTap_users"> }
): Promise<number | null> {
  const { userId } = args;

  // Check if user is a passenger
  const passengerTrip = await ctx.db
    .query("trips")
    .withIndex("by_passenger_and_startTime", (q: any) =>
      q.eq("passengerId", userId)
    )
    .order("desc")
    .first();

  if (passengerTrip) return passengerTrip.fare;

  // If not a passenger, check as driver
  const driverTrip = await ctx.db
    .query("trips")
    .withIndex("by_driver_and_startTime", (q: any) =>
      q.eq("driverId", userId)
    )
    .order("desc")
    .first();

  if (driverTrip) return driverTrip.fare;

  // No trip found
  return null;
}