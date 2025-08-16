import { MutationCtx } from '../../../../convex/_generated/server';

export const deactivatePushTokenHandler = jest.fn().mockImplementation(
  async (ctx: any, args: { token: string }) => {
    // Mock the database query
    const mockPushToken = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (mockPushToken) {
      // Mock the database patch operation
      return await ctx.db.patch(mockPushToken._id, {
        isActive: false,
        updatedAt: Date.now()
      });
    }

    return null;
  }
);

export const deactivatePushToken = {
  handler: deactivatePushTokenHandler,
};
