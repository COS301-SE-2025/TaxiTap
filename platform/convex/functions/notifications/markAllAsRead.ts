import { v } from "convex/values";
import { mutation, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export const markAllAsRead = mutation({
  args: {
    userId: v.id("taxiTap_users")
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: Date.now()
      });
    }

    return unreadNotifications.length;
  }
});

export const markAllAsReadHandler = async (
  ctx: MutationCtx,
  args: { userId: Id<"taxiTap_users"> }
) => {
  const unreadNotifications = await ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .filter((q) => q.eq(q.field("isRead"), false))
    .collect();

  for (const notification of unreadNotifications) {
    await ctx.db.patch(notification._id, {
      isRead: true,
      readAt: Date.now()
    });
  }

  return unreadNotifications.length;
};
