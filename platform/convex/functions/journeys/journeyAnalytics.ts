/**
 * journeyAnalytics.ts
 *
 * Analytics and metrics collection for multi-leg journeys.
 * Provides insights into journey completion rates, transfer efficiency,
 * fare accuracy, and overall journey performance.
 *
 * @author Git It Done
 */

import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

/**
 * Handler function for collecting journey completion metrics
 */
export async function collectJourneyMetricsHandler(ctx: any, args: any): Promise<any> {
  try {
    console.log(`📊 Collecting metrics for journey ${args.journeyId}`);

    // Get journey details
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .unique();

    if (!journey) {
      throw new Error("Journey not found for metrics collection");
    }

    // Get all journey legs
    const legs = await ctx.db
      .query("journeyLegs")
      .withIndex("by_journey_id", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();

    // Calculate metrics
    const metrics = calculateJourneyMetrics(journey, legs);

    // Store metrics in existing feedback table with analytics metadata
    const metricsId = await ctx.db.insert("feedback", {
      rideId: legs[0]?.rideId || null,
      passengerId: journey.passengerId,
      driverId: journey.passengerId, // Use passenger as placeholder
      rating: Math.round(metrics.overallEfficiencyScore),
      comment: JSON.stringify({
        type: "journey_analytics",
        journeyId: args.journeyId,
        metrics: metrics,
        collectedAt: Date.now(),
        source: "journey_completion"
      }),
      startLocation: journey.originAddress,
      endLocation: journey.destinationAddress,
      createdAt: Date.now()
    });

    console.log(`✅ Journey metrics collected and stored: ${metricsId}`);

    return {
      success: true,
      metricsId,
      metrics,
      message: "Journey metrics collected successfully"
    };

  } catch (error) {
    console.error("❌ Error collecting journey metrics:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Calculate comprehensive metrics for a journey
 */
function calculateJourneyMetrics(journey: any, legs: any[]): any {
  const completedLegs = legs.filter(leg => leg.status === "completed");
  const failedLegs = legs.filter(leg => leg.status === "failed");

  // Time metrics
  const totalDuration = journey.completedAt ? (journey.completedAt - journey.createdAt) : 0;
  const avgLegDuration = completedLegs.length > 0
    ? completedLegs.reduce((sum, leg) => sum + (leg.completedAt - leg.requestedAt), 0) / completedLegs.length
    : 0;

  // Fare metrics
  const totalEstimatedFare = legs.reduce((sum, leg) => sum + (leg.estimatedFare || 0), 0);
  const totalActualFare = completedLegs.reduce((sum, leg) => sum + (leg.actualFare || leg.estimatedFare || 0), 0);
  const fareAccuracy = totalEstimatedFare > 0 ? (totalActualFare / totalEstimatedFare) : 1;

  // Completion metrics
  const completionRate = legs.length > 0 ? (completedLegs.length / legs.length) : 0;
  const failureRate = legs.length > 0 ? (failedLegs.length / legs.length) : 0;

  // Transfer efficiency (time between leg completions)
  let transferTimes = [];
  for (let i = 0; i < completedLegs.length - 1; i++) {
    const currentLeg = completedLegs.find(leg => leg.legIndex === i);
    const nextLeg = completedLegs.find(leg => leg.legIndex === i + 1);
    if (currentLeg && nextLeg && currentLeg.completedAt && nextLeg.requestedAt) {
      transferTimes.push(nextLeg.requestedAt - currentLeg.completedAt);
    }
  }
  const avgTransferTime = transferTimes.length > 0
    ? transferTimes.reduce((sum, time) => sum + time, 0) / transferTimes.length
    : 0;

  // Overall efficiency score (1-5)
  const timeEfficiency = totalDuration > 0 && journey.estimatedTotalDuration > 0
    ? Math.max(1, Math.min(5, 5 - ((totalDuration - journey.estimatedTotalDuration) / journey.estimatedTotalDuration) * 2))
    : 3;

  const fareEfficiency = Math.max(1, Math.min(5, 6 - Math.abs(fareAccuracy - 1) * 5));
  const completionEfficiency = completionRate * 5;

  const overallEfficiencyScore = (timeEfficiency + fareEfficiency + completionEfficiency) / 3;

  return {
    journeyId: journey.journeyId,
    totalLegs: legs.length,
    completedLegs: completedLegs.length,
    failedLegs: failedLegs.length,
    completionRate,
    failureRate,

    // Time metrics (in milliseconds)
    totalDuration,
    estimatedDuration: journey.estimatedTotalDuration,
    avgLegDuration,
    avgTransferTime,
    transferCount: transferTimes.length,

    // Fare metrics
    totalEstimatedFare,
    totalActualFare,
    fareVariance: totalActualFare - totalEstimatedFare,
    fareAccuracy,
    fareEfficiency,

    // Efficiency scores (1-5)
    timeEfficiency,
    completionEfficiency,
    overallEfficiencyScore,

    // Additional metadata
    optimizationPreference: journey.optimizationPreference,
    journeyCompleted: journey.status === "completed",
    metricsCalculatedAt: Date.now()
  };
}

/**
 * Collect journey metrics when a journey is completed
 */
export const collectJourneyMetrics = mutation({
  args: {
    journeyId: v.string(),
    triggeredBy: v.optional(v.string()) // "journey_completion", "manual", etc.
  },
  handler: collectJourneyMetricsHandler
});

/**
 * Handler function for getting journey analytics summary
 */
export async function getJourneyAnalyticsHandler(ctx: any, args: any): Promise<any> {
  try {
    // Get analytics data from feedback table
    const allAnalytics = await ctx.db
      .query("feedback")
      .collect();

    const journeyAnalytics = allAnalytics.filter((f: any) => {
      try {
        const comment = JSON.parse(f.comment || '{}');
        return comment.type === "journey_analytics";
      } catch {
        return false;
      }
    });

    if (journeyAnalytics.length === 0) {
      return {
        success: true,
        analytics: null,
        message: "No journey analytics data found"
      };
    }

    // Aggregate metrics
    const aggregatedMetrics = aggregateJourneyMetrics(journeyAnalytics);

    return {
      success: true,
      analytics: aggregatedMetrics,
      totalJourneys: journeyAnalytics.length,
      message: "Journey analytics retrieved successfully"
    };

  } catch (error) {
    console.error("❌ Error getting journey analytics:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Aggregate metrics across multiple journeys
 */
function aggregateJourneyMetrics(analyticsData: any[]): any {
  if (analyticsData.length === 0) return null;

  const metrics = analyticsData.map((a: any) => {
    try {
      return JSON.parse(a.comment).metrics;
    } catch {
      return null;
    }
  }).filter(Boolean);

  if (metrics.length === 0) return null;

  const totals = metrics.reduce((acc: any, metric: any) => {
    acc.totalJourneys += 1;
    acc.totalLegs += metric.totalLegs || 0;
    acc.completedLegs += metric.completedLegs || 0;
    acc.failedLegs += metric.failedLegs || 0;
    acc.totalDuration += metric.totalDuration || 0;
    acc.totalEstimatedFare += metric.totalEstimatedFare || 0;
    acc.totalActualFare += metric.totalActualFare || 0;
    acc.overallEfficiencySum += metric.overallEfficiencyScore || 0;
    acc.completionRateSum += metric.completionRate || 0;
    acc.fareAccuracySum += metric.fareAccuracy || 0;
    return acc;
  }, {
    totalJourneys: 0,
    totalLegs: 0,
    completedLegs: 0,
    failedLegs: 0,
    totalDuration: 0,
    totalEstimatedFare: 0,
    totalActualFare: 0,
    overallEfficiencySum: 0,
    completionRateSum: 0,
    fareAccuracySum: 0
  });

  return {
    totalJourneys: totals.totalJourneys,
    totalLegs: totals.totalLegs,
    completedLegs: totals.completedLegs,
    failedLegs: totals.failedLegs,

    // Average metrics
    avgCompletionRate: totals.completionRateSum / totals.totalJourneys,
    avgOverallEfficiency: totals.overallEfficiencySum / totals.totalJourneys,
    avgFareAccuracy: totals.fareAccuracySum / totals.totalJourneys,
    avgJourneyDuration: totals.totalDuration / totals.totalJourneys,

    // Financial metrics
    totalEstimatedFare: totals.totalEstimatedFare,
    totalActualFare: totals.totalActualFare,
    totalFareVariance: totals.totalActualFare - totals.totalEstimatedFare,

    // Performance indicators
    systemReliability: totals.completedLegs / totals.totalLegs,
    fareReliability: Math.abs(totals.totalActualFare - totals.totalEstimatedFare) / totals.totalEstimatedFare,

    calculatedAt: Date.now()
  };
}

/**
 * Get journey analytics summary
 */
export const getJourneyAnalytics = query({
  args: {
    dateRange: v.optional(v.object({
      startDate: v.number(),
      endDate: v.number()
    }))
  },
  handler: getJourneyAnalyticsHandler
});

/**
 * Handler function for getting individual journey metrics
 */
export async function getJourneyMetricsHandler(ctx: any, args: any): Promise<any> {
  try {
    // Find journey metrics in feedback table
    const allFeedback = await ctx.db
      .query("feedback")
      .collect();

    const journeyMetrics = allFeedback.find((f: any) => {
      try {
        const comment = JSON.parse(f.comment || '{}');
        return comment.type === "journey_analytics" && comment.journeyId === args.journeyId;
      } catch {
        return false;
      }
    });

    if (!journeyMetrics) {
      return {
        success: false,
        message: "No metrics found for this journey"
      };
    }

    const metrics = JSON.parse(journeyMetrics.comment).metrics;

    return {
      success: true,
      metrics,
      message: "Journey metrics retrieved successfully"
    };

  } catch (error) {
    console.error("❌ Error getting journey metrics:", error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Get metrics for a specific journey
 */
export const getJourneyMetrics = query({
  args: {
    journeyId: v.string()
  },
  handler: getJourneyMetricsHandler
});