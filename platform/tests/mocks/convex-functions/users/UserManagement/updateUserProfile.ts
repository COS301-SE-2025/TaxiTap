import { MutationCtx } from '../../../../../convex/_generated/server';

export const updateUserProfileHandler = jest.fn().mockImplementation(
  async (ctx: MutationCtx, args: any) => {
    // Mock implementation
    return {
      _id: args.userId,
      name: args.name || "Updated User",
      role: args.role || "driver",
      accountType: args.accountType || "driver",
      phoneNumber: args.phoneNumber || "+27123456789",
      updatedAt: Date.now()
    };
  }
);
