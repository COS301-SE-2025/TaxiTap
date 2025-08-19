export const cancelRideHandler = async (ctx: any, args: { rideId: string; userId: string }) => {
  // Find the ride
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }

  // Check if the user is authorized to cancel the ride
  if (ride.passengerId !== args.userId && ride.driverId !== args.userId) {
    throw new Error("User is not authorized to cancel this ride");
  }

  // Update the ride status to cancelled
  const updatedRideId = await ctx.db.patch(ride._id, {
    status: "cancelled",
  });

  // Notify the other party
  if (ride.passengerId === args.userId && ride.driverId) {
    // Passenger cancelled, notify driver
    await ctx.runMutation(
      require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId: args.rideId,
        type: "ride_cancelled",
        driverId: ride.driverId,
        passengerId: ride.passengerId,
      }
    );
  } else if (ride.driverId === args.userId && ride.passengerId) {
    // Driver cancelled, notify passenger
    await ctx.runMutation(
      require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId: args.rideId,
        type: "ride_declined",
        driverId: ride.driverId,
        passengerId: ride.passengerId,
      }
    );
  }

  return {
    _id: updatedRideId,
    message: "Ride cancelled successfully",
  };
}; 