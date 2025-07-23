import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export async function updateWorkAddressHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    workAddress: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      nickname?: string;
    } | null;
  }
) {
  // Get the current user
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Prepare update data
  const updateData: any = {
    workAddress: args.workAddress,
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
    workAddress: updatedUser!.workAddress,
    updatedAt: updatedUser!.updatedAt,
  };
}

export const updateWorkAddress = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    workAddress: v.union(
      v.object({
        address: v.string(),
        coordinates: v.object({
          latitude: v.number(),
          longitude: v.number(),
        }),
        nickname: v.optional(v.string()),
      }),
      v.null()
    ),
  },
  handler: updateWorkAddressHandler,
});