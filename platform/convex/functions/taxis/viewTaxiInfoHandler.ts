import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

// Handler logic exported for unit testing
export async function viewTaxiInfoHandler(ctx: QueryCtx, args: { passengerId: Id<"taxiTap_users"> }) {
  // 1. Find the most recent or active ride for this passenger
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "requested"),
        q.eq(q.field("status"), "accepted"),
        q.eq(q.field("status"), "in_progress")
      )
    )
    .order("desc")
    .first();

  if (!ride) {
    throw new Error("No active reservation found for this passenger.");
  }

  if (!ride.driverId) {
    throw new Error("No driver assigned to this ride yet.");
  }

  // 2. Find the driver profile (to get the driver table _id)
  const driverProfile = await ctx.db
    .query("drivers")
    .withIndex("by_user_id", (q) => q.eq("userId", ride.driverId!))
    .first();

  if (!driverProfile) {
    throw new Error("No driver profile found for this ride.");
  }

  // 3. Find the taxi for this driver
  const taxi = await ctx.db
    .query("taxis")
    .withIndex("by_driver_id", (q) => q.eq("driverId", driverProfile._id))
    .first();

  if (!taxi) {
    throw new Error("No taxi found for this driver.");
  }

  // 4. Optionally, get driver user info
  const driverUser = await ctx.db.get(ride.driverId);

  return {
    taxi,
    driver: {
      name: driverUser?.name,
      phoneNumber: driverUser?.phoneNumber,
      rating: driverProfile.averageRating,
      userId: driverUser?._id,
    },
    rideId: ride.rideId,
    rideDocId: ride._id,
    status: ride.status,
  };
} 