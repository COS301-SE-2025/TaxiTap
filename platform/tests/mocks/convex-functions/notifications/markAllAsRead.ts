// Mock markAllAsRead function for testing
export const markAllAsReadHandler = async (ctx: any, args: any) => {
  const unreadNotifications = await ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .filter((q: any) => q.eq(q.field("isRead"), false))
    .collect();

  for (const notification of unreadNotifications) {
    await ctx.db.patch(notification._id, {
      isRead: true,
      readAt: Date.now()
    });
  }

  return unreadNotifications.length;
};
