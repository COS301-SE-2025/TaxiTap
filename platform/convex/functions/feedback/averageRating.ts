import { query } from "../../_generated/server";
import { v } from "convex/values";

export const getAverageRatingHandler = async (ctx: any, args: any) => {
  const feedbacks = await ctx.db
    .query("feedback")
    .withIndex("by_driver", (q: any) => q.eq("driverId", args.driverId))
    .collect();

  const ratings = feedbacks.map((f: any) => f.rating).filter((r: any) => typeof r === "number" && r > 0);

  if (ratings.length === 0) return 0;

  const avg = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
  return parseFloat(avg.toFixed(1));
};

let getAverageRating;
if (typeof query === "function" && v?.id) {
  getAverageRating = query({
    args: {
      driverId: v.id("taxiTap_users"),
    },
    handler: getAverageRatingHandler,
  });
}

export { getAverageRating };