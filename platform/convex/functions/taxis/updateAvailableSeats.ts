export async function updateTaxiSeatAvailabilityHandler(ctx: any, args: { rideId: string; action: "decrease" | "increase" }) {
  console.log(`Updating taxi seats: ${args.action} for ride ${args.rideId}`);
    
  try {
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
      .first();

    if (!ride) throw new Error("Ride not found");
    if (!ride.driverId) throw new Error("Ride has no assigned driver");

    const driverProfile = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q: any) => q.eq("userId", ride.driverId))
      .first();

    if (!driverProfile) throw new Error("Driver profile not found.");

    const taxi = await ctx.db
      .query("taxis")
      .withIndex("by_driver_id", (q: any) => q.eq("driverId", driverProfile._id))
      .first();

    if (!taxi) throw new Error("Taxi for driver not found.");

    const currentSeats = taxi.capacity ?? 0;
    const updatedSeats =
      args.action === "decrease" ? Math.max(0, currentSeats - 1) : currentSeats + 1;

    await ctx.db.patch(taxi._id, {
      capacity: updatedSeats,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      updatedSeats,
      previousSeats: currentSeats,
    };
  } catch (error) {
    console.error("Error updating taxi seat availability:", error);
    throw error;
  }
}

import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const updateTaxiSeatAvailability = mutation({
  args: {
    rideId: v.string(),
    action: v.union(
      v.literal("decrease"),
      v.literal("increase")
    ),
  },
  handler: updateTaxiSeatAvailabilityHandler,
});