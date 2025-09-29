export async function endTripHandler(ctx: any, { passengerId, rideId }: { passengerId: any, rideId?: string }) {
  let ongoingTrip: any;
  let ride: any;

  if (rideId) {
    // If rideId is provided, find the specific ride and its trip
    ride = await ctx.db
      .query("rides")
      .filter((q: any) => q.eq(q.field("rideId"), rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found for the provided rideId.");
    }

    if (!ride.tripId) {
      throw new Error("No trip associated with this ride.");
    }

    ongoingTrip = await ctx.db.get(ride.tripId);
    if (!ongoingTrip) {
      throw new Error("Trip not found.");
    }
  } else {
    // Fallback to original logic for backward compatibility
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_passenger_and_startTime", (q: any) => q.eq("passengerId", passengerId))
      .order("desc")
      .collect();

    ongoingTrip = trips.find((t: any) => t.endTime === 0);
    if (!ongoingTrip) throw new Error("No ongoing trip found.");

    ride = await ctx.db
      .query("rides")
      .withIndex("by_trip_id", (q: any) => q.eq("tripId", ongoingTrip._id))
      .unique();
  }

  if (!ride || ride.estimatedFare == null) {
    throw new Error("Estimated fare not found for this trip.");
  }

  const endTime = Date.now();
  await ctx.db.patch(ongoingTrip._id, { endTime, fare: ride.estimatedFare });

  return { endTime, fare: ride.estimatedFare };
}