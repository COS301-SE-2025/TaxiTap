import { mutation } from "../../_generated/server";
import { v } from "convex/values";

// Generate a 4-digit PIN
function generateRidePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export const regenerateRidePin = mutation({
  args: {
    rideId: v.id("rides"),
  },
  handler: async (ctx, { rideId }) => {
    // Generate new 4-digit PIN
    const newRidePin = generateRidePin();
    
    // Update the ride with new PIN
    await ctx.db.patch(rideId, {
      ridePin: newRidePin,
      pinRegeneratedAt: Date.now()
    });

    // Return the updated ride information
    const updatedRide = await ctx.db.get(rideId);
    return {
      success: true,
      newPin: newRidePin,
      ride: updatedRide,
      message: "PIN regenerated successfully"
    };
  },
});