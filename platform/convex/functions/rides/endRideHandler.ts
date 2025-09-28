import { checkAndAwardMarathonDriverBadge } from "../badges/badgeService";

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

    // Check if payment has been confirmed - rides cannot be ended without payment
    // For multi-leg journeys, payment is auto-confirmed in completeLegWithPayment
    // Check if this ride is part of any multi-leg journey
    const multiLegJourneys = await ctx.db.query("multiLegJourneys").collect();
    const isMultiLegRide = multiLegJourneys.find((journey: any) => {
      if (journey.status === "cancelled") return false;

      // Check if the ride ID matches any leg in this journey
      return journey.legs?.some((leg: any) => leg.rideId === ride._id);
    });

    if (!isMultiLegRide && ride.tripPaid !== true) {
      throw new Error("Payment must be confirmed before ending the ride. Please use the payment confirmation screen first.");
    }

    // For multi-leg journeys, auto-confirm payment if not already confirmed
    if (isMultiLegRide && ride.tripPaid !== true) {
      console.log(`💳 Auto-confirming payment for multi-leg ride ${ride.rideId}`);
      await ctx.db.patch(ride._id, {
        tripPaid: true,
        amountPaid: ride.estimatedFare || 0,
        paymentType: "exact",
        paymentConfirmedAt: Date.now(),
      });
    }

    // Update the ride status
    await ctx.db.patch(ride._id, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Check and award Marathon Driver badge if eligible
    if (ride.driverId) {
      try {
        await checkAndAwardMarathonDriverBadge(ctx, ride.driverId);
      } catch (error) {
        console.warn("Failed to check Marathon Driver badge eligibility:", error);
      }
    }

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
      console.warn("Failed to send ride completion notification:",
        notificationError.message);
    }

    return {
      _id: ride._id,
      message: "Ride ended successfully.",
    };
  } catch (error: any) {
    throw new Error(`Failed to end ride: ${error.message}`);
  }
};