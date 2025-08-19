import { MutationCtx } from '../../../../../convex/_generated/server';
import { Id } from '../../../../../convex/_generated/dataModel';

export const updateHomeAddressHandler = jest.fn().mockImplementation(
  async (ctx: any, args: {
    userId: Id<"taxiTap_users">;
    homeAddress: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      nickname?: string;
    } | null;
  }) => {
    // Get the current user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Prepare update data
    const updateData: any = {
      homeAddress: args.homeAddress,
      updatedAt: Date.now(),
    };

    // Update the user
    await ctx.db.patch(args.userId, updateData);

    // Return the updated user data
    const updatedUser = await ctx.db.get(args.userId);
    return {
      id: updatedUser!._id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      homeAddress: updatedUser!.homeAddress,
      updatedAt: updatedUser!.updatedAt,
    };
  }
);
