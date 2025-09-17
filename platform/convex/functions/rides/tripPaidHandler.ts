import { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { v } from "convex/values";

export const tripPaidHandler = async (
  ctx: any, 
  rideId: Id<"rides">, 
  userId: Id<"taxiTap_users">, 
  paid: boolean,
  amountPaid: number | null,
  paymentType: "exact" | "overpaid" | "underpaid"
) => {
  const ride = await ctx.db.get(rideId);

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.passengerId !== userId) {
    throw new Error("Only the passenger can confirm payment for this ride");
  }

  await ctx.db.patch(ride._id, {
    tripPaid: paid,
    paymentConfirmedAt: Date.now(),
    amountPaid: amountPaid ?? undefined,   
    paymentType,                           
  });

  return { 
    success: true, 
    message: `Payment ${paymentType} (${paid ? "confirmed" : "unpaid"})`,
    rideId: ride._id
  };
};

export const getRideDocId = query({
  args: { rideIdStr: v.string() },
  handler: async (ctx, { rideIdStr }) => {
    const ride = await ctx.db.query("rides")
      .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideIdStr))
      .first();

    if (!ride) throw new Error("Ride not found");
    return ride._id;
  }
});