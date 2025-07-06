import { v } from "convex/values";
import { mutation, MutationCtx } from "../../_generated/server";

export const deactivatePushTokenHandler = async (
  ctx: MutationCtx,
  args: {
    token: string;
  }
) => {
  const tokenDoc = await ctx.db
    .query("pushTokens")
    .withIndex("by_token", (q) => q.eq("token", args.token))
    .first();

  if (tokenDoc) {
    return await ctx.db.patch(tokenDoc._id, {
      isActive: false,
      updatedAt: Date.now()
    });
  }

  return null;
};

// Update your mutation to use the handler
export const deactivatePushToken = mutation({
  args: {
    token: v.string()
  },
  handler: deactivatePushTokenHandler
});