import { query } from "../../_generated/server";
import { v } from "convex/values";
import { showFeedbackPassengerHandler, showFeedbackDriverHandler } from "./showFeedbackHandler";

export const showFeedbackPassenger = query({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: showFeedbackPassengerHandler,
});

export const showFeedbackDriver = query({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: showFeedbackDriverHandler,
});