export const endRideHandler = async (ctx: any, args: any) => {
  try {
    // Validate input parameters
    if (!args.rideId || !args.userId) {
      throw new Error("Missing required parameters: rideId and userId");
    }

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

    // Safely send notification with error handling and metadata field
    try {
      await ctx.runMutation(
        require("../../_generated/api").internal.functions.notifications.rideNotifications.sendRideNotification,
        {
          rideId: args.rideId,
          type: "ride_completed",
          driverId: ride.driverId,
          passengerId: args.userId,
          metadata: null, // Add the required metadata field
        }
      );
    } catch (notificationError: any) {
      // Log the error but don't fail the ride ending
      console.warn("Failed to send ride completion notification:", notificationError);
      // Continue with ride completion even if notification fails
    }

    return {
      _id: ride._id,
      message: "Ride completed successfully",
    };
  } catch (error: any) {
    console.error("endRideHandler error:", error);
    throw error; // Re-throw to maintain error handling in the frontend
  }
};