import { query } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

// Get user notification settings
export const getNotificationSettings = query({
  args: {
    userId: v.id("taxiTap_users")
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
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
  }
});

export const getNotificationSettingsHandler = async (
  ctx: QueryCtx,
  args: { userId: Id<"taxiTap_users"> }
) => {
  const settings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
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