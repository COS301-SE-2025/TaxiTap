import { Id } from "../../_generated/dataModel";

export const tripPaidHandler = async (
  ctx: any, 
  rideId: string, 
  userId: Id<"taxiTap_users">, 
  paid: boolean,
  amountPaid: number | null,
  paymentType: "exact" | "overpaid" | "underpaid"
) => {
  let ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
    .first();

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