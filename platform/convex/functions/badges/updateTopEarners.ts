import { mutation } from "../../_generated/server";
import { updateTopEarnerBadges } from "./badgeService";

export const updateTopEarners = mutation({
  handler: async (ctx) => {
    await updateTopEarnerBadges(ctx);
  },
});
