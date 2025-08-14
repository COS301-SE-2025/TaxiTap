import { MutationCtx } from '../../../../convex/_generated/server';

export const sendNotificationHandler = jest.fn().mockImplementation(
  async (ctx: MutationCtx, args: any) => {
    // Mock implementation
    return {
      _id: "notification_id",
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      isRead: false,
      createdAt: Date.now()
    };
  }
);
