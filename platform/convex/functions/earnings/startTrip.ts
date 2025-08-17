import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { startTripHandler } from "./startTripHandler";

export const startTrip = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    reservation: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await startTripHandler(ctx, args);
  },
});