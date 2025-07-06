export const requestRideHandler = async (
  ctx: any,
  args: {
    passengerId: string;
    driverId: string;
    startLocation: { coordinates: { latitude: number; longitude: number }; address: string };
    endLocation: { coordinates: { latitude: number; longitude: number }; address: string };
    estimatedFare?: number;
    estimatedDistance?: number;
  }
) => {
  const rideId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const ride = await ctx.db.insert("rides", {
    rideId,
    passengerId: args.passengerId,
    driverId: args.driverId,
    startLocation: args.startLocation,
    endLocation: args.endLocation,
    status: "requested",
    requestedAt: Date.now(),
    estimatedFare: args.estimatedFare,
    estimatedDistance: args.estimatedDistance,
  });

  // Notify the driver using the internal ride notification system
  await ctx.runMutation(
    require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
    {
      rideId,
      type: "ride_requested",
      driverId: args.driverId,
      passengerId: args.passengerId,
    }
  );

  return {
    _id: ride,
    rideId,
    message: `Ride requested successfully from ${args.startLocation.address} to ${args.endLocation.address}`,
  };
}; 