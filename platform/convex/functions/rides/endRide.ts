import { mutation, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { endRideHandler } from "./endRideHandler";

export const endRide = mutation({
  args: {
    rideId: v.string(),
    userId: v.id("taxiTap_users"),
  },
  handler: endRideHandler,
});

// Internal version for system use (transfer point automation)
export const internalEndRide = internalMutation({
  args: {
    rideId: v.string(),
    userId: v.id("taxiTap_users"),
  },
  handler: endRideHandler,
}); 