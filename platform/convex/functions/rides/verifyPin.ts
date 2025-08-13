// convex/functions/rides/verifyPin.ts
import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const verifyRidePin = mutation({
  args: {
    rideId: v.id("rides"),
    driverId: v.id("taxiTap_users"),
    enteredPin: v.string(),
  },
  handler: async (ctx, { rideId, driverId, enteredPin }) => {
    // Get the ride document
    const ride = await ctx.db.get(rideId);
    
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
    if (!ride.ridePin || ride.ridePin !== enteredPin) {
      return {
        success: false,
        message: "Invalid PIN. Please check with the passenger.",
        attemptsRemaining: 3 // You can implement attempt tracking if needed
      };
    }

    // PIN is correct, start the ride
    await ctx.db.patch(rideId, {
      status: 'in_progress',
      startedAt: Date.now(),
      pinVerifiedAt: Date.now()
    });

    // Get updated ride information
    const updatedRide = await ctx.db.get(rideId);

    return {
      success: true,
      message: "PIN verified successfully! Ride started.",
      ride: updatedRide
    };
  },
});

// Optional: Get ride info for driver PIN entry screen
export const getRideForPinEntry = mutation({
  args: {
    rideId: v.id("rides"),
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { rideId, driverId }) => {
    const ride = await ctx.db.get(rideId);
    
    if (!ride) {
      throw new Error("Ride not found");
    }

    if (ride.driverId !== driverId) {
      throw new Error("Unauthorized");
    }

    // Get passenger info
    const passenger = await ctx.db.get(ride.passengerId);
    
    return {
      rideId: ride._id,
      passengerName: passenger?.name || "Unknown",
      pickupLocation: ride.startLocation,
      destination: ride.endLocation,
      status: ride.status,
      hasPin: !!ride.ridePin
    };
  },
});