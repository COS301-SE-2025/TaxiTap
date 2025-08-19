import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { saveFeedbackHandler } from "./saveFeedbackHandler";

export const saveFeedback = mutation({
  args: {
    rideId: v.id("rides"),
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    startLocation: v.string(),
    endLocation: v.string(),
  },
  handler: saveFeedbackHandler,
});