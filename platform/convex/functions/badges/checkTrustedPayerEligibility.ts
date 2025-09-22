import { query } from "../../_generated/server";
import { v } from "convex/values";
import { checkTrustedPayerEligibility } from "./badgeService";

export const checkTrustedPayerEligibilityQuery = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    return await checkTrustedPayerEligibility(ctx, args.userId);
  },
});



