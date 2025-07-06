import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { completeRideHandler } from "./completeRideHandler";

export const completeRide = mutation({
  args: {
    rideId: v.string(),
    driverId: v.id("taxiTap_users"),
  },
  handler: completeRideHandler,
}); 