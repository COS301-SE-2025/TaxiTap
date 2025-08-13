// averageRating.ts
import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getAverageRating = query({
  args: {
    driverId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    const feedbacks = await ctx.db
      .query("feedback")
      .withIndex("by_driver", (q) => q.eq("driverId", args.driverId))
      .collect();

    const ratings = feedbacks.map((f) => f.rating).filter((r) => typeof r === "number" && r > 0);

    if (ratings.length === 0) return 0;

    const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
    return parseFloat(avg.toFixed(1));
  },
});