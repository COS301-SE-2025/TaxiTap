import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";

export const getPassengerChange = query({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, { rideId }) => {
    const ride = await ctx.db.get(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }

    const passenger = await ctx.db.get(ride.passengerId);
    if (!passenger) {
      throw new Error("Passenger not found");
    }

    const amountPaid = ride.amountPaid ?? 0;
    const finalFare = ride.finalFare ?? ride.estimatedFare ?? 0;
    const changeDue = amountPaid > finalFare ? amountPaid - finalFare : 0;

    const overpaidRides = await ctx.db
      .query("rides")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .collect();

    const needChangeCount = overpaidRides.filter((r) => {
      const paid = r.amountPaid ?? 0;
      const fare = r.finalFare ?? r.estimatedFare ?? 0;
      return r.paymentType === "overpaid" && paid > fare;
    }).length;

    return {
      passenger: {
        id: passenger._id,
        name: passenger.name,
        email: passenger.email,
        phoneNumber: passenger.phoneNumber,
      },
      ride: {
        rideId: ride.rideId,
        fare: finalFare,
        amountPaid,
        paymentType: ride.paymentType,
      },
      changeDue,
      stats: {
        needChangeCount,
      },
    };
  },
});

export const getChangeDueRides = query(async (ctx) => {
  const rides = await ctx.db
    .query("rides")
    .withIndex("by_status", (q) => q.eq("status", "in_progress"))
    .collect();

  const result = [];

  for (const r of rides) {
    const fare = r.finalFare ?? r.estimatedFare ?? 0;
    const paid = r.amountPaid ?? 0;
    const changeDue = paid > fare ? paid - fare : 0;

    if (r.paymentType === "overpaid" && changeDue > 0 && !r.changeReceived) {
      const passenger = await ctx.db.get(r.passengerId);
      result.push({
        rideId: r._id,
        passengerId: r.passengerId,
        passengerName: passenger?.name ?? "Unknown",
        passengerPhone: passenger?.phoneNumber ?? "-",
        fare,
        amountPaid: paid,
        changeDue,
      });
    }
  }

  return result;
});

export const markChangeReceived = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, { rideId }) => {
    const ride = await ctx.db.get(rideId);
    if (!ride) throw new Error("Ride not found");

    await ctx.db.patch(rideId, { changeReceived: true });
    return { success: true };
  },
});