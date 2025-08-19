import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getFareForLatestTripHandler } from "./fareHandler";

export const getFareForLatestTrip = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: getFareForLatestTripHandler,
});