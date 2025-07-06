// This is the function for a user to cancel a ride
import { mutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

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
  let notifyUserId = null;
  let notifyType = "ride_cancelled";
  let notifyMessage = "The ride has been cancelled.";

  if (ride.passengerId === args.userId && ride.driverId) {
    // Passenger cancelled, notify driver
    notifyUserId = ride.driverId;
    notifyMessage = "The passenger has cancelled the ride request.";
    notifyType = "ride_cancelled_by_passenger";
  } else if (ride.driverId === args.userId && ride.passengerId) {
    // Driver cancelled, notify passenger
    notifyUserId = ride.passengerId;
    notifyMessage = "The driver has cancelled your ride request.";
    notifyType = "ride_cancelled_by_driver";
  }

  if (notifyUserId) {
    await ctx.runMutation(internal.functions.notifications.rideNotifications.sendRideNotification, {
      rideId: args.rideId,
      type: notifyType,
      driverId: ride.driverId,
      passengerId: ride.passengerId,
      //message: notifyMessage,
    });
  }

  return {
    _id: updatedRideId,
    //message: "Ride cancelled successfully",
  };
};

export const cancelRide = mutation({
  args: {
    rideId: v.string(),
    userId: v.string(),
  },
  handler: cancelRideHandler,
});