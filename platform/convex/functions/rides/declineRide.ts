import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { declineRideHandler } from "./declineRideHandler";

export const declineRide = mutation({
  args: {
    rideId: v.string(),
    driverId: v.id("taxiTap_users"),
  },
  handler: declineRideHandler,
}); 