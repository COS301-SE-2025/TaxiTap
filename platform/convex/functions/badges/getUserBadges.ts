import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getUserBadges } from "./badgeService";

export const getUserBadgesQuery = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    return await getUserBadges(ctx, args.userId);
  },
});

