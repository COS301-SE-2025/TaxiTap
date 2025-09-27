import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get proximity status based on distance
function getProximityStatus(distance: number): 'far' | 'approaching' | 'near' | 'arrived' {
  if (distance <= 0.1) return 'arrived';
  if (distance <= 1) return 'near';
  if (distance <= 3) return 'approaching';
  return 'far';
}

// Calculate estimated time of arrival
function calculateETA(distance: number, averageSpeed: number = 30): number {
  return (distance / averageSpeed) * 60; // Returns minutes
}

// Format distance for display
function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

// Format time for display
function formatTime(minutes: number): string {
  if (minutes < 1) {
    return 'Less than 1 minute';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
}

// HEAVILY OPTIMIZED: Query only a small subset of active rides
export const getActiveRidesForProximityMonitoring = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 10, 20); // Cap at 20 rides maximum
    
    // Only get rides that are accepted and need proximity monitoring
    const activeRides = await ctx.db
      .query("rides")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .filter((q) => 
        // Only include rides where we haven't sent an alert in the last 3 minutes
        q.or(
          q.eq(q.field("lastProximityAlertAt"), undefined),
          q.lt(q.field("lastProximityAlertAt"), Date.now() - 3 * 60 * 1000)
        )
      )
      .take(limit); // Strict limit to prevent reading too many documents

    if (activeRides.length === 0) return [];

    // Get only the specific driver IDs we need
    const driverIds = activeRides
      .map(ride => ride.driverId)
      .filter((id): id is Id<"taxiTap_users"> => id !== undefined)
      .slice(0, limit); // Additional safety limit

    if (driverIds.length === 0) return [];

    // Get driver locations for only these specific drivers
    const driverLocations = await ctx.db
      .query("locations")
      .filter((q) => 
        q.or(...driverIds.slice(0, 10).map(id => q.eq(q.field("userId"), id))) // Limit to 10 driver locations max
      )
      .collect();

    // Create lookup map
    const locationMap = new Map();
    driverLocations.forEach(loc => {
      // Only use recent locations (within 5 minutes)
      if (loc.updatedAt > Date.now() - 5 * 60 * 1000) {
        locationMap.set(loc.userId, loc);
      }
    });

    const ridesWithLocations = [];

    for (const ride of activeRides) {
      if (!ride.driverId) continue;

      const driverLocation = locationMap.get(ride.driverId);
      if (driverLocation) {
        ridesWithLocations.push({
          ride,
          driverLocation: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            updatedAt: driverLocation.updatedAt,
          },
          pickupLocation: {
            latitude: ride.startLocation.coordinates.latitude,
            longitude: ride.startLocation.coordinates.longitude,
          }
        });
      }

      // Safety break to prevent processing too many
      if (ridesWithLocations.length >= 10) break;
    }

    return ridesWithLocations;
  }
});

// HEAVILY OPTIMIZED: Process minimal batch with strict limits
export const checkProximityAndSendAlerts = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    processedRides: number;
    alertsSent: number;
    hasMore: boolean;
  }> => {
    const batchSize = Math.min(args.batchSize || 5, 5); // Cap at 5 rides maximum
    
    try {
      const ridesToMonitor = await ctx.runQuery(
        api.functions.notifications.proximityMonitor.getActiveRidesForProximityMonitoring,
        { limit: batchSize }
      );

      if (ridesToMonitor.length === 0) {
        return {
          processedRides: 0,
          alertsSent: 0,
          hasMore: false,
        };
      }

      const notificationsToCreate: any[] = [];
      const ridesToUpdate: Array<{
        id: Id<"rides">;
        lastProximityAlertAt: number;
        lastProximityStatus: string;
      }> = [];

      for (const { ride, driverLocation, pickupLocation } of ridesToMonitor) {
        const distance = calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          pickupLocation.latitude,
          pickupLocation.longitude
        );

        const status = getProximityStatus(distance);
        
        // Only send alerts for significant proximity events
        if (status === 'approaching' || status === 'near' || status === 'arrived') {
          const eta = calculateETA(distance);
          
          let title: string;
          let message: string;

          switch (status) {
            case 'approaching':
              title = 'Driver Approaching';
              message = `Your driver is ${formatDistance(distance)} away. Estimated arrival: ${formatTime(eta)}`;
              break;
            case 'near':
              title = 'Driver Nearby';
              message = `Your driver is ${formatDistance(distance)} away. Please be ready for pickup.`;
              break;
            case 'arrived':
              title = 'Driver Arrived';
              message = 'Your driver has arrived at the pickup location.';
              break;
            default:
              continue;
          }

          const notificationPriority = status === 'arrived' ? 'urgent' as const : 'high' as const;
          notificationsToCreate.push({
            notificationId: `proximity_${ride.rideId}_${Date.now()}`,
            userId: ride.passengerId,
            type: "driver_5min_away" as const,
            title,
            message,
            isRead: false,
            isPush: true,
            metadata: {
              rideId: ride.rideId,
              driverId: ride.driverId,
              additionalData: {
                distance,
                eta,
                status,
                message
              }
            },
            priority: notificationPriority,
            createdAt: Date.now(),
          });

          ridesToUpdate.push({
            id: ride._id,
            lastProximityAlertAt: Date.now(),
            lastProximityStatus: status,
          });
        }
      }

      // Batch operations with error handling
      if (notificationsToCreate.length > 0) {
        const insertPromises = notificationsToCreate.map(notification => 
          ctx.db.insert("notifications", notification).catch(err => {
            console.error("Failed to insert notification:", err);
            return null;
          })
        );

        const updatePromises = ridesToUpdate.map(update => 
          ctx.db.patch(update.id, {
            lastProximityAlertAt: update.lastProximityAlertAt,
            lastProximityStatus: update.lastProximityStatus,
          }).catch(err => {
            console.error("Failed to update ride:", err);
            return null;
          })
        );

        await Promise.all([...insertPromises, ...updatePromises]);
      }
      
      return {
        processedRides: ridesToMonitor.length,
        alertsSent: notificationsToCreate.length,
        hasMore: ridesToMonitor.length >= batchSize,
      };

    } catch (error) {
      console.error("Proximity monitoring error:", error);
      return {
        processedRides: 0,
        alertsSent: 0,
        hasMore: false,
      };
    }
  }
});

// OPTIMIZED: Single ride proximity check
export const checkRideProximity = mutation({
  args: {
    rideId: v.string(),
    driverLocation: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    pickupLocation: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    forceCheck: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    reason?: string;
    status?: string;
    distance?: string;
    eta?: string;
  }> => {
    try {
      const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
        .first();

      if (!ride) return { success: false, reason: "Ride not found" };

      // Skip if we've sent a recent alert (unless forced)
      if (!args.forceCheck && 
          ride.lastProximityAlertAt && 
          ride.lastProximityAlertAt > Date.now() - 2 * 60 * 1000) {
        return { success: false, reason: "Recent alert already sent" };
      }

      const distance = calculateDistance(
        args.driverLocation.latitude,
        args.driverLocation.longitude,
        args.pickupLocation.latitude,
        args.pickupLocation.longitude
      );

      const status = getProximityStatus(distance);

      if (status === 'approaching' || status === 'near' || status === 'arrived') {
        const eta = calculateETA(distance);
        let title: string;
        let message: string;

        switch (status) {
          case 'approaching':
            title = 'Driver Approaching';
            message = `Your driver is ${formatDistance(distance)} away. Estimated arrival: ${formatTime(eta)}`;
            break;
          case 'near':
            title = 'Driver Nearby';
            message = `Your driver is ${formatDistance(distance)} away. Please be ready for pickup.`;
            break;
          case 'arrived':
            title = 'Driver Arrived';
            message = 'Your driver has arrived at the pickup location.';
            break;
          default:
            return { success: false, reason: "No alert needed" };
        }

        const notificationPriority = status === 'arrived' ? 'urgent' as const : 'high' as const;
        await Promise.all([
          ctx.db.insert("notifications", {
            notificationId: `proximity_${args.rideId}_${Date.now()}`,
            userId: ride.passengerId,
            type: "driver_5min_away" as const,
            title,
            message,
            isRead: false,
            isPush: true,
            metadata: {
              rideId: args.rideId,
              driverId: ride.driverId,
              additionalData: {
                distance,
                eta,
                status,
                message
              }
            },
            priority: notificationPriority,
            createdAt: Date.now(),
          }),
          ctx.db.patch(ride._id, {
            lastProximityAlertAt: Date.now(),
            lastProximityStatus: status,
          })
        ]);

        return { 
          success: true, 
          status, 
          distance: formatDistance(distance),
          eta: formatTime(eta)
        };
      }

      return { success: false, reason: "Driver not close enough" };

    } catch (error) {
      console.error("Single ride proximity check error:", error);
      return { success: false, reason: "Error occurred during proximity check" };
    }
  }
});

// Cleanup function for old notifications
export const cleanupOldProximityData = mutation({
  args: {},
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    try {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      
      const oldNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_type", (q) => q.eq("type", "driver_5min_away" as const))
        .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
        .take(100); // Limit cleanup to 100 notifications at a time

      const deletePromises = oldNotifications.map(notification => 
        ctx.db.delete(notification._id).catch(err => {
          console.error("Failed to delete notification:", err);
          return null;
        })
      );

      await Promise.all(deletePromises);
      
      return { deletedCount: oldNotifications.length };

    } catch (error) {
      console.error("Cleanup error:", error);
      return { deletedCount: 0 };
    }
  }
});