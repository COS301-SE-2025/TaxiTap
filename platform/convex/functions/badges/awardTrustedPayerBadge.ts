import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { checkAndAwardTrustedPayerBadge } from "./badgeService";

export const awardTrustedPayerBadge = mutation({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    return await checkAndAwardTrustedPayerBadge(ctx, args.userId);
  },
});


