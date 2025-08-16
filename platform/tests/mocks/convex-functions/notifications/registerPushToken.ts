import { MutationCtx } from '../../../../convex/_generated/server';
import { Id } from '../../../../convex/_generated/dataModel';

export const registerPushTokenHandler = jest.fn().mockImplementation(
  async (ctx: any, args: {
    userId: Id<"taxiTap_users">;
    token: string;
    platform: "ios" | "android";
  }) => {
    // Check if token already exists
    const existingToken = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (existingToken) {
      // Update existing token
      return await ctx.db.patch(existingToken._id, {
        userId: args.userId,
        isActive: true,
        updatedAt: Date.now(),
        lastUsedAt: Date.now()
      });
    }

    // Create new token
    return await ctx.db.insert("pushTokens", {
      userId: args.userId,
      token: args.token,
      platform: args.platform,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastUsedAt: Date.now()
    });
  }
);
