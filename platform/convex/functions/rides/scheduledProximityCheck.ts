import { mutation } from "../../_generated/server";
import { internal } from "../../_generated/api";

// Manual trigger function for proximity checks (since cron jobs might have issues)
export const triggerProximityCheck = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Manually triggering proximity check...");
    await ctx.runMutation(internal.functions.rides.checkProximityAndNotify.checkAllRidesProximity);
    return { success: true, message: "Proximity check triggered" };
  },
});

// Note: For automatic scheduling, you can:
// 1. Use a client-side timer to call this function every 30 seconds
// 2. Set up a proper cron job in your deployment environment
// 3. Use Convex's scheduled functions when they become available 