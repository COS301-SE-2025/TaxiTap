// Mock getNotificationSettings function for testing
export const getNotificationSettingsHandler = async (ctx: any, args: any) => {
  const settings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .first();

  // Return default settings if none exist
  if (!settings) {
    return {
      rideUpdates: true,
      promotionalOffers: true,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: true,
      paymentNotifications: true,
      ratingReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00"
    };
  }

  return settings;
};
