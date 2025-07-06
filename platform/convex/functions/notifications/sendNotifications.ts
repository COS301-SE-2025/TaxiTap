import { v } from "convex/values";
import { mutation, internalMutation, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

// Extract the handler logic into separate functions for testing
export const sendNotificationHandler = async (
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    type: string;
    title: string;
    message: string;
    priority: string;
    metadata?: any;
    scheduledFor?: number;
    expiresAt?: number;
  }
) => {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const notification = await ctx.db.insert("notifications", {
    notificationId,
    userId: args.userId,
    type: args.type as any,
    title: args.title,
    message: args.message,
    isRead: false,
    isPush: false,
    priority: args.priority as any,
    metadata: args.metadata,
    scheduledFor: args.scheduledFor,
    expiresAt: args.expiresAt,
    createdAt: Date.now()
  });

  // Trigger push notification if user has tokens
  const userTokens = await ctx.db
    .query("pushTokens")
    .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  if (userTokens.length > 0) {
    // Mark as push notification sent
    await ctx.db.patch(notification, { isPush: true });
  }

  return notification;
};

// Public mutation for external calls
export const sendNotification = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    metadata: v.optional(v.any()),
    scheduledFor: v.optional(v.number()),
    expiresAt: v.optional(v.number())
  },
  handler: sendNotificationHandler
});

// Internal mutation for system-generated notifications
export const sendNotificationInternal = internalMutation({
  args: {
    userId: v.id("taxiTap_users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    metadata: v.optional(v.any()),
    scheduledFor: v.optional(v.number()),
    expiresAt: v.optional(v.number())
  },
  handler: sendNotificationHandler
});