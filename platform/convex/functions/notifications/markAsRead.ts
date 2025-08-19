import { v } from "convex/values";
import { mutation, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now()
    });
  }
});

export const markAsReadHandler = async (
  ctx: MutationCtx,
  args: { notificationId: Id<"notifications"> }
) => {
  return await ctx.db.patch(args.notificationId, {
    isRead: true,
    readAt: Date.now()
  });
};
