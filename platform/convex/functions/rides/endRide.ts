import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { endRideHandler } from "./endRideHandler";

export const endRide = mutation({
  args: {
    rideId: v.string(),
    userId: v.id("taxiTap_users"),
  },
  handler: endRideHandler,
}); 