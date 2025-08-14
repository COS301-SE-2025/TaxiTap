// Mock declineRideHandler function for testing
export const declineRideHandler = async (ctx: any, args: { rideId: string; driverId: string }) => {
  // Find the ride
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (!ride) throw new Error("Ride not found");
  if (ride.driverId !== args.driverId) throw new Error("Only the assigned driver can decline this ride");
  if (ride.status !== "requested" && ride.status !== "accepted") throw new Error("Ride is not pending");

  // Update the ride status
  await ctx.db.patch(ride._id, { status: "declined" });

  // Mock the notification call since ctx.runMutation might not be available in tests
  if (ctx.runMutation) {
    try {
      await ctx.runMutation(
        "internal.functions.notifications.rideNotifications.sendRideNotification",
        {
          rideId: args.rideId,
          type: "ride_declined",
          driverId: args.driverId,
          passengerId: ride.passengerId,
        }
      );
    } catch (error) {
      // Ignore notification errors in tests
    }
  }

  return { _id: ride._id, message: "Ride declined by driver." };
};
