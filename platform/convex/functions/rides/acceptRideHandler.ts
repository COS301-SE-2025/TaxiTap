export const acceptRideHandler = async (
  ctx: any,
  args: {
    rideId: string;
    driverId: string;
  }
) => {
  // Find the ride
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) {
    throw new Error("Ride not found");
  }
  if (ride.status !== "requested") {
    throw new Error("Ride is not available for acceptance");
  }

  // Generate a 4-digit PIN for verification
  const ridePin = Math.floor(1000 + Math.random() * 9000).toString();

  // Update the ride
  const updatedRideId = await ctx.db.patch(ride._id, {
    status: "accepted",
    driverId: args.driverId,
    acceptedAt: Date.now(),
    ridePin: ridePin,
    pinRegeneratedAt: Date.now(),
  });

  // Notify the passenger using the internal ride notification system
  await ctx.runMutation(
    require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
    {
      rideId: args.rideId,
      type: "ride_accepted",
      driverId: args.driverId,
    }
  );

  return {
    _id: updatedRideId,
    message: "Ride accepted successfully",
  };
}; 