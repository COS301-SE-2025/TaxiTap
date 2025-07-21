import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const startWorkSession = mutation({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, { driverId }) => {
    return await ctx.db.insert("work_sessions", {
      driverId,
      startTime: Date.now(),
    });
  }
});