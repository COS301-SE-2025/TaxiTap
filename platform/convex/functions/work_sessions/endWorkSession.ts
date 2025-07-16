import { v } from "convex/values";
import { mutation } from "../../_generated/server";

export const endWorkSession = mutation({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, { driverId }) => {
    const latest = await ctx.db
      .query("work_sessions")
      .withIndex("by_driver_and_start", q => q.eq("driverId", driverId))
      .order("desc")
      .first();

    if (!latest || latest.endTime)
      throw new Error("No active work session found.");

    await ctx.db.patch(latest._id, { endTime: Date.now() });
    return { sessionId: latest._id };
  }
});