export const completeRideHandler = async (ctx: any, args: any) => {
  // Find the ride
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }
  if (ride.driverId !== args.driverId) {
    throw new Error("Only the assigned driver can complete this ride");
  }
  if (ride.status !== "accepted") {
    throw new Error("Ride is not in progress");
  }

  // Update the ride status
  await ctx.db.patch(ride._id, {
    status: "completed",
    completedAt: Date.now(),
  });

  // Notify the passenger and driver using the internal ride notification system
  await ctx.runMutation(
    require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
    {
      rideId: args.rideId,
      type: "ride_completed",
      driverId: args.driverId,
    }
  );

  return {
    _id: ride._id,
    message: "Ride marked as completed.",
  };
}; 