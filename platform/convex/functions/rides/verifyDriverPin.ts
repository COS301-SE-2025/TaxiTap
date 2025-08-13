import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const verifyDriverPin = mutation({
  args: {
    rideId: v.string(),
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    enteredPin: v.string(),
  },
  handler: async (ctx, { rideId, passengerId, driverId, enteredPin }) => {
    // Find the ride
    const ride = await ctx.db
      .query("rides")
      .filter(q => q.eq(q.field("rideId"), rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    // Check if the passenger is authorized for this ride
    if (ride.passengerId !== passengerId) {
      throw new Error("Unauthorized: You are not the passenger for this ride");
    }

    // Check if the driver matches
    if (ride.driverId !== driverId) {
      throw new Error("Driver mismatch");
    }

    // Check if ride is in correct status (should be 'accepted')
    if (ride.status !== 'accepted') {
      throw new Error(`Cannot start ride. Current status: ${ride.status}`);
    }

    // Get the driver's PIN from their profile
    const driver = await ctx.db.get(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    const driverPin = driver.driverPin || "1234"; // Fallback PIN

    // Verify the PIN
    if (enteredPin !== driverPin) {
      return {
        success: false,
        message: "Invalid PIN. Please check with the driver.",
        attemptsRemaining: 3 // You can implement attempt tracking if needed
      };
    }

    // PIN is correct, start the ride
    await ctx.db.patch(ride._id, {
      status: 'in_progress',
      startedAt: Date.now(),
      pinVerifiedAt: Date.now()
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

// Optional: Get ride info for passenger PIN entry screen
export const getRideForPassengerPinEntry = query({
  args: {
    rideId: v.string(),
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { rideId, passengerId }) => {
    const ride = await ctx.db
      .query("rides")
      .filter(q => q.eq(q.field("rideId"), rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    if (ride.passengerId !== passengerId) {
      throw new Error("Unauthorized");
    }

    // Get driver info
    if (!ride.driverId) {
      throw new Error("No driver assigned to this ride");
    }
    
    const driver = await ctx.db.get(ride.driverId);

    return {
      rideId: ride._id,
      driverName: driver?.name || "Unknown",
      pickupLocation: ride.startLocation,
      destination: ride.endLocation,
      status: ride.status,
      hasPin: !!(driver?.driverPin)
    };
  },
});

// Function to set/update driver's PIN in their profile
export const updateDriverPin = mutation({
  args: {
    driverId: v.id("taxiTap_users"),
    newPin: v.string(),
  },
  handler: async (ctx, { driverId, newPin }) => {
    // Validate PIN (should be 4 digits)
    if (!/^\d{4}$/.test(newPin)) {
      throw new Error("PIN must be exactly 4 digits");
    }

    // Update driver's PIN
    await ctx.db.patch(driverId, {
      driverPin: newPin,
      pinUpdatedAt: Date.now()
    });

    return {
      success: true,
      message: "Driver PIN updated successfully"
    };
  },
});