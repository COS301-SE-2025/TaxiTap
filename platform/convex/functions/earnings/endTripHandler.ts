export async function endTripHandler(ctx: any, { passengerId }: { passengerId: string }) {
  const trips = await ctx.db
    .query("trips")
    .withIndex("by_passenger_and_startTime", (q: any) => q.eq("passengerId", passengerId))
    .order("desc")
    .collect();

  const ongoingTrip = trips.find((t: any) => t.endTime === 0);
  if (!ongoingTrip) throw new Error("No ongoing trip found.");

  const ride = await ctx.db
    .query("rides")
    .withIndex("by_trip_id", (q: any) => q.eq("tripId", ongoingTrip._id))
    .unique();

  if (!ride || ride.estimatedFare == null) {
    throw new Error("Estimated fare not found for this trip.");
  }

  const endTime = Date.now();
  await ctx.db.patch(ongoingTrip._id, { endTime, fare: ride.estimatedFare });

  return { endTime, fare: ride.estimatedFare };
}