export const getActiveTripsHandler = async (ctx: any, driverId: string) => {
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
      passengers.push({
        name: passenger.name,
        phoneNumber: passenger.phoneNumber,
        fare: ride.finalFare ?? ride.estimatedFare ?? 0,
        tripPaid: ride.tripPaid ?? null,
      });
    }
  }

  for (const ride of unpaidRides) {
    const passengerUnpaid = await ctx.db.get(ride.passengerId);
    if (passengerUnpaid) {
      passengersUnpaid.push({
        name: passengerUnpaid.name,
        phoneNumber: passengerUnpaid.phoneNumber,
        fare: ride.finalFare ?? ride.estimatedFare ?? 0,
        tripPaid: ride.tripPaid ?? null,
        requestedAt: ride.requestedAt,
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