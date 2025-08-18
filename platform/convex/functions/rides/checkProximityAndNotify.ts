import { internalMutation, internalQuery } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { v } from "convex/values";

// this is the backend function to check proximity of drivers and passengers during a ride

// Constants for proximity thresholds
const DRIVER_10MIN_THRESHOLD = 10; // minutes
const DRIVER_5MIN_THRESHOLD = 5;   // minutes
const DRIVER_ARRIVED_THRESHOLD = 1; // minutes
const PASSENGER_AT_STOP_DISTANCE = 0.1; // km

// Debounce time constants (in milliseconds)
const NOTIFICATION_DEBOUNCE_TIME = 300000; // 5 minutes

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Estimate ETA based on distance (simplified - in production, use Google Maps API)
function estimateETA(distanceKm: number): number {
  // Assume average speed of 30 km/h in city traffic
  const averageSpeedKmh = 30;
  return (distanceKm / averageSpeedKmh) * 60; // Convert to minutes
}

// Helper function to check if a notification was sent recently
async function wasNotificationSentRecently(
  ctx: any,
  userId: string,
  notificationType: string,
  rideId: string,
  debounceTimeMs: number = NOTIFICATION_DEBOUNCE_TIME
): Promise<boolean> {
  const recentNotification = await ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .filter((q: any) => 
      q.and(
        q.eq(q.field("type"), notificationType),
        q.eq(q.field("metadata.rideId"), rideId),
        q.gt(q.field("_creationTime"), Date.now() - debounceTimeMs)
      )
    )
    .first();

  return !!recentNotification;
}

// Get active rides that need proximity monitoring
export const getActiveRidesForProximityCheck = internalQuery({
  args: {},
  handler: async (ctx) => {
    const activeRides = await ctx.db
      .query("rides")
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .collect();

    return activeRides;
  }
});

// Check proximity and send notifications for a specific ride
export const checkRideProximity = internalMutation({
  args: {
    rideId: v.string(),
    driverLat: v.number(),
    driverLon: v.number(),
    passengerLat: v.number(),
    passengerLon: v.number(),
    destinationLat: v.number(),
    destinationLon: v.number()
  },
  handler: async (ctx, args) => {
    const { rideId, driverLat, driverLon, passengerLat, passengerLon, destinationLat, destinationLon } = args;

    try {
      // Get the ride details
      const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q) => q.eq("rideId", rideId))
        .first();

      if (!ride) {
        console.log(`Ride ${rideId} not found for proximity check`);
        return;
      }

      if (!ride.driverId || !ride.passengerId) {
        console.log(`Ride ${rideId} missing driver or passenger ID`);
        return;
      }

      // Calculate distances
      const driverToPassengerDistance = calculateDistance(driverLat, driverLon, passengerLat, passengerLon);
      const passengerToDestinationDistance = calculateDistance(passengerLat, passengerLon, destinationLat, destinationLon);

      // Estimate ETAs
      const driverToPassengerETA = estimateETA(driverToPassengerDistance);
      const passengerToDestinationETA = estimateETA(passengerToDestinationDistance);

      // Calculate clock time ETA for driver arrival
      const now = new Date();
      const etaDate = new Date(now.getTime() + Math.round(driverToPassengerETA) * 60000);
      const etaHours = etaDate.getHours().toString().padStart(2, '0');
      const etaMinutes = etaDate.getMinutes().toString().padStart(2, '0');
      const etaString = `${etaHours}:${etaMinutes}`;

      console.log(`Proximity check for ride ${rideId}`);

      // Check for driver proximity alerts (for passenger)
      if (ride.status === "accepted" || ride.status === "in_progress") {
        
        // Check if driver is 10 minutes away
        if (driverToPassengerETA <= DRIVER_10MIN_THRESHOLD && driverToPassengerETA > DRIVER_5MIN_THRESHOLD) {
          const wasRecentlySent = await wasNotificationSentRecently(
            ctx, 
            ride.passengerId, 
            "driver_10min_away", 
            rideId,
            NOTIFICATION_DEBOUNCE_TIME
          );

          if (!wasRecentlySent && ride.passengerId) {
            await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
              userId: ride.passengerId,
              type: "driver_10min_away",
              title: "Driver Approaching",
              message: `Your driver will be arriving around ${etaString}. (Approximately 10 minutes away.)`,
              priority: "high",
              metadata: { rideId },
              scheduledFor: null,
              expiresAt: null
            });
            console.log(`Sent 10min alert for ride ${rideId}`);
          }
        }

        // Check if driver is 5 minutes away
        if (driverToPassengerETA <= DRIVER_5MIN_THRESHOLD && driverToPassengerETA > DRIVER_ARRIVED_THRESHOLD) {
          const wasRecentlySent = await wasNotificationSentRecently(
            ctx, 
            ride.passengerId, 
            "driver_5min_away", 
            rideId,
            NOTIFICATION_DEBOUNCE_TIME
          );

          if (!wasRecentlySent && ride.passengerId) {
            await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
              userId: ride.passengerId,
              type: "driver_5min_away",
              title: "Driver Almost Here",
              message: `Your driver will be arriving around ${etaString}. (Approximately 5 minutes away.)`,
              priority: "high",
              metadata: { rideId },
              scheduledFor: null,
              expiresAt: null
            });
            console.log(`Sent 5min alert for ride ${rideId}`);
          }
        }

        // Check if driver has arrived
        if (driverToPassengerETA <= DRIVER_ARRIVED_THRESHOLD) {
          const wasRecentlySent = await wasNotificationSentRecently(
            ctx, 
            ride.passengerId, 
            "driver_arrived", 
            rideId,
            NOTIFICATION_DEBOUNCE_TIME
          );

          if (!wasRecentlySent && ride.passengerId) {
            await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
              userId: ride.passengerId,
              type: "driver_arrived",
              title: "Driver Arrived",
              message: `Your driver has arrived at your location. (Expected around ${etaString})`,
              priority: "urgent",
              metadata: { rideId },
              scheduledFor: null,
              expiresAt: null
            });
            console.log(`Sent arrived alert for ride ${rideId}`);
          }
        }
      }

      // Check for passenger at destination alerts (for driver)
      if (ride.status === "in_progress") {
        if (passengerToDestinationDistance <= PASSENGER_AT_STOP_DISTANCE) {
          const wasRecentlySent = await wasNotificationSentRecently(
            ctx, 
            ride.driverId!, 
            "passenger_at_stop", 
            rideId,
            NOTIFICATION_DEBOUNCE_TIME
          );

          if (!wasRecentlySent && ride.driverId) {
            await ctx.runMutation(internal.functions.notifications.sendNotifications.sendNotificationInternal, {
              userId: ride.driverId,
              type: "passenger_at_stop",
              title: "Passenger at Destination",
              message: "Your passenger has arrived at their destination.",
              priority: "medium",
              metadata: { rideId },
              scheduledFor: null,
              expiresAt: null
            });
            console.log(`Sent passenger at stop alert for ride ${rideId}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error in checkRideProximity for ride ${rideId}:`, error);
    }
  }
});

// Main function to check all active rides for proximity
export const checkAllRidesProximity = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting proximity check for all active rides...");

    try {
      // Get all active rides
      const activeRides = await ctx.runQuery(internal.functions.rides.checkProximityAndNotify.getActiveRidesForProximityCheck);
      console.log(`Found ${activeRides.length} active rides to check`);

      for (const ride of activeRides) {
        try {
          console.log(`Checking proximity for ride ${ride.rideId} (status: ${ride.status})`);
          
          // Get driver location
          const driverLocation = await ctx.db
            .query("locations")
            .withIndex("by_user", (q) => q.eq("userId", ride.driverId!))
            .first();

          // Get passenger location
          const passengerLocation = await ctx.db
            .query("locations")
            .withIndex("by_user", (q) => q.eq("userId", ride.passengerId))
            .first();

          if (!driverLocation) {
            console.log(`No driver location found for ride ${ride.rideId}`);
            continue;
          }

          if (!passengerLocation) {
            console.log(`No passenger location found for ride ${ride.rideId}`);
            continue;
          }

          if (!ride.endLocation?.coordinates) {
            console.log(`No destination coordinates found for ride ${ride.rideId}`);
            continue;
          }

          await ctx.runMutation(internal.functions.rides.checkProximityAndNotify.checkRideProximity, {
            rideId: ride.rideId,
            driverLat: driverLocation.latitude,
            driverLon: driverLocation.longitude,
            passengerLat: passengerLocation.latitude,
            passengerLon: passengerLocation.longitude,
            destinationLat: ride.endLocation.coordinates.latitude,
            destinationLon: ride.endLocation.coordinates.longitude
          });
        } catch (error) {
          console.error(`Error checking proximity for ride ${ride.rideId}:`, error);
        }
      }

      console.log(`Completed proximity check for ${activeRides.length} rides`);
    } catch (error) {
      console.error("Error in checkAllRidesProximity:", error);
    }
  }
});