// convex/functions/drivers/driverPin.ts
import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

// Generate or get existing driver PIN from user profile
export const getOrCreateDriverPin = mutation({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { driverId }) => {
    const driver = await ctx.db.get(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    const now = Date.now();
    const pinAge = driver.pinUpdatedAt ? now - driver.pinUpdatedAt : Infinity;
    const PIN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

    if (!driver.driverPin || pinAge > PIN_EXPIRY) {
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();

      await ctx.db.patch(driverId, {
        driverPin: newPin,
        pinUpdatedAt: now,
      });

      return { pin: newPin, isNew: true, generatedAt: now };
    }

    return { pin: driver.driverPin, isNew: false, generatedAt: driver.pinUpdatedAt };
  },
});


// When ride is accepted, copy driver PIN to ride
export const copyDriverPinToRide = mutation({
  args: {
    rideId: v.string(),
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { rideId, driverId }) => {
    // Get driver's current PIN
    const driver = await ctx.db.get(driverId);
    if (!driver || !driver.driverPin) {
      throw new Error("Driver PIN not found");
    }

    // Find and update the ride
    const ride = await ctx.db
      .query("rides")
      .filter(q => q.eq(q.field("rideId"), rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    // Copy driver PIN to ride
    await ctx.db.patch(ride._id, {
      ridePin: driver.driverPin,
      pinRegeneratedAt: Date.now(),
    });

    return {
      success: true,
      pin: driver.driverPin,
    };
  },
});

// Verify PIN against both driver profile and ride
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

    // Verify passenger authorization
    if (ride.passengerId !== passengerId) {
      throw new Error("Unauthorized: You are not the passenger for this ride");
    }

    // Verify driver matches
    if (ride.driverId !== driverId) {
      throw new Error("Driver mismatch");
    }

    // Check ride status
    if (ride.status !== 'accepted') {
      throw new Error(`Cannot start ride. Current status: ${ride.status}`);
    }

    // Get driver's PIN from profile as fallback
    const driver = await ctx.db.get(driverId);
    const correctPin = ride.ridePin || driver?.driverPin;

    if (!correctPin || correctPin !== enteredPin) {
      return {
        success: false,
        message: "Invalid PIN. Please check with the driver.",
        attemptsRemaining: 3,
      };
    }

    // PIN verified - start the ride
    const startTime = Date.now();
    
    const tripId = await ctx.db.insert("trips", {
      driverId,
      passengerId,
      startTime,
      endTime: 0,
      fare: 0,
      reservation: true,
    });

    await ctx.db.patch(ride._id, {
      status: 'in_progress',
      startedAt: startTime,
      pinVerifiedAt: startTime,
      tripId: tripId,
    });

    return {
      success: true,
      message: "PIN verified successfully! Ride started.",
      tripId: tripId,
    };
  },
});

// Force regenerate PIN (useful for testing or security)
export const regenerateDriverPin = mutation({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { driverId }) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    await ctx.db.patch(driverId, {
      driverPin: newPin,
      pinUpdatedAt: Date.now(),
    });

    return {
      success: true,
      newPin: newPin,
    };
  },
});