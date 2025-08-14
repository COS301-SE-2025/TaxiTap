import { MutationCtx } from '../../../../convex/_generated/server';

export const registerPushTokenHandler = jest.fn().mockImplementation(
  async (ctx: MutationCtx, args: any) => {
    // Mock implementation
    return {
      _id: "push_token_id",
      userId: args.userId,
      token: args.token,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
);
