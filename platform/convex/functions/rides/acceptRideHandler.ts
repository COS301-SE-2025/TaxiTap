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

  // Check if driver already has an active ride
  const existingActiveRide = await ctx.db
    .query("rides")
    .withIndex("by_driver", (q: any) => q.eq("driverId", args.driverId))
    .filter((q: any) => 
      q.or(
        q.eq(q.field("status"), "accepted"),
        q.eq(q.field("status"), "in_progress")
      )
    )
    .first();

  if (existingActiveRide) {
    throw new Error(`You already have an active ride (${existingActiveRide.status}). Please complete your current ride before accepting a new one.`);
  }

  // Get the driver's PIN from their profile
  const driver = await ctx.db.get(args.driverId);
  if (!driver) {
    throw new Error("Driver not found");
  }

  // Use driver's existing PIN or generate a new one if none exists
  let driverPin = driver.driverPin;
  if (!driverPin) {
    driverPin = Math.floor(1000 + Math.random() * 9000).toString();
    // Update driver's profile with the new PIN
    await ctx.db.patch(args.driverId, {
      driverPin: driverPin,
      pinUpdatedAt: Date.now(),
    });
  }

  // Update the ride
  const updatedRideId = await ctx.db.patch(ride._id, {
    status: "accepted",
    driverId: args.driverId,
    acceptedAt: Date.now(),
    // Store the driver's PIN in the ride for verification
    ridePin: driverPin,
    pinRegeneratedAt: Date.now(),
  });

  // Notify the passenger using the internal ride notification system
  await ctx.runMutation(
    require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
    {
      rideId: args.rideId,
      type: "ride_accepted",
      driverId: args.driverId,
      passengerId: ride.passengerId, // Add this line
      metadata: null, // Add this line
    }
  );

  return {
    _id: updatedRideId,
    message: "Ride accepted successfully",
    driverPin: driverPin, // Return the PIN for immediate use
  };
};