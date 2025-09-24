/**
 * journeyNotifications.ts
 *
 * Enhanced notification system for multi-leg journeys.
 * Handles journey progress notifications, transfer window alerts,
 * delay and issue notifications, and alternative route suggestions.
 *
 * @author Git It Done
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// JOURNEY PROGRESS NOTIFICATIONS
// ============================================================================

/**
 * Handler function for sending journey progress notifications
 */
export async function sendJourneyProgressNotificationHandler(
  ctx: any,
  args: {
    journeyId: string;
    passengerId: Id<"taxiTap_users">;
    progressType: string;
    legIndex: number;
    totalLegs: number;
    metadata?: any;
  }
): Promise<any> {
  try {
    const { journeyId, passengerId, progressType, legIndex, totalLegs, metadata } = args;

    let title: string;
    let message: string;
    let priority: "low" | "medium" | "high" | "urgent";
    let notificationType: string;

    switch (progressType) {
      case "journey_started":
        title = "Multi-Leg Journey Started";
        message = `Your ${totalLegs}-leg journey has begun! Leg 1 of ${totalLegs} is now active.`;
        priority = "high";
        notificationType = "journey_started";
        break;

      case "leg_completed":
        title = "Journey Leg Completed";
        message = `Leg ${legIndex + 1} of ${totalLegs} completed successfully. ${legIndex + 1 < totalLegs ? 'Preparing next leg...' : 'Journey complete!'}`;
        priority = "medium";
        notificationType = "journey_leg_completed";
        break;

      case "next_leg_ready":
        title = "Next Taxi Ready";
        message = `Your next taxi for leg ${legIndex + 2} of ${totalLegs} is ready for pickup.`;
        priority = "high";
        notificationType = "next_leg_ready";
        break;

      case "transfer_approaching":
        title = "Approaching Transfer Point";
        message = `You'll reach your transfer point in ${metadata?.eta || 'a few minutes'}. Next leg preparation starting...`;
        priority = "high";
        notificationType = "transfer_approaching";
        break;

      case "transfer_arrived":
        title = "Transfer Point Reached";
        message = `You've arrived at the transfer point. ${legIndex + 1 < totalLegs ? 'Please wait for your next taxi.' : 'Journey completed!'}`;
        priority = "urgent";
        notificationType = "transfer_arrived";
        break;

      case "journey_completed":
        title = "Journey Completed!";
        message = `Your ${totalLegs}-leg journey is complete! Total time: ${metadata?.totalDuration || 'N/A'}, Total cost: R${metadata?.totalCost || 'N/A'}`;
        priority = "medium";
        notificationType = "journey_completed";
        break;

      case "journey_paused":
        title = "Journey Paused";
        message = `Your journey has been paused. ${metadata?.reason || 'Please contact support if this was unexpected.'}`;
        priority = "high";
        notificationType = "journey_paused";
        break;

      case "journey_cancelled":
        title = "Journey Cancelled";
        message = `Your journey has been cancelled. ${metadata?.reason || 'Refunds will be processed automatically.'}`;
        priority = "urgent";
        notificationType = "journey_cancelled";
        break;

      default:
        title = "Journey Update";
        message = `Your journey status has been updated.`;
        priority = "medium";
        notificationType = "journey_update";
    }

    // Create the notification
    const notificationId = `journey_${progressType}_${journeyId}_${Date.now()}`;
    
    await ctx.db.insert("notifications", {
      notificationId,
      userId: passengerId,
      type: notificationType as any,
      title,
      message,
      isRead: false,
      isPush: true,
      priority: priority as any,
      metadata: {
        journeyId,
        legIndex,
        totalLegs,
        progressType,
        ...metadata
      },
      createdAt: Date.now()
    });

    console.log(`📱 Sent journey progress notification: ${progressType} for journey ${journeyId}`);

    return {
      success: true,
      notificationId,
      message: "Journey progress notification sent successfully"
    };

  } catch (error) {
    console.error("❌ Error sending journey progress notification:", error);
    return {
      success: false,
      error: `Failed to send journey progress notification: ${error}`
    };
  }
}

/**
 * Send journey progress notification
 */
export const sendJourneyProgressNotification = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    progressType: v.union(
      v.literal("journey_started"),
      v.literal("leg_completed"),
      v.literal("next_leg_ready"),
      v.literal("transfer_approaching"),
      v.literal("transfer_arrived"),
      v.literal("journey_completed"),
      v.literal("journey_paused"),
      v.literal("journey_cancelled")
    ),
    legIndex: v.number(),
    totalLegs: v.number(),
    metadata: v.optional(v.any())
  },
  handler: sendJourneyProgressNotificationHandler
});

// ============================================================================
// TRANSFER WINDOW ALERTS
// ============================================================================

/**
 * Handler function for transfer window alerts
 */
export async function sendTransferWindowAlertHandler(
  ctx: any,
  args: {
    journeyId: string;
    passengerId: Id<"taxiTap_users">;
    alertType: string;
    legIndex: number;
    transferPoint: any;
    metadata?: any;
  }
): Promise<any> {
  try {
    const { journeyId, passengerId, alertType, legIndex, transferPoint, metadata } = args;

    let title: string;
    let message: string;
    let priority: "low" | "medium" | "high" | "urgent";
    let notificationType: string;

    switch (alertType) {
      case "window_starting":
        title = "Transfer Window Opening";
        message = `Transfer window is opening in ${metadata?.minutes || 5} minutes. Please prepare for transfer.`;
        priority = "high";
        notificationType = "transfer_window_starting";
        break;

      case "window_active":
        title = "Transfer Window Active";
        message = `Transfer window is now active. You have ${metadata?.remainingMinutes || 15} minutes to complete your transfer.`;
        priority = "urgent";
        notificationType = "transfer_window_active";
        break;

      case "window_extended":
        title = "Transfer Window Extended";
        message = `Your transfer window has been extended by ${metadata?.extensionMinutes || 10} minutes due to delays.`;
        priority = "medium";
        notificationType = "transfer_window_extended";
        break;

      case "window_expiring":
        title = "Transfer Window Expiring Soon";
        message = `Your transfer window expires in ${metadata?.remainingMinutes || 5} minutes. Please complete your transfer or request assistance.`;
        priority = "urgent";
        notificationType = "transfer_window_expiring";
        break;

      case "window_expired":
        title = "Transfer Window Expired";
        message = `Your transfer window has expired. Please contact customer service for assistance.`;
        priority = "urgent";
        notificationType = "transfer_window_expired";
        break;

      case "assistance_requested":
        title = "Transfer Assistance Requested";
        message = `Assistance has been requested for your transfer. Customer service will contact you shortly.`;
        priority = "high";
        notificationType = "transfer_assistance_requested";
        break;

      default:
        title = "Transfer Window Update";
        message = `Your transfer window status has been updated.`;
        priority = "medium";
        notificationType = "transfer_window_update";
    }

    // Create the notification
    const notificationId = `transfer_${alertType}_${journeyId}_${legIndex}_${Date.now()}`;
    
    await ctx.db.insert("notifications", {
      notificationId,
      userId: passengerId,
      type: notificationType as any,
      title,
      message,
      isRead: false,
      isPush: true,
      priority: priority as any,
      metadata: {
        journeyId,
        legIndex,
        transferPoint,
        alertType,
        ...metadata
      },
      createdAt: Date.now()
    });

    console.log(`📱 Sent transfer window alert: ${alertType} for journey ${journeyId}, leg ${legIndex}`);

    return {
      success: true,
      notificationId,
      message: "Transfer window alert sent successfully"
    };

  } catch (error) {
    console.error("❌ Error sending transfer window alert:", error);
    return {
      success: false,
      error: `Failed to send transfer window alert: ${error}`
    };
  }
}

/**
 * Send transfer window alert
 */
export const sendTransferWindowAlert = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    alertType: v.union(
      v.literal("window_starting"),
      v.literal("window_active"),
      v.literal("window_extended"),
      v.literal("window_expiring"),
      v.literal("window_expired"),
      v.literal("assistance_requested")
    ),
    legIndex: v.number(),
    transferPoint: v.any(),
    metadata: v.optional(v.any())
  },
  handler: sendTransferWindowAlertHandler
});

// ============================================================================
// DELAY AND ISSUE NOTIFICATIONS
// ============================================================================

/**
 * Handler function for delay and issue notifications
 */
export async function sendDelayIssueNotificationHandler(
  ctx: any,
  args: {
    journeyId: string;
    passengerId: Id<"taxiTap_users">;
    issueType: string;
    legIndex: number;
    severity: "low" | "medium" | "high" | "critical";
    metadata?: any;
  }
): Promise<any> {
  try {
    const { journeyId, passengerId, issueType, legIndex, severity, metadata } = args;

    let title: string;
    let message: string;
    let priority: "low" | "medium" | "high" | "urgent";
    let notificationType: string;

    switch (issueType) {
      case "taxi_delay":
        title = "Taxi Running Late";
        message = `Your taxi for leg ${legIndex + 1} is running ${metadata?.delayMinutes || 5} minutes late. Estimated arrival: ${metadata?.newETA || 'soon'}`;
        priority = severity === "critical" ? "urgent" : "high";
        notificationType = "taxi_delay";
        break;

      case "no_taxi_available":
        title = "No Taxi Available";
        message = `No taxis are currently available for leg ${legIndex + 1}. We're searching with expanded radius and will notify you shortly.`;
        priority = "urgent";
        notificationType = "no_taxi_available";
        break;

      case "route_closure":
        title = "Route Closure Detected";
        message = `Your planned route has been affected by a closure. We're finding alternative routes and will update you shortly.`;
        priority = "high";
        notificationType = "route_closure";
        break;

      case "weather_delay":
        title = "Weather Delay";
        message = `Your journey may be delayed due to weather conditions. Please allow extra time for your trip.`;
        priority = "medium";
        notificationType = "weather_delay";
        break;

      case "traffic_delay":
        title = "Traffic Delay";
        message = `Heavy traffic is affecting your route. Estimated delay: ${metadata?.delayMinutes || 10} minutes.`;
        priority = "medium";
        notificationType = "traffic_delay";
        break;

      case "payment_issue":
        title = "Payment Issue";
        message = `There's an issue with your payment for leg ${legIndex + 1}. Please check your payment method or contact support.`;
        priority = "high";
        notificationType = "payment_issue";
        break;

      case "driver_issue":
        title = "Driver Issue";
        message = `There's an issue with your current driver. We're arranging a replacement and will update you shortly.`;
        priority = "urgent";
        notificationType = "driver_issue";
        break;

      case "system_error":
        title = "System Issue";
        message = `We're experiencing a technical issue that may affect your journey. Our team is working to resolve it.`;
        priority = severity === "critical" ? "urgent" : "high";
        notificationType = "system_error";
        break;

      default:
        title = "Journey Issue";
        message = `An issue has been detected with your journey. We're working to resolve it.`;
        priority = "high";
        notificationType = "journey_issue";
    }

    // Create the notification
    const notificationId = `issue_${issueType}_${journeyId}_${legIndex}_${Date.now()}`;
    
    await ctx.db.insert("notifications", {
      notificationId,
      userId: passengerId,
      type: notificationType as any,
      title,
      message,
      isRead: false,
      isPush: true,
      priority: priority as any,
      metadata: {
        journeyId,
        legIndex,
        issueType,
        severity,
        ...metadata
      },
      createdAt: Date.now()
    });

    // If it's a critical issue, also send an internal alert
    if (severity === "critical") {
      await sendInternalAlert(ctx, {
        journeyId,
        issueType,
        severity,
        passengerId,
        metadata
      });
    }

    console.log(`📱 Sent delay/issue notification: ${issueType} (${severity}) for journey ${journeyId}`);

    return {
      success: true,
      notificationId,
      message: "Delay/issue notification sent successfully"
    };

  } catch (error) {
    console.error("❌ Error sending delay/issue notification:", error);
    return {
      success: false,
      error: `Failed to send delay/issue notification: ${error}`
    };
  }
}

/**
 * Send delay and issue notification
 */
export const sendDelayIssueNotification = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    issueType: v.union(
      v.literal("taxi_delay"),
      v.literal("no_taxi_available"),
      v.literal("route_closure"),
      v.literal("weather_delay"),
      v.literal("traffic_delay"),
      v.literal("payment_issue"),
      v.literal("driver_issue"),
      v.literal("system_error")
    ),
    legIndex: v.number(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    metadata: v.optional(v.any())
  },
  handler: sendDelayIssueNotificationHandler
});

// ============================================================================
// ALTERNATIVE ROUTE SUGGESTIONS
// ============================================================================

/**
 * Handler function for alternative route suggestions
 */
export async function sendAlternativeRouteSuggestionHandler(
  ctx: any,
  args: {
    journeyId: string;
    passengerId: Id<"taxiTap_users">;
    suggestionType: string;
    legIndex: number;
    alternatives: any[];
    metadata?: any;
  }
): Promise<any> {
  try {
    const { journeyId, passengerId, suggestionType, legIndex, alternatives, metadata } = args;

    let title: string;
    let message: string;
    let priority: "low" | "medium" | "high" | "urgent";
    let notificationType: string;

    switch (suggestionType) {
      case "faster_route":
        title = "Faster Route Available";
        message = `We found a faster route for leg ${legIndex + 1}. It could save you ${metadata?.timeSaved || 5} minutes. Would you like to switch?`;
        priority = "medium";
        notificationType = "faster_route_available";
        break;

      case "cheaper_route":
        title = "Cheaper Route Available";
        message = `We found a more cost-effective route for leg ${legIndex + 1}. It could save you R${metadata?.costSaved || 10}. Would you like to switch?`;
        priority = "medium";
        notificationType = "cheaper_route_available";
        break;

      case "alternative_transfer":
        title = "Alternative Transfer Point";
        message = `We found ${alternatives.length} alternative transfer points for leg ${legIndex + 1}. Check them out in the app.`;
        priority = "high";
        notificationType = "alternative_transfer_points";
        break;

      case "route_modification":
        title = "Route Modification Suggested";
        message = `Due to current conditions, we suggest modifying your route. ${alternatives.length} options are available.`;
        priority = "high";
        notificationType = "route_modification_suggested";
        break;

      case "split_journey":
        title = "Journey Split Option";
        message = `We can split your journey into two parts to avoid current delays. This might be more convenient for you.`;
        priority = "medium";
        notificationType = "journey_split_suggested";
        break;

      default:
        title = "Route Suggestion";
        message = `We have some route suggestions for your journey. Check them out in the app.`;
        priority = "low";
        notificationType = "route_suggestion";
    }

    // Create the notification
    const notificationId = `route_${suggestionType}_${journeyId}_${legIndex}_${Date.now()}`;
    
    await ctx.db.insert("notifications", {
      notificationId,
      userId: passengerId,
      type: notificationType as any,
      title,
      message,
      isRead: false,
      isPush: true,
      priority: priority as any,
      metadata: {
        journeyId,
        legIndex,
        suggestionType,
        alternatives,
        ...metadata
      },
      createdAt: Date.now()
    });

    console.log(`📱 Sent alternative route suggestion: ${suggestionType} for journey ${journeyId}`);

    return {
      success: true,
      notificationId,
      message: "Alternative route suggestion sent successfully"
    };

  } catch (error) {
    console.error("❌ Error sending alternative route suggestion:", error);
    return {
      success: false,
      error: `Failed to send alternative route suggestion: ${error}`
    };
  }
}

/**
 * Send alternative route suggestion
 */
export const sendAlternativeRouteSuggestion = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    suggestionType: v.union(
      v.literal("faster_route"),
      v.literal("cheaper_route"),
      v.literal("alternative_transfer"),
      v.literal("route_modification"),
      v.literal("split_journey")
    ),
    legIndex: v.number(),
    alternatives: v.array(v.any()),
    metadata: v.optional(v.any())
  },
  handler: sendAlternativeRouteSuggestionHandler
});

// ============================================================================
// BATCH NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send multiple notifications in batch for journey events
 */
export const sendJourneyNotificationBatch = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    notifications: v.array(v.object({
      type: v.string(),
      title: v.string(),
      message: v.string(),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
      metadata: v.optional(v.any())
    }))
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const { journeyId, passengerId, notifications } = args;
      const results = [];

      for (const notification of notifications) {
        const notificationId = `batch_${journeyId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const result = await ctx.db.insert("notifications", {
          notificationId,
          userId: passengerId,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          isRead: false,
          isPush: true,
          priority: notification.priority as any,
          metadata: {
            journeyId,
            ...notification.metadata
          },
          createdAt: Date.now()
        });

        results.push({
          notificationId: result,
          type: notification.type,
          success: true
        });
      }

      console.log(`📱 Sent batch of ${notifications.length} notifications for journey ${journeyId}`);

      return {
        success: true,
        results,
        message: `Sent ${notifications.length} notifications successfully`
      };

    } catch (error) {
      console.error("❌ Error sending notification batch:", error);
      return {
        success: false,
        error: `Failed to send notification batch: ${error}`
      };
    }
  }
});

// ============================================================================
// NOTIFICATION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get journey-specific notifications for a passenger
 */
export const getJourneyNotifications = query({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 20;
      
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_id", (q: any) => q.eq("userId", args.passengerId))
        .filter((q) => 
          q.and(
            q.eq(q.field("metadata.journeyId"), args.journeyId),
            q.or(
              q.eq(q.field("type"), "journey_started"),
              q.eq(q.field("type"), "journey_leg_completed"),
              q.eq(q.field("type"), "next_leg_ready"),
              q.eq(q.field("type"), "transfer_approaching"),
              q.eq(q.field("type"), "transfer_arrived"),
              q.eq(q.field("type"), "journey_completed"),
              q.eq(q.field("type"), "journey_paused"),
              q.eq(q.field("type"), "journey_cancelled"),
              q.eq(q.field("type"), "transfer_window_starting"),
              q.eq(q.field("type"), "transfer_window_active"),
              q.eq(q.field("type"), "transfer_window_extended"),
              q.eq(q.field("type"), "transfer_window_expiring"),
              q.eq(q.field("type"), "transfer_window_expired"),
              q.eq(q.field("type"), "transfer_assistance_requested"),
              q.eq(q.field("type"), "taxi_delay"),
              q.eq(q.field("type"), "no_taxi_available"),
              q.eq(q.field("type"), "route_closure"),
              q.eq(q.field("type"), "weather_delay"),
              q.eq(q.field("type"), "traffic_delay"),
              q.eq(q.field("type"), "payment_issue"),
              q.eq(q.field("type"), "driver_issue"),
              q.eq(q.field("type"), "system_error"),
              q.eq(q.field("type"), "faster_route_available"),
              q.eq(q.field("type"), "cheaper_route_available"),
              q.eq(q.field("type"), "alternative_transfer_points"),
              q.eq(q.field("type"), "route_modification_suggested"),
              q.eq(q.field("type"), "journey_split_suggested")
            )
          )
        )
        .order("desc")
        .take(limit);

      return {
        success: true,
        notifications,
        totalFound: notifications.length
      };

    } catch (error) {
      console.error("❌ Error getting journey notifications:", error);
      return {
        success: false,
        error: `Failed to get journey notifications: ${error}`,
        notifications: []
      };
    }
  }
});

/**
 * Mark journey notifications as read
 */
export const markJourneyNotificationsAsRead = mutation({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users"),
    notificationIds: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    try {
      const { journeyId, passengerId, notificationIds } = args;

      let notificationsToUpdate;
      
      if (notificationIds && notificationIds.length > 0) {
        // Update specific notifications
        notificationsToUpdate = await ctx.db
          .query("notifications")
          .withIndex("by_user_id", (q: any) => q.eq("userId", passengerId))
          .filter((q) => 
            q.and(
              q.eq(q.field("metadata.journeyId"), journeyId),
              q.or(...notificationIds.map(id => q.eq(q.field("notificationId"), id)))
            )
          )
          .collect();
      } else {
        // Update all journey notifications
        notificationsToUpdate = await ctx.db
          .query("notifications")
          .withIndex("by_user_id", (q: any) => q.eq("userId", passengerId))
          .filter((q) => q.eq(q.field("metadata.journeyId"), journeyId))
          .collect();
      }

      let updatedCount = 0;
      for (const notification of notificationsToUpdate) {
        await ctx.db.patch(notification._id, {
          isRead: true,
          readAt: Date.now()
        });
        updatedCount++;
      }

      console.log(`📱 Marked ${updatedCount} journey notifications as read for journey ${journeyId}`);

      return {
        success: true,
        updatedCount,
        message: `Marked ${updatedCount} notifications as read`
      };

    } catch (error) {
      console.error("❌ Error marking journey notifications as read:", error);
      return {
        success: false,
        error: `Failed to mark notifications as read: ${error}`
      };
    }
  }
});

// ============================================================================
// INTERNAL ALERT FUNCTIONS
// ============================================================================

/**
 * Send internal alert for critical issues
 */
async function sendInternalAlert(
  ctx: any,
  args: {
    journeyId: string;
    issueType: string;
    severity: string;
    passengerId: Id<"taxiTap_users">;
    metadata?: any;
  }
): Promise<void> {
  try {
    // Create internal alert for customer service team
    await ctx.db.insert("internalAlerts", {
      alertId: `internal_${args.issueType}_${args.journeyId}_${Date.now()}`,
      journeyId: args.journeyId,
      passengerId: args.passengerId,
      issueType: args.issueType,
      severity: args.severity,
      status: "open",
      metadata: args.metadata,
      createdAt: Date.now(),
      assignedTo: null
    });

    console.log(`🚨 Internal alert created for ${args.issueType} in journey ${args.journeyId}`);

  } catch (error) {
    console.error("❌ Error creating internal alert:", error);
  }
}

/**
 * Get notification statistics for a journey
 */
export const getJourneyNotificationStats = query({
  args: {
    journeyId: v.string(),
    passengerId: v.id("taxiTap_users")
  },
  handler: async (ctx, args) => {
    try {
      const allNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_id", (q: any) => q.eq("userId", args.passengerId))
        .filter((q) => q.eq(q.field("metadata.journeyId"), args.journeyId))
        .collect();

      const stats = {
        total: allNotifications.length,
        unread: allNotifications.filter(n => !n.isRead).length,
        byType: {} as Record<string, number>,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0
        },
        recentActivity: allNotifications
          .filter(n => n.createdAt > Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          .length
      };

      // Count by type and priority
      for (const notification of allNotifications) {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority as keyof typeof stats.byPriority]++;
      }

      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error("❌ Error getting notification stats:", error);
      return {
        success: false,
        error: `Failed to get notification stats: ${error}`
      };
    }
  }
});

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Update notification preferences for journey notifications
 */
export const updateJourneyNotificationPreferences = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    preferences: v.object({
      transferNotifications: v.boolean(),
      arrivalAlerts: v.boolean(),
      delayUpdates: v.boolean(),
      paymentReminders: v.boolean()
    })
  },
  handler: async (ctx, args) => {
    try {
      const { passengerId, preferences } = args;

      // Check if preferences already exist
      const existingPrefs = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_user_id", (q: any) => q.eq("userId", passengerId))
        .first();

      if (existingPrefs) {
        // Update existing preferences
        await ctx.db.patch(existingPrefs._id, {
          journeyPreferences: preferences,
          updatedAt: Date.now()
        });
      } else {
        // Create new preferences
        await ctx.db.insert("notificationPreferences", {
          userId: passengerId,
          journeyPreferences: preferences,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      console.log(`📱 Updated journey notification preferences for user ${passengerId}`);

      return {
        success: true,
        message: "Journey notification preferences updated successfully"
      };

    } catch (error) {
      console.error("❌ Error updating notification preferences:", error);
      return {
        success: false,
        error: `Failed to update notification preferences: ${error}`
      };
    }
  }
});

/**
 * Get notification preferences for a user
 */
export const getJourneyNotificationPreferences = query({
  args: {
    passengerId: v.id("taxiTap_users")
  },
  handler: async (ctx, args) => {
    try {
      const preferences = await ctx.db
        .query("notificationPreferences")
        .withIndex("by_user_id", (q: any) => q.eq("userId", args.passengerId))
        .first();

      if (!preferences) {
        // Return default preferences
        return {
          success: true,
          preferences: {
            journeyProgress: true,
            transferAlerts: true,
            delayNotifications: true,
            routeSuggestions: true,
            pushEnabled: true,
            quietHours: {
              enabled: false,
              start: "22:00",
              end: "07:00"
            }
          }
        };
      }

      return {
        success: true,
        preferences: preferences.journeyPreferences || {
          journeyProgress: true,
          transferAlerts: true,
          delayNotifications: true,
          routeSuggestions: true,
          pushEnabled: true,
          quietHours: {
            enabled: false,
            start: "22:00",
            end: "07:00"
          }
        }
      };

    } catch (error) {
      console.error("❌ Error getting notification preferences:", error);
      return {
        success: false,
        error: `Failed to get notification preferences: ${error}`
      };
    }
  }
});
