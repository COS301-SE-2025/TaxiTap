import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import {MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export const updateNotificationSettings = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    settings: v.object({
      rideUpdates: v.optional(v.boolean()),
      promotionalOffers: v.optional(v.boolean()),
      systemAlerts: v.optional(v.boolean()),
      emergencyNotifications: v.optional(v.boolean()),
      routeUpdates: v.optional(v.boolean()),
      paymentNotifications: v.optional(v.boolean()),
      ratingReminders: v.optional(v.boolean()),
      soundEnabled: v.optional(v.boolean()),
      vibrationEnabled: v.optional(v.boolean()),
      quietHoursStart: v.optional(v.string()),
      quietHoursEnd: v.optional(v.string())
    })
  },
  handler: async (ctx, args) => {
    const existingSettings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existingSettings) {
      return await ctx.db.patch(existingSettings._id, {
        ...args.settings,
        updatedAt: Date.now()
      });
    }

    // Create new settings
    return await ctx.db.insert("notificationSettings", {
      userId: args.userId,
      rideUpdates: args.settings.rideUpdates ?? true,
      promotionalOffers: args.settings.promotionalOffers ?? true,
      systemAlerts: args.settings.systemAlerts ?? true,
      emergencyNotifications: args.settings.emergencyNotifications ?? true,
      routeUpdates: args.settings.routeUpdates ?? true,
      paymentNotifications: args.settings.paymentNotifications ?? true,
      ratingReminders: args.settings.ratingReminders ?? true,
      soundEnabled: args.settings.soundEnabled ?? true,
      vibrationEnabled: args.settings.vibrationEnabled ?? true,
      quietHoursStart: args.settings.quietHoursStart ?? "22:00",
      quietHoursEnd: args.settings.quietHoursEnd ?? "07:00",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
});

export const updateNotificationSettingsHandler = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    settings: {
      rideUpdates?: boolean;
      promotionalOffers?: boolean;
      systemAlerts?: boolean;
      emergencyNotifications?: boolean;
      routeUpdates?: boolean;
      paymentNotifications?: boolean;
      ratingReminders?: boolean;
      soundEnabled?: boolean;
      vibrationEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
    };
  }
) => {
  const existingSettings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .first();

  if (existingSettings) {
    return await ctx.db.patch(existingSettings._id, {
      ...args.settings,
      updatedAt: Date.now()
    });
  }

  // Create new settings
  return await ctx.db.insert("notificationSettings", {
    userId: args.userId,
    rideUpdates: args.settings.rideUpdates ?? true,
    promotionalOffers: args.settings.promotionalOffers ?? true,
    systemAlerts: args.settings.systemAlerts ?? true,
    emergencyNotifications: args.settings.emergencyNotifications ?? true,
    routeUpdates: args.settings.routeUpdates ?? true,
    paymentNotifications: args.settings.paymentNotifications ?? true,
    ratingReminders: args.settings.ratingReminders ?? true,
    soundEnabled: args.settings.soundEnabled ?? true,
    vibrationEnabled: args.settings.vibrationEnabled ?? true,
    quietHoursStart: args.settings.quietHoursStart ?? "22:00",
    quietHoursEnd: args.settings.quietHoursEnd ?? "07:00",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};