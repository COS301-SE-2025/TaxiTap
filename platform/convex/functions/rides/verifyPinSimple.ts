import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const verifyPinAndStartRide = mutation({
  args: {
    rideId: v.string(),
    driverId: v.id("taxiTap_users"),
    enteredPin: v.string(),
    expectedPin: v.string(), // For demo purposes, we'll pass the expected PIN
  },
  handler: async (ctx, { rideId, driverId, enteredPin, expectedPin }) => {
    // Find the ride
    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q) => q.eq("rideId", rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    // Check if the driver is authorized for this ride
    if (ride.driverId !== driverId) {
      throw new Error("Unauthorized: You are not the driver for this ride");
    }

    // Check if ride is in correct status (should be 'accepted')
    if (ride.status !== 'accepted') {
      throw new Error(`Cannot start ride. Current status: ${ride.status}`);
    }

    // Verify the PIN
    if (enteredPin !== expectedPin) {
      return {
        success: false,
        message: "Invalid PIN. Please check with the passenger.",
      };
    }

    // PIN is correct, start the ride
    await ctx.db.patch(ride._id, {
      status: 'in_progress',
      startedAt: Date.now(),
    });

    // Get updated ride information
    const updatedRide = await ctx.db.get(ride._id);

    return {
      success: true,
      message: "PIN verified successfully! Ride started.",
      ride: updatedRide
    };
  },
}); 