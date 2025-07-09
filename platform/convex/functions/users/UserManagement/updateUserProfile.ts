import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export async function updateUserProfileHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    name: string;
    phoneNumber: string;
    email: string;
    profilePicture?: string;
    emergencyContact?: {
      name: string;
      phoneNumber: string;
      relationship: string;
    };
  }
) {
  // Get the current user
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if phone number is already taken by another user
  if (args.phoneNumber !== user.phoneNumber) {
    const existingPhoneUser = await ctx.db
      .query("taxiTap_users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existingPhoneUser && existingPhoneUser._id !== args.userId) {
      throw new Error("Phone number is already registered to another account");
    }
  }

  // Check if email is already taken by another user
  if (args.email !== user.email) {
    const existingEmailUser = await ctx.db
      .query("taxiTap_users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingEmailUser && existingEmailUser._id !== args.userId) {
      throw new Error("Email is already registered to another account");
    }
  }

  // Prepare update data (excluding age and gender as requested)
  const updateData: any = {
    name: args.name,
    phoneNumber: args.phoneNumber,
    updatedAt: Date.now(),
  };

  // Add optional fields if provided
  if (args.profilePicture !== undefined) {
    updateData.profilePicture = args.profilePicture;
  }

  if (args.emergencyContact !== undefined) {
    updateData.emergencyContact = args.emergencyContact;
  }
  // Only update email if provided
if (args.email) {
    updateData.email = args.email;
}

  // Update the user
  await ctx.db.patch(args.userId, updateData);

  // Return the updated user data
  const updatedUser = await ctx.db.get(args.userId);
  return {
    id: updatedUser!._id,
    name: updatedUser!.name,
    phoneNumber: updatedUser!.phoneNumber,
    email: updatedUser!.email,
    profilePicture: updatedUser!.profilePicture,
    emergencyContact: updatedUser!.emergencyContact,
    updatedAt: updatedUser!.updatedAt,
  };
}

export const updateUserProfile = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    name: v.string(),
    phoneNumber: v.string(),
    email: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phoneNumber: v.string(),
      relationship: v.string(),
    })),
  },
  handler: updateUserProfileHandler,
});