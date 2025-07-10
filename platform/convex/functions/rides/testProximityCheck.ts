import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

// Test function to manually trigger proximity checks
export const testProximityCheck = mutation({
  args: {
    rideId: v.string(),
    driverLat: v.number(),
    driverLon: v.number(),
    passengerLat: v.number(),
    passengerLon: v.number(),
    destinationLat: v.number(),
    destinationLon: v.number()
  },
  handler: async (ctx, args) => {
    console.log("Testing proximity check with sample data:", args);
    
    try {
      // Call the proximity check function with the provided coordinates
      await ctx.runMutation(internal.functions.rides.checkProximityAndNotify.checkRideProximity, args);
      
      return { success: true, message: "Proximity check completed successfully" };
    } catch (error) {
      console.error("Error in testProximityCheck:", error);
      return { success: false, message: `Error: ${error}` };
    }
  }
});

// Test function to check all active rides
export const testAllRidesProximity = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Testing proximity check for all active rides...");
    
    try {
      // Call the main proximity check function
      await ctx.runMutation(internal.functions.rides.checkProximityAndNotify.checkAllRidesProximity);
      
      return { success: true, message: "All rides proximity check completed successfully" };
    } catch (error) {
      console.error("Error in testAllRidesProximity:", error);
      return { success: false, message: `Error: ${error}` };
    }
  }
});

// Test function to check if a specific ride exists and has the right structure
export const testRideStructure = mutation({
  args: {
    rideId: v.string()
  },
  handler: async (ctx, args) => {
    try {
      const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
        .first();

      if (!ride) {
        return { success: false, message: "Ride not found" };
      }

      return {
        success: true,
        message: "Ride found",
        ride: {
          rideId: ride.rideId,
          status: ride.status,
          driverId: ride.driverId,
          passengerId: ride.passengerId,
          endLocation: ride.endLocation
        }
      };
    } catch (error) {
      console.error("Error in testRideStructure:", error);
      return { success: false, message: `Error: ${error}` };
    }
  }
}); 