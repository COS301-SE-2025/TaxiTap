/**
 * notificationAnalytics.ts
 *
 * Comprehensive notification monitoring and analytics system.
 * Tracks notification performance, user engagement, and system health.
 *
 * @author Git It Done
 */

import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// ============================================================================
// NOTIFICATION ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Track notification performance metrics
 */
export const trackNotificationPerformance = mutation({
  args: {
    notificationId: v.string(),
    eventType: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("failed")
    ),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const { notificationId, eventType, metadata } = args;

      // Get the notification
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

      // Create performance tracking record
      const trackingId = `track_${notificationId}_${eventType}_${Date.now()}`;
      
      await ctx.db.insert("notificationTracking", {
        notificationId: notification._id as Id<"notifications">,
        eventType,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          channel: metadata?.channel,
          errorType: metadata?.errorType,
          deliveryMethod: metadata?.deliveryMethod
        }
      });

      // Update notification with latest event
      const updateData: any = {
        lastEventAt: Date.now()
      };

      switch (eventType) {
        case "delivered":
          updateData.deliveredAt = Date.now();
          break;
        case "opened":
          updateData.openedAt = Date.now();
          updateData.isRead = true;
          break;
        case "clicked":
          updateData.clickedAt = Date.now();
          updateData.isRead = true;
          break;
        case "failed":
          updateData.failedAt = Date.now();
          break;
      }

      await ctx.db.patch(notification._id, updateData);

      console.log(`📊 Tracked notification event: ${eventType} for ${notificationId}`);

      return {
        success: true,
        trackingId,
        message: `Event ${eventType} tracked successfully`
      };

    } catch (error) {
      console.error("❌ Error tracking notification performance:", error);
      return {
        success: false,
        error: `Failed to track performance: ${error}`
      };
    }
  }
});

/**
 * Get notification analytics for a journey
 */
export const getJourneyNotificationAnalytics = query({
  args: {
    journeyId: v.string(),
    timeRange: v.optional(v.number()) // hours
  },
  handler: async (ctx, args) => {
    try {
      const { journeyId, timeRange = 24 } = args;
      const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

      // Get all notifications for this journey
      const notifications = await ctx.db
        .query("notifications")
        .filter((q: any) => 
          q.and(
            q.eq(q.field("metadata.journeyId"), journeyId),
            q.gt(q.field("createdAt"), cutoffTime)
          )
        )
        .collect();

      // Get tracking data for these notifications
      const notificationIds = notifications.map(n => n.notificationId);
      const trackingData = await ctx.db
        .query("notificationTracking")
        .filter((q: any) => 
          q.or(...notificationIds.map(id => q.eq(q.field("notificationId"), id)))
        )
        .collect();

      // Calculate analytics
      const analytics = {
        totalNotifications: notifications.length,
        byType: {} as Record<string, number>,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0
        },
        deliveryMetrics: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          dismissed: 0,
          escalated: 0,
          failed: 0
        },
        performanceMetrics: {
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          escalationRate: 0,
          failureRate: 0
        },
        timingMetrics: {
          averageDeliveryTime: 0,
          averageOpenTime: 0,
          averageClickTime: 0
        },
        escalationBreakdown: {
          level1: 0,
          level2: 0,
          level3: 0
        }
      };

      // Count by type and priority
      notifications.forEach(notification => {
        analytics.byType[notification.type] = (analytics.byType[notification.type] || 0) + 1;
        analytics.byPriority[notification.priority as keyof typeof analytics.byPriority]++;
      });

      // Count delivery metrics
      trackingData.forEach(track => {
        analytics.deliveryMetrics[track.eventType as keyof typeof analytics.deliveryMetrics]++;
      });

      // Calculate performance rates
      if (analytics.deliveryMetrics.sent > 0) {
        analytics.performanceMetrics.deliveryRate = analytics.deliveryMetrics.delivered / analytics.deliveryMetrics.sent;
        analytics.performanceMetrics.openRate = analytics.deliveryMetrics.opened / analytics.deliveryMetrics.delivered;
        analytics.performanceMetrics.clickRate = analytics.deliveryMetrics.clicked / analytics.deliveryMetrics.delivered;
        analytics.performanceMetrics.escalationRate = analytics.deliveryMetrics.escalated / analytics.deliveryMetrics.sent;
        analytics.performanceMetrics.failureRate = analytics.deliveryMetrics.failed / analytics.deliveryMetrics.sent;
      }

      // Calculate timing metrics
      const deliveryTimes: number[] = [];
      const openTimes: number[] = [];
      const clickTimes: number[] = [];

      notifications.forEach(notification => {
        if (notification.deliveredAt) {
          deliveryTimes.push(notification.deliveredAt - notification.createdAt);
        }
        if (notification.openedAt) {
          openTimes.push(notification.openedAt - notification.createdAt);
        }
        if (notification.clickedAt) {
          clickTimes.push(notification.clickedAt - notification.createdAt);
        }
      });

      if (deliveryTimes.length > 0) {
        analytics.timingMetrics.averageDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
      }
      if (openTimes.length > 0) {
        analytics.timingMetrics.averageOpenTime = openTimes.reduce((a, b) => a + b, 0) / openTimes.length;
      }
      if (clickTimes.length > 0) {
        analytics.timingMetrics.averageClickTime = clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length;
      }

      // Count escalation levels
      notifications.forEach(notification => {
        const level = notification.escalationLevel || 0;
        if (level >= 1) analytics.escalationBreakdown.level1++;
        if (level >= 2) analytics.escalationBreakdown.level2++;
        if (level >= 3) analytics.escalationBreakdown.level3++;
      });

      return {
        success: true,
        analytics,
        timeRange,
        journeyId
      };

    } catch (error) {
      console.error("❌ Error getting journey notification analytics:", error);
      return {
        success: false,
        error: `Failed to get analytics: ${error}`,
        analytics: null
      };
    }
  }
});

/**
 * Get user engagement analytics
 */
export const getUserEngagementAnalytics = query({
  args: {
    userId: v.id("taxiTap_users"),
    timeRange: v.optional(v.number()) // days
  },
  handler: async (ctx, args) => {
    try {
      const { userId, timeRange = 30 } = args;
      const cutoffTime = Date.now() - (timeRange * 24 * 60 * 60 * 1000);

      // Get user's notifications
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
        .filter((q: any) => q.gt(q.field("createdAt"), cutoffTime))
        .collect();

      // Get tracking data
      const notificationIds = notifications.map(n => n.notificationId);
      const trackingData = await ctx.db
        .query("notificationTracking")
        .filter((q: any) => 
          q.or(...notificationIds.map(id => q.eq(q.field("notificationId"), id)))
        )
        .collect();

      // Calculate engagement metrics
      const engagement = {
        totalNotifications: notifications.length,
        engagementRate: 0,
        responseTime: {
          average: 0,
          median: 0,
          p95: 0
        },
        preferredTypes: {} as Record<string, number>,
        preferredTimes: {
          hourly: new Array(24).fill(0),
          daily: new Array(7).fill(0)
        },
        escalationBehavior: {
          escalates: 0,
          averageEscalationLevel: 0,
          escalationReasons: {} as Record<string, number>
        },
        channelEffectiveness: {
          push: { sent: 0, opened: 0, clicked: 0 },
          sms: { sent: 0, opened: 0, clicked: 0 },
          email: { sent: 0, opened: 0, clicked: 0 }
        }
      };

      // Calculate engagement rate
      const openedNotifications = notifications.filter(n => n.openedAt).length;
      const clickedNotifications = notifications.filter(n => n.clickedAt).length;
      engagement.engagementRate = notifications.length > 0 ? 
        (openedNotifications + clickedNotifications) / notifications.length : 0;

      // Calculate response times
      const responseTimes: number[] = [];
      notifications.forEach(notification => {
        if (notification.openedAt) {
          responseTimes.push(notification.openedAt - notification.createdAt);
        }
      });

      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);
        engagement.responseTime.average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        engagement.responseTime.median = responseTimes[Math.floor(responseTimes.length / 2)];
        engagement.responseTime.p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      }

      // Analyze preferred types
      notifications.forEach(notification => {
        if (notification.openedAt || notification.clickedAt) {
          engagement.preferredTypes[notification.type] = 
            (engagement.preferredTypes[notification.type] || 0) + 1;
        }
      });

      // Analyze preferred times
      notifications.forEach(notification => {
        const date = new Date(notification.createdAt);
        const hour = date.getHours();
        const day = date.getDay();
        
        if (notification.openedAt || notification.clickedAt) {
          engagement.preferredTimes.hourly[hour]++;
          engagement.preferredTimes.daily[day]++;
        }
      });

      // Analyze escalation behavior
      const escalatedNotifications = notifications.filter(n => (n.escalationLevel || 0) > 0);
      engagement.escalationBehavior.escalates = escalatedNotifications.length;
      
      if (escalatedNotifications.length > 0) {
        const totalEscalationLevel = escalatedNotifications.reduce((sum, n) => sum + (n.escalationLevel || 0), 0);
        engagement.escalationBehavior.averageEscalationLevel = totalEscalationLevel / escalatedNotifications.length;
      }

      // Count escalation reasons
      escalatedNotifications.forEach(notification => {
        if (notification.escalationHistory) {
          notification.escalationHistory.forEach((escalation: any) => {
            const reason = escalation.reason || "unknown";
            engagement.escalationBehavior.escalationReasons[reason] = 
              (engagement.escalationBehavior.escalationReasons[reason] || 0) + 1;
          });
        }
      });

      // Analyze channel effectiveness
      trackingData.forEach(track => {
        const channel = track.metadata?.channel || "push";
        if (engagement.channelEffectiveness[channel as keyof typeof engagement.channelEffectiveness]) {
          const channelStats = engagement.channelEffectiveness[channel as keyof typeof engagement.channelEffectiveness];
          if (track.eventType === "sent") channelStats.sent++;
          if (track.eventType === "opened") channelStats.opened++;
          if (track.eventType === "clicked") channelStats.clicked++;
        }
      });

      return {
        success: true,
        engagement,
        timeRange,
        userId
      };

    } catch (error) {
      console.error("❌ Error getting user engagement analytics:", error);
      return {
        success: false,
        error: `Failed to get engagement analytics: ${error}`,
        engagement: null
      };
    }
  }
});

/**
 * Get system health metrics
 */
export const getSystemHealthMetrics = query({
  args: {
    timeRange: v.optional(v.number()) // hours
  },
  handler: async (ctx, args) => {
    try {
      const { timeRange = 24 } = args;
      const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

      // Get all notifications in time range
      const notifications = await ctx.db
        .query("notifications")
        .filter((q: any) => q.gt(q.field("createdAt"), cutoffTime))
        .collect();

      // Get tracking data
      const notificationIds = notifications.map(n => n.notificationId);
      const trackingData = await ctx.db
        .query("notificationTracking")
        .filter((q: any) => 
          q.or(...notificationIds.map(id => q.eq(q.field("notificationId"), id)))
        )
        .collect();

      // Calculate system health metrics
      const health = {
        totalNotifications: notifications.length,
        deliveryHealth: {
          successRate: 0,
          failureRate: 0,
          averageDeliveryTime: 0
        },
        escalationHealth: {
          escalationRate: 0,
          averageEscalationLevel: 0,
          criticalEscalations: 0
        },
        performanceHealth: {
          openRate: 0,
          clickRate: 0,
          responseTime: 0
        },
        errorAnalysis: {
          commonErrors: {} as Record<string, number>,
          errorTrends: [] as Array<{ hour: number; count: number }>
        },
        capacityMetrics: {
          peakHour: 0,
          averagePerHour: 0,
          maxConcurrent: 0
        }
      };

      // Calculate delivery health
      const sentCount = trackingData.filter(t => t.eventType === "sent").length;
      const deliveredCount = trackingData.filter(t => t.eventType === "delivered").length;
      const failedCount = trackingData.filter(t => t.eventType === "failed").length;

      if (sentCount > 0) {
        health.deliveryHealth.successRate = deliveredCount / sentCount;
        health.deliveryHealth.failureRate = failedCount / sentCount;
      }

      // Calculate average delivery time
      const deliveryTimes: number[] = [];
      notifications.forEach(notification => {
        if (notification.deliveredAt) {
          deliveryTimes.push(notification.deliveredAt - notification.createdAt);
        }
      });

      if (deliveryTimes.length > 0) {
        health.deliveryHealth.averageDeliveryTime = 
          deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;
      }

      // Calculate escalation health
      const escalatedCount = notifications.filter(n => (n.escalationLevel || 0) > 0).length;
      health.escalationHealth.escalationRate = notifications.length > 0 ? 
        escalatedCount / notifications.length : 0;

      if (escalatedCount > 0) {
        const totalEscalationLevel = notifications.reduce((sum, n) => sum + (n.escalationLevel || 0), 0);
        health.escalationHealth.averageEscalationLevel = totalEscalationLevel / escalatedCount;
        health.escalationHealth.criticalEscalations = notifications.filter(n => (n.escalationLevel || 0) >= 3).length;
      }

      // Calculate performance health
      const openedCount = trackingData.filter(t => t.eventType === "opened").length;
      const clickedCount = trackingData.filter(t => t.eventType === "clicked").length;

      if (deliveredCount > 0) {
        health.performanceHealth.openRate = openedCount / deliveredCount;
        health.performanceHealth.clickRate = clickedCount / deliveredCount;
      }

      // Calculate average response time
      const responseTimes: number[] = [];
      notifications.forEach(notification => {
        if (notification.openedAt) {
          responseTimes.push(notification.openedAt - notification.createdAt);
        }
      });

      if (responseTimes.length > 0) {
        health.performanceHealth.responseTime = 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }

      // Analyze errors
      const errorEvents = trackingData.filter(t => t.eventType === "failed");
      errorEvents.forEach(event => {
        const errorType = event.metadata?.errorType || "unknown";
        health.errorAnalysis.commonErrors[errorType] = 
          (health.errorAnalysis.commonErrors[errorType] || 0) + 1;
      });

      // Analyze error trends by hour
      const hourlyErrors = new Array(24).fill(0);
      errorEvents.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        hourlyErrors[hour]++;
      });

      health.errorAnalysis.errorTrends = hourlyErrors.map((count, hour) => ({ hour, count }));

      // Calculate capacity metrics
      const hourlyCounts = new Array(24).fill(0);
      notifications.forEach(notification => {
        const hour = new Date(notification.createdAt).getHours();
        hourlyCounts[hour]++;
      });

      health.capacityMetrics.peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));
      health.capacityMetrics.averagePerHour = notifications.length / timeRange;
      health.capacityMetrics.maxConcurrent = Math.max(...hourlyCounts);

      return {
        success: true,
        health,
        timeRange
      };

    } catch (error) {
      console.error("❌ Error getting system health metrics:", error);
      return {
        success: false,
        error: `Failed to get system health: ${error}`,
        health: null
      };
    }
  }
});

/**
 * Generate notification performance report
 */
export const generateNotificationReport = mutation({
  args: {
    reportType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("custom")
    ),
    targetId: v.optional(v.string()), // journeyId or userId
    timeRange: v.optional(v.number()),
    includeRecommendations: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const { reportType, targetId, timeRange = 24, includeRecommendations = true } = args;

      let report: any = {
        reportType,
        targetId,
        timeRange,
        generatedAt: Date.now(),
        data: {},
        recommendations: []
      };

      switch (reportType) {
        case "custom":
          // Custom report for specific journey
          if (!targetId) {
            return { success: false, error: "Journey ID required for custom report" };
          }
          // Get journey analytics (placeholder - avoiding circular call)
          const journeyAnalytics = { analytics: {} };
          report.data = journeyAnalytics.analytics;
          break;

        case "weekly":
          if (!targetId) {
            return { success: false, error: "User ID required for weekly report" };
          }
          // Get user analytics (placeholder - avoiding circular call)
          const userAnalytics = { engagement: {} };
          report.data = userAnalytics.engagement;
          break;

        case "monthly":
          // Get system health (placeholder - avoiding circular call)
          const systemHealth = { health: {} };
          report.data = systemHealth.health;
          break;

        case "daily":
          // Generate comprehensive report with all metrics
          // Get journey data (placeholder - avoiding circular call)
          const journeyData = targetId ? { analytics: {} } : null;

          // Get system data (placeholder - avoiding circular call)
          const systemData = { health: {} };

          report.data = {
            journey: journeyData?.analytics,
            system: systemData.health
          };
          break;
      }

      // Generate recommendations if requested
      if (includeRecommendations) {
        report.recommendations = await generateRecommendations(ctx, report.data, reportType);
      }

      // Store report
      const reportId = `report_${reportType}_${Date.now()}`;
      await ctx.db.insert("notificationReports", {
        reportId,
        reportType,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        metrics: report.metrics,
        createdAt: report.generatedAt
      });

      console.log(`📊 Generated ${reportType} notification report: ${reportId}`);

      return {
        success: true,
        reportId,
        report
      };

    } catch (error) {
      console.error("❌ Error generating notification report:", error);
      return {
        success: false,
        error: `Failed to generate report: ${error}`
      };
    }
  }
});

/**
 * Generate recommendations based on analytics data
 */
async function generateRecommendations(
  ctx: any,
  data: any,
  reportType: string
): Promise<Array<{ type: string; priority: string; description: string; action: string }>> {
  const recommendations: Array<{ type: string; priority: string; description: string; action: string }> = [];

  try {
    if (reportType === "custom" || reportType === "daily") {
      const journeyData = reportType === "daily" ? data.journey : data;

      if (journeyData) {
        // Low delivery rate
        if (journeyData.performanceMetrics?.deliveryRate < 0.8) {
          recommendations.push({
            type: "delivery",
            priority: "high",
            description: `Delivery rate is ${(journeyData.performanceMetrics.deliveryRate * 100).toFixed(1)}%, below recommended 80%`,
            action: "Review push notification service configuration and retry mechanisms"
          });
        }

        // High escalation rate
        if (journeyData.performanceMetrics?.escalationRate > 0.2) {
          recommendations.push({
            type: "escalation",
            priority: "medium",
            description: `Escalation rate is ${(journeyData.performanceMetrics.escalationRate * 100).toFixed(1)}%, above recommended 20%`,
            action: "Improve initial notification delivery and user engagement"
          });
        }

        // Low open rate
        if (journeyData.performanceMetrics?.openRate < 0.3) {
          recommendations.push({
            type: "engagement",
            priority: "medium",
            description: `Open rate is ${(journeyData.performanceMetrics.openRate * 100).toFixed(1)}%, below recommended 30%`,
            action: "Improve notification content and timing"
          });
        }
      }
    }

    if (reportType === "monthly" || reportType === "daily") {
      const systemData = reportType === "daily" ? data.system : data;

      if (systemData) {
        // System health issues
        if (systemData.deliveryHealth?.successRate < 0.9) {
          recommendations.push({
            type: "system",
            priority: "critical",
            description: `System delivery success rate is ${(systemData.deliveryHealth.successRate * 100).toFixed(1)}%, below recommended 90%`,
            action: "Investigate and fix delivery infrastructure issues"
          });
        }

        // High failure rate
        if (systemData.deliveryHealth?.failureRate > 0.1) {
          recommendations.push({
            type: "reliability",
            priority: "high",
            description: `Failure rate is ${(systemData.deliveryHealth.failureRate * 100).toFixed(1)}%, above recommended 10%`,
            action: "Review error handling and implement better fallback mechanisms"
          });
        }

        // Capacity issues
        if (systemData.capacityMetrics?.maxConcurrent > 1000) {
          recommendations.push({
            type: "capacity",
            priority: "medium",
            description: `Peak concurrent notifications reached ${systemData.capacityMetrics.maxConcurrent}`,
            action: "Consider scaling notification infrastructure"
          });
        }
      }
    }

    if (reportType === "weekly" || reportType === "daily") {
      const userData = reportType === "daily" ? data.user : data;

      if (userData) {
        // Low engagement
        if (userData.engagementRate < 0.4) {
          recommendations.push({
            type: "user_experience",
            priority: "medium",
            description: `User engagement rate is ${(userData.engagementRate * 100).toFixed(1)}%, below recommended 40%`,
            action: "Personalize notification content and optimize delivery timing"
          });
        }

        // High escalation behavior
        if (userData.escalationBehavior?.escalates > 5) {
          recommendations.push({
            type: "user_support",
            priority: "high",
            description: `User has escalated ${userData.escalationBehavior.escalates} notifications`,
            action: "Provide additional support and improve notification clarity"
          });
        }
      }
    }

  } catch (error) {
    console.error("❌ Error generating recommendations:", error);
  }

  return recommendations;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get notification trends over time
 */
export const getNotificationTrends = query({
  args: {
    timeRange: v.optional(v.number()), // hours
    granularity: v.optional(v.union(v.literal("hourly"), v.literal("daily")))
  },
  handler: async (ctx, args) => {
    try {
      const { timeRange = 24, granularity = "hourly" } = args;
      const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

      const notifications = await ctx.db
        .query("notifications")
        .filter((q: any) => q.gt(q.field("createdAt"), cutoffTime))
        .collect();

      const trends = {
        timeRange,
        granularity,
        data: [] as Array<{
          timestamp: number;
          sent: number;
          delivered: number;
          opened: number;
          clicked: number;
          escalated: number;
          failed: number;
        }>
      };

      // Group by time intervals
      const intervalMs = granularity === "hourly" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const intervals = Math.ceil(timeRange / (granularity === "hourly" ? 1 : 24));

      for (let i = 0; i < intervals; i++) {
        const intervalStart = cutoffTime + (i * intervalMs);
        const intervalEnd = intervalStart + intervalMs;

        const intervalNotifications = notifications.filter(n => 
          n.createdAt >= intervalStart && n.createdAt < intervalEnd
        );

        const intervalData = {
          timestamp: intervalStart,
          sent: intervalNotifications.length,
          delivered: intervalNotifications.filter(n => n.deliveredAt).length,
          opened: intervalNotifications.filter(n => n.openedAt).length,
          clicked: intervalNotifications.filter(n => n.clickedAt).length,
          escalated: intervalNotifications.filter(n => (n.escalationLevel || 0) > 0).length,
          failed: intervalNotifications.filter(n => n.failedAt).length
        };

        trends.data.push(intervalData);
      }

      return {
        success: true,
        trends
      };

    } catch (error) {
      console.error("❌ Error getting notification trends:", error);
      return {
        success: false,
        error: `Failed to get trends: ${error}`,
        trends: null
      };
    }
  }
});

/**
 * Get top performing notification types
 */
export const getTopPerformingNotificationTypes = query({
  args: {
    timeRange: v.optional(v.number()), // hours
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    try {
      const { timeRange = 24, limit = 10 } = args;
      const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

      const notifications = await ctx.db
        .query("notifications")
        .filter((q: any) => q.gt(q.field("createdAt"), cutoffTime))
        .collect();

      const typePerformance: Record<string, {
        type: string;
        total: number;
        delivered: number;
        opened: number;
        clicked: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
      }> = {};

      // Calculate performance for each type
      notifications.forEach(notification => {
        if (!typePerformance[notification.type]) {
          typePerformance[notification.type] = {
            type: notification.type,
            total: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            deliveryRate: 0,
            openRate: 0,
            clickRate: 0
          };
        }

        const perf = typePerformance[notification.type];
        perf.total++;
        if (notification.deliveredAt) perf.delivered++;
        if (notification.openedAt) perf.opened++;
        if (notification.clickedAt) perf.clicked++;
      });

      // Calculate rates
      Object.values(typePerformance).forEach(perf => {
        perf.deliveryRate = perf.total > 0 ? perf.delivered / perf.total : 0;
        perf.openRate = perf.delivered > 0 ? perf.opened / perf.delivered : 0;
        perf.clickRate = perf.delivered > 0 ? perf.clicked / perf.delivered : 0;
      });

      // Sort by performance score (combination of delivery rate and engagement)
      const topTypes = Object.values(typePerformance)
        .sort((a, b) => {
          const scoreA = a.deliveryRate * 0.4 + a.openRate * 0.3 + a.clickRate * 0.3;
          const scoreB = b.deliveryRate * 0.4 + b.openRate * 0.3 + b.clickRate * 0.3;
          return scoreB - scoreA;
        })
        .slice(0, limit);

      return {
        success: true,
        topTypes,
        timeRange
      };

    } catch (error) {
      console.error("❌ Error getting top performing types:", error);
      return {
        success: false,
        error: `Failed to get top performing types: ${error}`,
        topTypes: []
      };
    }
  }
});
