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

// Note: verifyDriverPin function moved to verifyDriverPin.ts to avoid conflicts

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