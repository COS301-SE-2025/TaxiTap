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

// MULTI-LEG JOURNEY PROXIMITY MONITORING
// ============================================================================

// Get active multi-leg journeys that need transfer point monitoring
export const getActiveMultiLegJourneysForMonitoring = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    journey: any;
    currentLeg: any;
    ride: any;
    driverLocation: {
      latitude: number;
      longitude: number;
      updatedAt: number;
    };
    transferPoint: {
      latitude: number;
      longitude: number;
    };
  }>> => {
    const limit = Math.min(args.limit || 10, 15); // Cap at 15 journeys maximum

    // Get active multi-leg journeys
    const activeJourneys = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(limit);

    if (activeJourneys.length === 0) return [];

    const journeysWithActiveRides: Array<{
      journey: any;
      currentLeg: any;
      ride: any;
      driverLocation: {
        latitude: number;
        longitude: number;
        updatedAt: number;
      };
      transferPoint: {
        latitude: number;
        longitude: number;
      };
    }> = [];

    for (const journey of activeJourneys) {
      // Get current active leg
      const currentLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q) =>
          q.eq("journeyId", journey.journeyId).eq("legIndex", journey.currentLegIndex)
        )
        .unique();

      if (!currentLeg || !currentLeg.rideId) continue;

      // Get the active ride for this leg
      const ride = await ctx.db.get(currentLeg.rideId);
      if (!ride || ride.status !== "in_progress") continue;

      // Get driver location
      const driverLocation = await ctx.db
        .query("locations")
        .filter((q) => q.eq(q.field("userId"), ride.driverId))
        .first();

      if (!driverLocation || driverLocation.updatedAt < Date.now() - 5 * 60 * 1000) continue;

      journeysWithActiveRides.push({
        journey,
        currentLeg,
        ride,
        driverLocation: {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          updatedAt: driverLocation.updatedAt,
        },
        transferPoint: currentLeg.toCoordinates, // Destination of current leg = transfer point
      });

      if (journeysWithActiveRides.length >= 10) break; // Safety limit
    }

    return journeysWithActiveRides;
  }
});

// Check multi-leg journey transfer point proximity and trigger next leg requests
export const checkMultiLegTransferProximity = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    processedJourneys: number;
    transferAlertsCreated: number;
    nextLegRequestsTriggered: number;
    hasMore: boolean;
  }> => {
    const batchSize = Math.min(args.batchSize || 5, 5);

    try {
      const journeysToMonitor = await ctx.runQuery(
        api.functions.notifications.proximityMonitor.getActiveMultiLegJourneysForMonitoring,
        { limit: batchSize }
      ) as Array<{
        journey: any;
        currentLeg: any;
        ride: any;
        driverLocation: { latitude: number; longitude: number; updatedAt: number };
        transferPoint: { latitude: number; longitude: number };
      }>;

      if (journeysToMonitor.length === 0) {
        return {
          processedJourneys: 0,
          transferAlertsCreated: 0,
          nextLegRequestsTriggered: 0,
          hasMore: false,
        };
      }

      let transferAlertsCreated = 0;
      let nextLegRequestsTriggered = 0;

      for (const { journey, currentLeg, ride, driverLocation, transferPoint } of journeysToMonitor) {
        const distance = calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          transferPoint.latitude,
          transferPoint.longitude
        );

        const status = getProximityStatus(distance);
        const eta = calculateETA(distance);

        // Check if approaching transfer point (5-minute window)
        if ((status === 'approaching' || status === 'near') && eta <= 5) {

          // Create transfer approach notification
          const notificationTitle = `Approaching Transfer Point`;
          const notificationMessage = `You'll reach your transfer point in ${formatTime(eta)}. Preparing next leg...`;

          await ctx.db.insert("notifications", {
            notificationId: `transfer_approach_${journey.journeyId}_${currentLeg.legIndex}_${Date.now()}`,
            userId: journey.passengerId,
            type: "driver_5min_away" as const,
            title: notificationTitle,
            message: notificationMessage,
            isRead: false,
            isPush: true,
            metadata: {
              rideId: ride.rideId,
              additionalData: {
                journeyId: journey.journeyId,
                currentLegIndex: currentLeg.legIndex,
                transferPoint,
                distance,
                eta,
                status,
                isTransferProximity: true
              }
            },
            priority: "high" as const,
            createdAt: Date.now(),
          });

          transferAlertsCreated++;

          // Update journey leg with transfer window timing
          await ctx.db.patch(currentLeg._id, {
            transferWindowStart: Date.now(),
            transferWindowEnd: Date.now() + (15 * 60 * 1000) // 15-minute window
          });

          // Trigger next leg taxi request if not already done
          const isLastLeg = currentLeg.legIndex >= journey.totalLegs - 1;
          if (!isLastLeg) {
            // Check if next leg request already triggered
            const nextLeg = await ctx.db
              .query("journeyLegs")
              .withIndex("by_journey_and_leg", (q) =>
                q.eq("journeyId", journey.journeyId).eq("legIndex", currentLeg.legIndex + 1)
              )
              .unique();

            if (nextLeg && nextLeg.status === "pending") {
              // Trigger automatic next leg request
              try {
                await ctx.runMutation(
                  api.functions.journeys.journeyManagement.requestNextLegTaxi,
                  {
                    journeyId: journey.journeyId,
                    legIndex: nextLeg.legIndex,
                    transferLocation: transferPoint,
                    destinationLocation: nextLeg.toCoordinates,
                    expandedRadius: 2.0 // Larger radius for transfer points
                  }
                );
                nextLegRequestsTriggered++;
              } catch (error) {
                console.error(`Failed to request next leg for journey ${journey.journeyId}:`, error);
              }
            }
          }
        }

        // Check if arrived at transfer point
        if (status === 'arrived') {
          const arrivalMessage = `You've arrived at the transfer point. ${
            currentLeg.legIndex >= journey.totalLegs - 1
              ? 'Journey completed!'
              : 'Please wait for your next taxi.'
          }`;

          await ctx.db.insert("notifications", {
            notificationId: `transfer_arrival_${journey.journeyId}_${currentLeg.legIndex}_${Date.now()}`,
            userId: journey.passengerId,
            type: "driver_arrived" as const,
            title: "Transfer Point Reached",
            message: arrivalMessage,
            isRead: false,
            isPush: true,
            metadata: {
              rideId: ride.rideId,
              additionalData: {
                journeyId: journey.journeyId,
                currentLegIndex: currentLeg.legIndex,
                transferPoint,
                isTransferArrival: true
              }
            },
            priority: "urgent" as const,
            createdAt: Date.now(),
          });

          transferAlertsCreated++;
        }
      }

      return {
        processedJourneys: journeysToMonitor.length,
        transferAlertsCreated,
        nextLegRequestsTriggered,
        hasMore: journeysToMonitor.length >= batchSize,
      };

    } catch (error) {
      console.error("Multi-leg transfer proximity monitoring error:", error);
      return {
        processedJourneys: 0,
        transferAlertsCreated: 0,
        nextLegRequestsTriggered: 0,
        hasMore: false,
      };
    }
  }
});

// Check specific multi-leg journey transfer proximity
export const checkSpecificJourneyTransferProximity = mutation({
  args: {
    journeyId: v.string(),
    driverLocation: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    transferPoint: v.object({
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
    nextLegRequested?: boolean;
  }> => {
    try {
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
        .unique();

      if (!journey) return { success: false, reason: "Journey not found" };

      const distance = calculateDistance(
        args.driverLocation.latitude,
        args.driverLocation.longitude,
        args.transferPoint.latitude,
        args.transferPoint.longitude
      );

      const status = getProximityStatus(distance);
      const eta = calculateETA(distance);

      let nextLegRequested = false;

      if (status === 'approaching' || status === 'near' || status === 'arrived') {
        // Handle transfer point proximity logic
        if ((status === 'approaching' || status === 'near') && eta <= 5) {
          // Trigger next leg request if not last leg
          const isLastLeg = journey.currentLegIndex >= journey.totalLegs - 1;
          if (!isLastLeg) {
            const nextLeg = await ctx.db
              .query("journeyLegs")
              .withIndex("by_journey_and_leg", (q) =>
                q.eq("journeyId", args.journeyId).eq("legIndex", journey.currentLegIndex + 1)
              )
              .unique();

            if (nextLeg && nextLeg.status === "pending") {
              try {
                await ctx.runMutation(
                  api.functions.journeys.journeyManagement.requestNextLegTaxi,
                  {
                    journeyId: args.journeyId,
                    legIndex: nextLeg.legIndex,
                    transferLocation: args.transferPoint,
                    destinationLocation: nextLeg.toCoordinates,
                    expandedRadius: 2.0
                  }
                );
                nextLegRequested = true;
              } catch (error) {
                console.error("Failed to request next leg:", error);
              }
            }
          }
        }

        return {
          success: true,
          status,
          distance: formatDistance(distance),
          eta: formatTime(eta),
          nextLegRequested
        };
      }

      return { success: false, reason: "Not close enough to transfer point" };

    } catch (error) {
      console.error("Specific journey transfer proximity check error:", error);
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