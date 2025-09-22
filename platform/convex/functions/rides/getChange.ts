import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";

// ---------------- HANDLERS ----------------

export const getPassengerChangeHandler = async (
  ctx: any,
  rideId: string
) => {
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
    .withIndex("by_status", (q: any) => q.eq("status", "in_progress"))
    .collect();

  const needChangeCount = overpaidRides.filter((r: any) => {
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
};

export const getChangeDueRidesHandler = async (ctx: any) => {
  const rides = await ctx.db
    .query("rides")
    .withIndex("by_status", (q: any) => q.eq("status", "in_progress"))
    .collect();

  const result: any[] = [];

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
};

export const markChangeReceivedHandler = async (
  ctx: any,
  rideId: string
) => {
  const ride = await ctx.db.get(rideId);
  if (!ride) throw new Error("Ride not found");

  await ctx.db.patch(rideId, { changeReceived: true });
  return { success: true };
};

// ---------------- CONVEX EXPORTS ----------------

export const getPassengerChange = query({
  args: {
    rideId: v.id("rides"),
  },
  handler: (ctx, { rideId }) => getPassengerChangeHandler(ctx, rideId),
});

export const getChangeDueRides = query({
  args: {},
  handler: (ctx) => getChangeDueRidesHandler(ctx),
});

export const markChangeReceived = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: (ctx, { rideId }) => markChangeReceivedHandler(ctx, rideId),
});