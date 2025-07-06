export const endRideHandler = async (ctx: any, args: any) => {
  // Find the ride
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }
  
  if (ride.passengerId !== args.userId) {
    throw new Error("Only the assigned passenger can end this ride");
  }
  
  // Fix: Include "in_progress" status in the check
  if (ride.status !== "accepted" && ride.status !== "started" && ride.status !== "in_progress") {
    throw new Error("Ride is not in progress or started");
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
      driverId: ride.driverId,
      passengerId: args.userId,
    }
  );

  return {
    _id: ride._id,
    message: "Ride completed successfully",
  };
};