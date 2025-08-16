import { MutationCtx } from '../../../../convex/_generated/server';
import { Id } from '../../../../convex/_generated/dataModel';

export const updateNotificationSettingsHandler = jest.fn().mockImplementation(
  async (ctx: any, args: {
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
  }) => {
    const existingSettings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
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
);
