import { MutationCtx } from '../../../../convex/_generated/server';

export const updateNotificationSettingsHandler = jest.fn().mockImplementation(
  async (ctx: MutationCtx, args: any) => {
    // Mock implementation
    return {
      _id: "notification_settings_id",
      userId: args.userId,
      pushNotifications: args.pushNotifications,
      emailNotifications: args.emailNotifications,
      smsNotifications: args.smsNotifications,
      updatedAt: Date.now()
    };
  }
);
