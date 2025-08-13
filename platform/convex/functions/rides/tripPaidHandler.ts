export const tripPaidHandler = async (ctx: any, rideId: string, userId: string, paid: boolean) => {
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }

  if (ride.passengerId !== userId) {
    throw new Error("Only the passenger can start the ride");
  }

  await ctx.db.patch(ride._id, {
    tripPaid: paid,
  });
};