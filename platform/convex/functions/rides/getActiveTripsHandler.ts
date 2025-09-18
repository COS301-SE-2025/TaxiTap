import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { getUserBadges } from "../badges/badgeService";

export const getActiveTripsHandler = async (ctx: QueryCtx, driverId: Id<"taxiTap_users">) => {
  const activeRides = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q: any) => q.eq("driverId", driverId))
    .filter((q: any) => q.eq(q.field("status"), "in_progress"))
    .collect();

  const unpaidRides = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q: any) => q.eq("driverId", driverId))
    .filter((q: any) => q.eq(q.field("tripPaid"), false))
    .collect();

  let activeCount = activeRides.length;
  let paidCount = 0;
  let noResponseCount = 0;
  const passengers: any[] = [];
  const passengersUnpaid: any[] = [];

  for (const ride of activeRides) {
    if (ride.tripPaid === true) paidCount++;
    else if (ride.tripPaid === null || ride.tripPaid === undefined) noResponseCount++;

    const passenger = await ctx.db.get(ride.passengerId);
    if (passenger) {
      // Get passenger badges
      const badges = await getUserBadges(ctx, ride.passengerId);
      
      passengers.push({
        name: passenger.name,
        phoneNumber: passenger.phoneNumber,
        fare: ride.finalFare ?? ride.estimatedFare ?? 0,
        tripPaid: ride.tripPaid ?? null,
        badges: badges,
      });
    }
  }

  for (const ride of unpaidRides) {
    const passengerUnpaid = await ctx.db.get(ride.passengerId);
    if (passengerUnpaid) {
      // Get passenger badges
      const badges = await getUserBadges(ctx, ride.passengerId);
      
      passengersUnpaid.push({
        name: passengerUnpaid.name,
        phoneNumber: passengerUnpaid.phoneNumber,
        fare: ride.finalFare ?? ride.estimatedFare ?? 0,
        tripPaid: ride.tripPaid ?? null,
        requestedAt: ride.requestedAt,
        badges: badges,
      });
    }
  }

  return {
    activeCount,
    paidCount,
    unpaidCount: unpaidRides.length,
    noResponseCount,
    passengers,
    passengersUnpaid,
  };
};