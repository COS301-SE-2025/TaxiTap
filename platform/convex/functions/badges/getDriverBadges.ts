import { query } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";
import { getUserBadges } from "./badgeService";

export const getDriverBadges = query({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, args) => {
    return await getUserBadges(ctx, args.driverId);
  },
});
