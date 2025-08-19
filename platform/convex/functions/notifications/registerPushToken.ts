import { v } from "convex/values";
import { mutation, internalMutation, MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// Extract the handler logic for testing
export const registerPushTokenHandler = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    token: string;
    platform: "ios" | "android";
  }
) => {
  // Check if token already exists
  const existingToken = await ctx.db
    .query("pushTokens")
    .withIndex("by_token", (q) => q.eq("token", args.token))
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
};

// Update your mutation to use the handler
export const registerPushToken = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"))
  },
  handler: registerPushTokenHandler
});

// Send push token registration notification (if you have this functionality)
export const sendTokenRegistrationNotification = internalMutation({
  args: {
    userId: v.id("taxiTap_users"),
    message: v.string()
  },
  handler: async (ctx, args) => {
    // If you're calling sendNotificationInternal somewhere in this file, 
    // make sure to include the required fields:
    await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
      userId: args.userId,
      type: "token_registered",
      title: "Push Notifications Enabled",
      message: args.message,
      priority: "low",
      metadata: { registeredAt: Date.now() },
      scheduledFor: null,
      expiresAt: null
    });
  }
});