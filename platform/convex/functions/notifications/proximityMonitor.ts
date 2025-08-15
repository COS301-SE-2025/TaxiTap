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

// Query to get active rides that need proximity monitoring
export const getActiveRidesForProximityMonitoring = query({
  args: {},
  handler: async (ctx) => {
    const activeRides = await ctx.db
      .query("rides")
      .withIndex("by_status", (q) => 
        q.eq("status", "accepted")
      )
      .collect();

    const ridesWithLocations = [];

    for (const ride of activeRides) {
      if (!ride.driverId) continue;

      // Get driver's current location
      const driverLocation = await ctx.db
        .query("locations")
        .withIndex("by_user", (q) => q.eq("userId", ride.driverId as Id<"taxiTap_users">))
        .first();

      if (driverLocation) {
        ridesWithLocations.push({
          ride,
          driverLocation: {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
          },
          pickupLocation: {
            latitude: ride.startLocation.coordinates.latitude,
            longitude: ride.startLocation.coordinates.longitude,
          }
        });
      }
    }

    return ridesWithLocations;
  }
});

// Background function to check proximity and send alerts
export const checkProximityAndSendAlerts = mutation({
  args: {},
  handler: async (ctx) => {
    const ridesToMonitor = await ctx.runQuery(
      api.functions.notifications.proximityMonitor.getActiveRidesForProximityMonitoring
    );

    for (const { ride, driverLocation, pickupLocation } of ridesToMonitor) {
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        pickupLocation.latitude,
        pickupLocation.longitude
      );

      const status = getProximityStatus(distance);
      const eta = calculateETA(distance);

      // Check if we should send a proximity alert
      if (status === 'approaching' || status === 'near' || status === 'arrived') {
        // Check if we've already sent a recent alert for this ride
        const recentAlert = await ctx.db
          .query("notifications")
          .withIndex("by_user_id", (q) => q.eq("userId", ride.passengerId))
          .filter((q) => 
            q.and(
              q.eq(q.field("type"), "driver_5min_away"),
              q.eq(q.field("metadata.rideId"), ride.rideId),
              q.gte(q.field("createdAt"), Date.now() - 2 * 60 * 1000) // Last 2 minutes
            )
          )
          .first();

        if (!recentAlert) {
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

          // Create notification directly instead of using rideNotifications
          await ctx.db.insert("notifications", {
            notificationId: `proximity_${ride.rideId}_${Date.now()}`,
            userId: ride.passengerId,
            type: "driver_5min_away",
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
            priority: status === 'arrived' ? 'urgent' : 'high',
            createdAt: Date.now(),
          });
        }
      }
    }
  }
});

// Function to manually trigger proximity check for a specific ride
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
    })
  },
  handler: async (ctx, args) => {
    const distance = calculateDistance(
      args.driverLocation.latitude,
      args.driverLocation.longitude,
      args.pickupLocation.latitude,
      args.pickupLocation.longitude
    );

    const status = getProximityStatus(distance);
    const eta = calculateETA(distance);

    if (status === 'approaching' || status === 'near' || status === 'arrived') {
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
          return;
      }

      // Get the ride to find passenger ID
      const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
        .first();

      if (ride) {
        // Create notification directly
        await ctx.db.insert("notifications", {
          notificationId: `proximity_${args.rideId}_${Date.now()}`,
          userId: ride.passengerId,
          type: "driver_5min_away",
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
          priority: status === 'arrived' ? 'urgent' : 'high',
          createdAt: Date.now(),
        });
      }
    }
  }
});
