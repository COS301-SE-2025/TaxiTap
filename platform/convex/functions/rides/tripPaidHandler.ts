import { Id } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { v } from "convex/values";
import { checkAndAwardTrustedPayerBadge } from "../badges/badgeService";

export const tripPaidHandler = async (
  ctx: any,
  rideId: string,
  userId: Id<"taxiTap_users">,
  paid: boolean,
  amountPaid: number | null,
  paymentType: "exact" | "overpaid" | "underpaid"
) => {
  // Find ride by custom rideId field since navigation params are strings
  const ride = await ctx.db
    .query("rides")
    .filter((q: any) => q.eq(q.field("rideId"), rideId))
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

  // Update the corresponding trip record for driver statistics
  if (ride.tripId) {
    try {
      const trip = await ctx.db.get(ride.tripId);
      if (trip) {
        // Update the trip fare based on payment status and amount
        let tripFare = trip.fare;

        if (paid && amountPaid !== null) {
          // If payment confirmed with specific amount, use that amount
          tripFare = amountPaid;
        } else if (paid && ride.finalFare !== undefined) {
          // If payment confirmed but no amount specified, use finalFare
          tripFare = ride.finalFare;
        } else if (paid && ride.estimatedFare !== undefined) {
          // If payment confirmed but no finalFare, use estimatedFare
          tripFare = ride.estimatedFare;
        } else if (!paid) {
          // If payment not confirmed, set fare to 0 for driver statistics
          tripFare = 0;
        }

        await ctx.db.patch(ride.tripId, {
          fare: tripFare,
        });

        console.log(`Updated trip ${ride.tripId} fare to ${tripFare} based on payment status: ${paid}`);
      }
    } catch (error) {
      console.error('Error updating trip record:', error);
      // Don't fail the payment confirmation if trip update fails
    }
  }

  // Check and award Trusted Payer badge if payment was confirmed
  if (paid) {
    try {
      const badgeAwarded = await checkAndAwardTrustedPayerBadge(ctx, userId);
      if (badgeAwarded) {
        console.log('Trusted Payer badge awarded to user:', userId);
      }
    } catch (error) {
      console.error('Error awarding badge:', error);
      // Don't fail the payment confirmation if badge awarding fails
    }
  }

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