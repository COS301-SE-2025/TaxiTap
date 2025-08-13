import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { startWorkSessionHandlerFunc } from "./startWorkSessionHandler";

export const startWorkSession = mutation({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, { driverId }) => {
    return startWorkSessionHandlerFunc(ctx, driverId);
  },
});