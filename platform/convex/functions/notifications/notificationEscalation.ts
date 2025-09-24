/**
 * notificationEscalation.ts
 *
 * Advanced notification escalation system for multi-leg journeys.
 * Handles notification priority escalation, retry mechanisms,
 * and intelligent notification routing based on user behavior.
 *
 * @author Git It Done
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// ESCALATION CONFIGURATION
// ============================================================================

const ESCALATION_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAYS: [30000, 120000, 300000], // 30s, 2min, 5min
  ESCALATION_THRESHOLDS: {
    low: 0,
    medium: 1,
    high: 2,
    urgent: 3
  },
  NOTIFICATION_TIMEOUTS: {
    low: 300000,    // 5 minutes
    medium: 180000, // 3 minutes
    high: 120000,   // 2 minutes
    urgent: 60000   // 1 minute
  }
};

// ============================================================================
// NOTIFICATION ESCALATION FUNCTIONS
// ============================================================================

/**
 * Handler function for escalating notification delivery
 */
export async function escalateNotificationDeliveryHandler(
  ctx: any,
  args: {
    notificationId: string;
    userId: Id<"taxiTap_users">;
    escalationLevel: number;
    reason: string;
  }
): Promise<any> {
  try {
    const { notificationId, userId, escalationLevel, reason } = args;

    // Get the original notification
    const notification = await ctx.db
      .query("notifications")
      .withIndex("by_notification_id", (q: any) => q.eq("notificationId", notificationId))
      .first();

    if (!notification) {
      return {
        success: false,
        error: "Notification not found"
      };
    }

    // Check if already escalated
    if (notification.escalationLevel >= escalationLevel) {
      return {
        success: false,
        error: "Notification already escalated to this level or higher"
      };
    }

    // Determine escalation strategy based on level
    let escalationStrategy: any = {};

    switch (escalationLevel) {
      case 1:
        // Retry with higher priority
        escalationStrategy = {
          priority: "high",
          retryCount: (notification.retryCount || 0) + 1,
          escalationLevel: 1,
          escalationReason: reason
        };
        break;

      case 2:
        // Send via multiple channels
        escalationStrategy = {
          priority: "urgent",
          retryCount: (notification.retryCount || 0) + 1,
          escalationLevel: 2,
          escalationReason: reason,
          multiChannel: true
        };
        break;

      case 3:
        // Contact customer service
        escalationStrategy = {
          priority: "urgent",
          retryCount: (notification.retryCount || 0) + 1,
          escalationLevel: 3,
          escalationReason: reason,
          multiChannel: true,
          customerServiceAlert: true
        };
        break;

      default:
        return {
          success: false,
          error: "Invalid escalation level"
        };
    }

    // Update notification with escalation
    await ctx.db.patch(notification._id, {
      ...escalationStrategy,
      lastEscalationAt: Date.now(),
      escalationHistory: [
        ...(notification.escalationHistory || []),
        {
          level: escalationLevel,
          timestamp: Date.now(),
          reason,
          strategy: escalationStrategy
        }
      ]
    });

    // Execute escalation actions
    const escalationResult = await executeEscalationActions(ctx, {
      notification,
      escalationLevel,
      escalationStrategy,
      userId
    });

    console.log(`📱 Escalated notification ${notificationId} to level ${escalationLevel}`);

    return {
      success: true,
      escalationLevel,
      escalationStrategy,
      result: escalationResult,
      message: `Notification escalated to level ${escalationLevel}`
    };

  } catch (error) {
    console.error("❌ Error escalating notification delivery:", error);
    return {
      success: false,
      error: `Failed to escalate notification: ${error}`
    };
  }
}

/**
 * Execute escalation actions based on level
 */
async function executeEscalationActions(
  ctx: any,
  args: {
    notification: any;
    escalationLevel: number;
    escalationStrategy: any;
    userId: Id<"taxiTap_users">;
  }
): Promise<any> {
  const { notification, escalationLevel, escalationStrategy, userId } = args;

  const actions = [];

  // Level 1: Retry with higher priority
  if (escalationLevel >= 1) {
    // Schedule retry
    const retryDelay = ESCALATION_CONFIG.RETRY_DELAYS[Math.min(escalationLevel - 1, ESCALATION_CONFIG.RETRY_DELAYS.length - 1)];
    
    await ctx.scheduler.runAfter(retryDelay, internal.functions.notifications.notificationEscalation.retryNotificationDelivery, {
      notificationId: notification.notificationId,
      userId,
      attemptNumber: escalationStrategy.retryCount
    });

    actions.push("scheduled_retry");
  }

  // Level 2: Multi-channel delivery
  if (escalationLevel >= 2 && escalationStrategy.multiChannel) {
    // Send via SMS if available
    const user = await ctx.db.get(userId);
    if (user?.phoneNumber) {
      await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
        userId,
        type: "sms_escalation",
        title: notification.title,
        message: `[URGENT] ${notification.message}`,
        priority: "urgent",
        metadata: {
          ...notification.metadata,
          escalationLevel,
          originalNotificationId: notification.notificationId
        },
        scheduledFor: null,
        expiresAt: null
      });
      actions.push("sms_sent");
    }

    // Send via email if available
    if (user?.email) {
      await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
        userId,
        type: "email_escalation",
        title: notification.title,
        message: `[URGENT] ${notification.message}`,
        priority: "urgent",
        metadata: {
          ...notification.metadata,
          escalationLevel,
          originalNotificationId: notification.notificationId
        },
        scheduledFor: null,
        expiresAt: null
      });
      actions.push("email_sent");
    }
  }

  // Level 3: Customer service alert
  if (escalationLevel >= 3 && escalationStrategy.customerServiceAlert) {
    await ctx.db.insert("internalAlerts", {
      alertId: `notification_escalation_${notification.notificationId}_${Date.now()}`,
      type: "notification_escalation",
      priority: "high",
      userId,
      notificationId: notification.notificationId,
      escalationLevel,
      reason: escalationStrategy.escalationReason,
      status: "open",
      metadata: {
        originalNotification: notification,
        escalationStrategy
      },
      createdAt: Date.now(),
      assignedTo: null
    });
    actions.push("customer_service_alerted");
  }

  return {
    actions,
    escalationLevel,
    timestamp: Date.now()
  };
}

/**
 * Escalate notification delivery
 */
export const escalateNotificationDelivery = mutation({
  args: {
    notificationId: v.string(),
    userId: v.id("taxiTap_users"),
    escalationLevel: v.number(),
    reason: v.string()
  },
  handler: escalateNotificationDeliveryHandler
});

// ============================================================================
// RETRY MECHANISMS
// ============================================================================

/**
 * Retry notification delivery with exponential backoff
 */
export const retryNotificationDelivery = internalMutation({
  args: {
    notificationId: v.string(),
    userId: v.id("taxiTap_users"),
    attemptNumber: v.number()
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const { notificationId, userId, attemptNumber } = args;

      // Get the notification
      const notification = await ctx.db
        .query("notifications")
        .withIndex("by_notification_id", (q: any) => q.eq("notificationId", notificationId))
        .first();

      if (!notification) {
        console.log(`❌ Notification ${notificationId} not found for retry`);
        return { success: false, error: "Notification not found" };
      }

      // Check if max retries reached
      if (attemptNumber >= ESCALATION_CONFIG.MAX_RETRY_ATTEMPTS) {
        console.log(`❌ Max retry attempts reached for notification ${notificationId}`);
        
        // Mark notification as failed and escalate
        await ctx.db.patch(notification._id, {
          failedAt: Date.now(),
          escalationLevel: 3,
          escalationHistory: [
            ...(notification.escalationHistory || []),
            {
              level: 3,
              timestamp: Date.now(),
              reason: "Max retry attempts reached",
              action: "marked_as_failed"
            }
          ]
        });

        return { success: false, error: "Max retry attempts reached" };
      }

      // Check if notification was already read
      if (notification.isRead) {
        console.log(`✅ Notification ${notificationId} was read, no retry needed`);
        return { success: true, message: "Notification already read" };
      }

      // Update retry count
      await ctx.db.patch(notification._id, {
        retryCount: attemptNumber,
        lastRetryAt: Date.now()
      });

      // Attempt to deliver via push notification
      const pushResult = await attemptPushNotificationDelivery(ctx, {
        notification,
        userId,
        attemptNumber
      });

      if (pushResult.success) {
        console.log(`✅ Notification ${notificationId} delivered successfully on attempt ${attemptNumber}`);
        return { success: true, message: "Notification delivered successfully" };
      }

      // If push failed, schedule next retry
      const nextRetryDelay = ESCALATION_CONFIG.RETRY_DELAYS[Math.min(attemptNumber, ESCALATION_CONFIG.RETRY_DELAYS.length - 1)];
      
      await ctx.scheduler.runAfter(nextRetryDelay, internal.functions.notifications.notificationEscalation.retryNotificationDelivery, {
        notificationId,
        userId,
        attemptNumber: attemptNumber + 1
      });

      console.log(`⏰ Scheduled retry ${attemptNumber + 1} for notification ${notificationId} in ${nextRetryDelay}ms`);

      return {
        success: false,
        message: `Push delivery failed, scheduled retry ${attemptNumber + 1}`,
        nextRetryIn: nextRetryDelay
      };

    } catch (error) {
      console.error("❌ Error in retry notification delivery:", error);
      return { success: false, error: `Retry failed: ${error}` };
    }
  }
});

/**
 * Attempt push notification delivery
 */
async function attemptPushNotificationDelivery(
  ctx: any,
  args: {
    notification: any;
    userId: Id<"taxiTap_users">;
    attemptNumber: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { notification, userId, attemptNumber } = args;

    // Get user's push tokens
    const pushTokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    if (pushTokens.length === 0) {
      return {
        success: false,
        error: "No active push tokens found"
      };
    }

    // Simulate push notification delivery
    // In a real implementation, this would call a push notification service
    const deliverySuccess = Math.random() > 0.3; // 70% success rate for simulation

    if (deliverySuccess) {
      // Mark notification as delivered
      await ctx.db.patch(notification._id, {
        deliveredAt: Date.now(),
        deliveryAttempts: (notification.deliveryAttempts || 0) + 1,
        lastDeliveryAttempt: Date.now()
      });

      return { success: true };
    } else {
      return {
        success: false,
        error: "Push notification service unavailable"
      };
    }

  } catch (error) {
    console.error("❌ Error in push notification delivery:", error);
    return { success: false, error: `Push delivery failed: ${error}` };
  }
}

// ============================================================================
// INTELLIGENT NOTIFICATION ROUTING
// ============================================================================

/**
 * Route notification based on user behavior and preferences
 */
export const routeNotificationIntelligently = mutation({
  args: {
    notificationId: v.string(),
    userId: v.id("taxiTap_users"),
    routingStrategy: v.optional(v.string())
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const { notificationId, userId, routingStrategy } = args;

      // Get notification
      const notification = await ctx.db
        .query("notifications")
        .withIndex("by_notification_id", (q: any) => q.eq("notificationId", notificationId))
        .first();

      if (!notification) {
        return { success: false, error: "Notification not found" };
      }

      // Get user behavior data
      const userBehavior = await analyzeUserBehavior(ctx, userId);
      
      // Get user preferences
      const preferences = await getUserNotificationPreferences(ctx, userId);

      // Determine optimal routing strategy
      const optimalStrategy = determineOptimalRoutingStrategy({
        notification,
        userBehavior,
        preferences,
        routingStrategy
      });

      // Execute routing strategy
      const routingResult = await executeRoutingStrategy(ctx, {
        notification,
        userId,
        strategy: optimalStrategy
      });

      console.log(`📱 Routed notification ${notificationId} using strategy: ${optimalStrategy.type}`);

      return {
        success: true,
        strategy: optimalStrategy,
        result: routingResult,
        message: "Notification routed successfully"
      };

    } catch (error) {
      console.error("❌ Error routing notification intelligently:", error);
      return {
        success: false,
        error: `Failed to route notification: ${error}`
      };
    }
  }
});

/**
 * Analyze user behavior for notification routing
 */
async function analyzeUserBehavior(
  ctx: any,
  userId: Id<"taxiTap_users">
): Promise<{
  responseRate: number;
  preferredChannels: string[];
  activeHours: { start: number; end: number };
  notificationFrequency: number;
  escalationTolerance: number;
}> {
  try {
    // Get user's notification history
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gt(q.field("createdAt"), Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      .collect();

    // Calculate response rate
    const totalNotifications = notifications.length;
    const readNotifications = notifications.filter((n: any) => n.isRead).length;
    const responseRate = totalNotifications > 0 ? readNotifications / totalNotifications : 0;

    // Analyze preferred channels
    const channelCounts: Record<string, number> = {};
    notifications.forEach((n: any) => {
      channelCounts[n.type] = (channelCounts[n.type] || 0) + 1;
    });
    const preferredChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([channel]) => channel);

    // Analyze active hours
    const hourCounts: number[] = new Array(24).fill(0);
    notifications.forEach((n: any) => {
      const hour = new Date(n.createdAt).getHours();
      hourCounts[hour]++;
    });
    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    const activeHours = {
      start: Math.max(0, maxHour - 2),
      end: Math.min(23, maxHour + 2)
    };

    // Calculate notification frequency (per day)
    const notificationFrequency = totalNotifications / 30;

    // Calculate escalation tolerance (how often user escalates)
    const escalatedNotifications = notifications.filter((n: any) => n.escalationLevel > 0).length;
    const escalationTolerance = totalNotifications > 0 ? escalatedNotifications / totalNotifications : 0;

    return {
      responseRate,
      preferredChannels,
      activeHours,
      notificationFrequency,
      escalationTolerance
    };

  } catch (error) {
    console.error("❌ Error analyzing user behavior:", error);
    return {
      responseRate: 0.5,
      preferredChannels: ["push"],
      activeHours: { start: 8, end: 20 },
      notificationFrequency: 5,
      escalationTolerance: 0.1
    };
  }
}

/**
 * Get user notification preferences
 */
async function getUserNotificationPreferences(
  ctx: any,
  userId: Id<"taxiTap_users">
): Promise<any> {
  try {
    const preferences = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .first();

    return preferences?.journeyPreferences || {
      journeyProgress: true,
      transferAlerts: true,
      delayNotifications: true,
      routeSuggestions: true,
      pushEnabled: true,
      quietHours: { enabled: false, start: "22:00", end: "07:00" }
    };

  } catch (error) {
    console.error("❌ Error getting user preferences:", error);
    return {
      journeyProgress: true,
      transferAlerts: true,
      delayNotifications: true,
      routeSuggestions: true,
      pushEnabled: true,
      quietHours: { enabled: false, start: "22:00", end: "07:00" }
    };
  }
}

/**
 * Determine optimal routing strategy
 */
function determineOptimalRoutingStrategy(args: {
  notification: any;
  userBehavior: any;
  preferences: any;
  routingStrategy?: string;
}): {
  type: string;
  channels: string[];
  timing: any;
  priority: string;
} {
  const { notification, userBehavior, preferences, routingStrategy } = args;

  // If specific strategy provided, use it
  if (routingStrategy) {
    return {
      type: routingStrategy,
      channels: ["push"],
      timing: { immediate: true },
      priority: notification.priority
    };
  }

  // Determine based on notification priority and user behavior
  let strategy: any = {};

  if (notification.priority === "urgent") {
    strategy = {
      type: "immediate_multi_channel",
      channels: ["push", "sms"],
      timing: { immediate: true },
      priority: "urgent"
    };
  } else if (notification.priority === "high") {
    if (userBehavior.responseRate < 0.3) {
      strategy = {
        type: "escalated_delivery",
        channels: ["push", "sms"],
        timing: { immediate: true, retryAfter: 60000 },
        priority: "high"
      };
    } else {
      strategy = {
        type: "standard_delivery",
        channels: ["push"],
        timing: { immediate: true },
        priority: "high"
      };
    }
  } else {
    // Check if within active hours
    const currentHour = new Date().getHours();
    const isActiveHours = currentHour >= userBehavior.activeHours.start && 
                         currentHour <= userBehavior.activeHours.end;

    if (isActiveHours) {
      strategy = {
        type: "standard_delivery",
        channels: ["push"],
        timing: { immediate: true },
        priority: notification.priority
      };
    } else {
      strategy = {
        type: "scheduled_delivery",
        channels: ["push"],
        timing: { 
          immediate: false, 
          scheduledFor: getNextActiveHour(userBehavior.activeHours.start)
        },
        priority: notification.priority
      };
    }
  }

  // Apply user preferences
  if (!preferences.pushEnabled) {
    strategy.channels = strategy.channels.filter((c: string) => c !== "push");
  }

  if (preferences.quietHours?.enabled) {
    const currentTime = new Date().toTimeString().slice(0, 5);
    if (isWithinQuietHours(currentTime, preferences.quietHours)) {
      strategy.timing.immediate = false;
      strategy.timing.scheduledFor = getEndOfQuietHours(preferences.quietHours.end);
    }
  }

  return strategy;
}

/**
 * Execute routing strategy
 */
async function executeRoutingStrategy(
  ctx: any,
  args: {
    notification: any;
    userId: Id<"taxiTap_users">;
    strategy: any;
  }
): Promise<any> {
  const { notification, userId, strategy } = args;

  const results = [];

  // Execute based on strategy type
  switch (strategy.type) {
    case "immediate_multi_channel":
      for (const channel of strategy.channels) {
        const result = await deliverViaChannel(ctx, {
          notification,
          userId,
          channel
        });
        results.push({ channel, result });
      }
      break;

    case "escalated_delivery":
      // Deliver immediately
      const immediateResult = await deliverViaChannel(ctx, {
        notification,
        userId,
        channel: strategy.channels[0]
      });
      results.push({ channel: strategy.channels[0], result: immediateResult });

      // Schedule retry if needed
      if (strategy.timing.retryAfter) {
        await ctx.scheduler.runAfter(strategy.timing.retryAfter, internal.functions.notifications.notificationEscalation.retryNotificationDelivery, {
          userId,
          notificationId: notification.notificationId,
          attemptNumber: 1
        });
      }
      break;

    case "scheduled_delivery":
      // Schedule for later delivery
      await ctx.scheduler.runAt(strategy.timing.scheduledFor, internal.functions.notifications.notificationEscalation.deliverScheduledNotification, {
        notificationId: notification.notificationId,
        userId
      });
      results.push({ channel: "scheduled", result: { success: true, scheduled: true } });
      break;

    default:
      // Standard delivery
      const standardResult = await deliverViaChannel(ctx, {
        notification,
        userId,
        channel: strategy.channels[0]
      });
      results.push({ channel: strategy.channels[0], result: standardResult });
  }

  return {
    strategy: strategy.type,
    results,
    timestamp: Date.now()
  };
}

/**
 * Deliver notification via specific channel
 */
async function deliverViaChannel(
  ctx: any,
  args: {
    notification: any;
    userId: Id<"taxiTap_users">;
    channel: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const { notification, userId, channel } = args;

  try {
    switch (channel) {
      case "push":
        return await attemptPushNotificationDelivery(ctx, {
          notification,
          userId,
          attemptNumber: 1
        });

      case "sms":
        // Implement SMS delivery
        return { success: true };

      case "email":
        // Implement email delivery
        return { success: true };

      default:
        return { success: false, error: "Unknown channel" };
    }
  } catch (error) {
    return { success: false, error: `Channel delivery failed: ${error}` };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get next active hour timestamp
 */
function getNextActiveHour(hour: number): number {
  const now = new Date();
  const nextActive = new Date(now);
  nextActive.setHours(hour, 0, 0, 0);
  
  if (nextActive <= now) {
    nextActive.setDate(nextActive.getDate() + 1);
  }
  
  return nextActive.getTime();
}

/**
 * Check if current time is within quiet hours
 */
function isWithinQuietHours(currentTime: string, quietHours: { start: string; end: string }): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(quietHours.start);
  const end = timeToMinutes(quietHours.end);
  
  if (start <= end) {
    return current >= start && current <= end;
  } else {
    // Quiet hours span midnight
    return current >= start || current <= end;
  }
}

/**
 * Get end of quiet hours timestamp
 */
function getEndOfQuietHours(endTime: string): number {
  const now = new Date();
  const end = new Date(now);
  const [hours, minutes] = endTime.split(':').map(Number);
  end.setHours(hours, minutes, 0, 0);
  
  if (end <= now) {
    end.setDate(end.getDate() + 1);
  }
  
  return end.getTime();
}

/**
 * Convert time string to minutes
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Deliver scheduled notification
 */
export const deliverScheduledNotification = internalMutation({
  args: {
    notificationId: v.string(),
    userId: v.id("taxiTap_users")
  },
  handler: async (ctx, args) => {
    try {
      const { notificationId, userId } = args;

      // Get notification
      const notification = await ctx.db
        .query("notifications")
        .withIndex("by_notification_id", (q: any) => q.eq("notificationId", notificationId))
        .first();

      if (!notification) {
        console.log(`❌ Scheduled notification ${notificationId} not found`);
        return { success: false, error: "Notification not found" };
      }

      // Check if already read
      if (notification.isRead) {
        console.log(`✅ Scheduled notification ${notificationId} already read`);
        return { success: true, message: "Notification already read" };
      }

      // Deliver the notification
      const result = await attemptPushNotificationDelivery(ctx, {
        notification,
        userId,
        attemptNumber: 1
      });

      console.log(`📱 Delivered scheduled notification ${notificationId}: ${result.success ? 'success' : 'failed'}`);

      return result;

    } catch (error) {
      console.error("❌ Error delivering scheduled notification:", error);
      return { success: false, error: `Scheduled delivery failed: ${error}` };
    }
  }
});

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get notification delivery status
 */
export const getNotificationDeliveryStatus = query({
  args: {
    notificationId: v.string(),
    userId: v.id("taxiTap_users")
  },
  handler: async (ctx, args) => {
    try {
      const notification = await ctx.db
        .query("notifications")
        .withIndex("by_notification_id", (q: any) => q.eq("notificationId", args.notificationId))
        .first();

      if (!notification) {
        return {
          success: false,
          error: "Notification not found"
        };
      }

      return {
        success: true,
        status: {
          notificationId: args.notificationId,
          isRead: notification.isRead,
          isDelivered: !!notification.deliveredAt,
          retryCount: notification.retryCount || 0,
          escalationLevel: notification.escalationLevel || 0,
          lastRetryAt: notification.lastRetryAt,
          lastEscalationAt: notification.lastEscalationAt,
          createdAt: notification.createdAt,
          readAt: notification.readAt
        }
      };

    } catch (error) {
      console.error("❌ Error getting notification delivery status:", error);
      return {
        success: false,
        error: `Failed to get delivery status: ${error}`
      };
    }
  }
});

/**
 * Get escalation statistics for a user
 */
export const getEscalationStatistics = query({
  args: {
    userId: v.id("taxiTap_users"),
    timeRange: v.optional(v.number()) // days
  },
  handler: async (ctx, args) => {
    try {
      const timeRange = args.timeRange || 30; // Default 30 days
      const cutoffTime = Date.now() - (timeRange * 24 * 60 * 60 * 1000);

      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
        .filter((q: any) => q.gt(q.field("createdAt"), cutoffTime))
        .collect();

      const stats = {
        totalNotifications: notifications.length,
        escalatedNotifications: notifications.filter((n: any) => (n.escalationLevel || 0) > 0).length,
        averageEscalationLevel: 0,
        retryRate: 0,
        deliverySuccessRate: 0,
        escalationReasons: {} as Record<string, number>
      };

      if (notifications.length > 0) {
        // Calculate average escalation level
        const totalEscalationLevel = notifications.reduce((sum, n: any) => sum + (n.escalationLevel || 0), 0);
        stats.averageEscalationLevel = totalEscalationLevel / notifications.length;

        // Calculate retry rate
        const retriedNotifications = notifications.filter((n: any) => (n.retryCount || 0) > 0).length;
        stats.retryRate = retriedNotifications / notifications.length;

        // Calculate delivery success rate
        const deliveredNotifications = notifications.filter((n: any) => n.deliveredAt).length;
        stats.deliverySuccessRate = deliveredNotifications / notifications.length;

        // Count escalation reasons
        notifications.forEach((n: any) => {
          if (n.escalationHistory) {
            n.escalationHistory.forEach((escalation: any) => {
              const reason = escalation.reason || "unknown";
              stats.escalationReasons[reason] = (stats.escalationReasons[reason] || 0) + 1;
            });
          }
        });
      }

      return {
        success: true,
        stats,
        timeRange
      };

    } catch (error) {
      console.error("❌ Error getting escalation statistics:", error);
      return {
        success: false,
        error: `Failed to get escalation statistics: ${error}`
      };
    }
  }
});
