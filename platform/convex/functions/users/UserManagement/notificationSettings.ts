// convex/functions/users/UserManagement/notificationSettings.ts
import { mutation, query } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx, QueryCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

// Get user notification settings
export async function getUserNotificationSettingsHandler(
  ctx: QueryCtx,
  args: { userId: Id<"taxiTap_users"> }
) {
  const settings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .first();

  if (!settings) {
    // Return default settings if none exist
    return {
      notificationsEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }

  return {
    notificationsEnabled: settings.rideUpdates, // Use existing field as master toggle
    soundEnabled: settings.soundEnabled,
    vibrationEnabled: settings.vibrationEnabled,
  };
}

export const getUserNotificationSettings = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: getUserNotificationSettingsHandler,
});

// Update notification settings
export async function updateNotificationSettingsHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  }
) {
  const existingSettings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .first();

  const now = Date.now();

  if (existingSettings) {
    // Update existing settings
    await ctx.db.patch(existingSettings._id, {
      rideUpdates: args.notificationsEnabled,
      promotionalOffers: args.notificationsEnabled,
      systemAlerts: args.notificationsEnabled,
      emergencyNotifications: true, // Always keep emergency notifications on
      routeUpdates: args.notificationsEnabled,
      paymentNotifications: args.notificationsEnabled,
      ratingReminders: args.notificationsEnabled,
      soundEnabled: args.soundEnabled,
      vibrationEnabled: args.vibrationEnabled,
      updatedAt: now,
    });
  } else {
    // Create new settings
    await ctx.db.insert("notificationSettings", {
      userId: args.userId,
      rideUpdates: args.notificationsEnabled,
      promotionalOffers: args.notificationsEnabled,
      systemAlerts: args.notificationsEnabled,
      emergencyNotifications: true, // Always keep emergency notifications on
      routeUpdates: args.notificationsEnabled,
      paymentNotifications: args.notificationsEnabled,
      ratingReminders: args.notificationsEnabled,
      soundEnabled: args.soundEnabled,
      vibrationEnabled: args.vibrationEnabled,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    success: true,
    notificationsEnabled: args.notificationsEnabled,
    soundEnabled: args.soundEnabled,
    vibrationEnabled: args.vibrationEnabled,
  };
}

export const updateNotificationSettings = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    notificationsEnabled: v.boolean(),
    soundEnabled: v.boolean(),
    vibrationEnabled: v.boolean(),
  },
  handler: updateNotificationSettingsHandler,
});