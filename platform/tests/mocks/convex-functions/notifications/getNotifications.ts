// Mock getNotifications function for testing
export const getNotificationsHandler = async (ctx: any, args: any) => {
  let q = ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .order("desc");

  if (args.unreadOnly) {
    q = q.filter((q: any) => q.eq(q.field("isRead"), false));
  }

  if (args.limit) {
    return await q.take(args.limit);
  }

  return await q.collect();
};
