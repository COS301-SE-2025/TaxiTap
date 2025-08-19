import { MutationCtx } from '../../../../convex/_generated/server';

export const sendRideNotificationHandler = jest.fn().mockImplementation(
  async (ctx: MutationCtx, args: any) => {
    // Mock implementation
    return {
      _id: "ride_notification_id",
      rideId: args.rideId,
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: "ride",
      isRead: false,
      createdAt: Date.now()
    };
  }
);
