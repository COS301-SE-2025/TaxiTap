import { MutationCtx } from '../../../../../convex/_generated/server';

export const updateHomeAddressHandler = jest.fn().mockImplementation(
  async (ctx: MutationCtx, args: any) => {
    // Mock implementation
    return {
      _id: args.userId,
      homeAddress: args.homeAddress,
      updatedAt: Date.now()
    };
  }
);
