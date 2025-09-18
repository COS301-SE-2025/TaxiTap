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
            type: "transfer_approaching" as const,
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
            type: "transfer_arrived" as const,
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

// MULTI-LEG JOURNEY TRANSFER WINDOW MANAGEMENT
// ============================================================================

// Manage transfer window timing and coordination
export const manageTransferWindow = mutation({
  args: {
    journeyId: v.string(),
    legIndex: v.number(),
    action: v.union(
      v.literal("start_window"),
      v.literal("extend_window"),
      v.literal("close_window"),
      v.literal("check_status")
    ),
    extensionMinutes: v.optional(v.number()),
    passengerConfirmation: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    transferWindow?: {
      isActive: boolean;
      startTime: number;
      endTime: number;
      remainingTime: number;
      status: 'active' | 'expired' | 'extended' | 'closed';
    };
    nextLegStatus?: string;
    message?: string;
    error?: string;
  }> => {
    try {
      // Get the journey leg
      const leg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.legIndex)
        )
        .unique();

      if (!leg) {
        return { success: false, error: "Journey leg not found" };
      }

      const currentTime = Date.now();

      switch (args.action) {
        case "start_window":
          // Start a new transfer window
          const windowStart = currentTime;
          const windowEnd = currentTime + (15 * 60 * 1000); // 15 minutes default

          await ctx.db.patch(leg._id, {
            transferWindowStart: windowStart,
            transferWindowEnd: windowEnd
          });

          return {
            success: true,
            transferWindow: {
              isActive: true,
              startTime: windowStart,
              endTime: windowEnd,
              remainingTime: 15 * 60 * 1000,
              status: 'active' as const
            },
            message: "Transfer window started successfully"
          };

        case "extend_window":
          // Extend existing transfer window
          if (!leg.transferWindowStart || !leg.transferWindowEnd) {
            return { success: false, error: "No active transfer window to extend" };
          }

          const extensionTime = (args.extensionMinutes || 10) * 60 * 1000;
          const newEndTime = leg.transferWindowEnd + extensionTime;

          await ctx.db.patch(leg._id, {
            transferWindowEnd: newEndTime
          });

          return {
            success: true,
            transferWindow: {
              isActive: currentTime < newEndTime,
              startTime: leg.transferWindowStart,
              endTime: newEndTime,
              remainingTime: Math.max(0, newEndTime - currentTime),
              status: 'extended' as const
            },
            message: `Transfer window extended by ${args.extensionMinutes || 10} minutes`
          };

        case "close_window":
          // Close transfer window (passenger confirmed or leg completed)
          await ctx.db.patch(leg._id, {
            transferWindowEnd: currentTime
          });

          return {
            success: true,
            transferWindow: {
              isActive: false,
              startTime: leg.transferWindowStart || currentTime,
              endTime: currentTime,
              remainingTime: 0,
              status: 'closed' as const
            },
            message: "Transfer window closed"
          };

        case "check_status":
          // Check current transfer window status
          if (!leg.transferWindowStart || !leg.transferWindowEnd) {
            return {
              success: true,
              transferWindow: {
                isActive: false,
                startTime: 0,
                endTime: 0,
                remainingTime: 0,
                status: 'closed' as const
              },
              message: "No transfer window active"
            };
          }

          const isActive = currentTime >= leg.transferWindowStart && currentTime <= leg.transferWindowEnd;
          const remainingTime = Math.max(0, leg.transferWindowEnd - currentTime);
          const isExpired = currentTime > leg.transferWindowEnd;

          return {
            success: true,
            transferWindow: {
              isActive,
              startTime: leg.transferWindowStart,
              endTime: leg.transferWindowEnd,
              remainingTime,
              status: isExpired ? 'expired' as const : (isActive ? 'active' as const : 'closed' as const)
            },
            message: isActive ? "Transfer window is active" : (isExpired ? "Transfer window expired" : "Transfer window not started")
          };

        default:
          return { success: false, error: "Invalid action specified" };
      }

    } catch (error) {
      console.error("Transfer window management error:", error);
      return {
        success: false,
        error: `Failed to manage transfer window: ${error}`
      };
    }
  }
});

// Handle passenger transfer coordination
export const handlePassengerTransferCoordination = mutation({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
    passengerLocation: v.object({
      latitude: v.number(),
      longitude: v.number()
    }),
    action: v.union(
      v.literal("arrived_at_transfer"),
      v.literal("confirm_ready_for_next"),
      v.literal("request_assistance"),
      v.literal("cancel_next_leg")
    )
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    coordinationStatus?: {
      currentLegCompleted: boolean;
      nextLegStatus: string;
      waitingTime: number;
      assistanceRequested: boolean;
    };
    nextActions?: string[];
    message?: string;
    error?: string;
  }> => {
    try {
      // Get journey
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
        .unique();

      if (!journey) {
        return { success: false, error: "Journey not found" };
      }

      // Get current leg
      const currentLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.currentLegIndex)
        )
        .unique();

      if (!currentLeg) {
        return { success: false, error: "Current leg not found" };
      }

      const isLastLeg = args.currentLegIndex >= journey.totalLegs - 1;

      switch (args.action) {
        case "arrived_at_transfer":
          // Mark current leg as completed and start transfer window
          await ctx.db.patch(currentLeg._id, {
            status: "completed",
            completedAt: Date.now()
          });

          if (!isLastLeg) {
            // Start transfer window for next leg coordination
            await ctx.runMutation(
              api.functions.notifications.proximityMonitor.manageTransferWindow,
              {
                journeyId: args.journeyId,
                legIndex: args.currentLegIndex,
                action: "start_window"
              }
            );

            // Update journey progress
            await ctx.db.patch(journey._id, {
              currentLegIndex: args.currentLegIndex + 1,
              updatedAt: Date.now()
            });
          } else {
            // Complete entire journey
            await ctx.db.patch(journey._id, {
              status: "completed",
              completedAt: Date.now(),
              updatedAt: Date.now()
            });
          }

          return {
            success: true,
            coordinationStatus: {
              currentLegCompleted: true,
              nextLegStatus: isLastLeg ? "journey_completed" : "preparing",
              waitingTime: 0,
              assistanceRequested: false
            },
            nextActions: isLastLeg ? ["journey_completed"] : ["wait_for_next_taxi", "confirm_ready"],
            message: isLastLeg ? "Journey completed successfully!" : "Arrived at transfer point. Preparing next leg..."
          };

        case "confirm_ready_for_next":
          if (isLastLeg) {
            return { success: false, error: "Journey already completed" };
          }

          // Get next leg status
          const nextLeg = await ctx.db
            .query("journeyLegs")
            .withIndex("by_journey_and_leg", (q) =>
              q.eq("journeyId", args.journeyId).eq("legIndex", args.currentLegIndex + 1)
            )
            .unique();

          if (!nextLeg) {
            return { success: false, error: "Next leg not found" };
          }

          // Close current transfer window
          await ctx.runMutation(
            api.functions.notifications.proximityMonitor.manageTransferWindow,
            {
              journeyId: args.journeyId,
              legIndex: args.currentLegIndex,
              action: "close_window",
              passengerConfirmation: true
            }
          );

          return {
            success: true,
            coordinationStatus: {
              currentLegCompleted: true,
              nextLegStatus: nextLeg.status,
              waitingTime: nextLeg.transferWindowStart ? Date.now() - nextLeg.transferWindowStart : 0,
              assistanceRequested: false
            },
            nextActions: nextLeg.status === "active" ? ["board_next_taxi"] : ["wait_for_taxi_arrival"],
            message: "Ready for next leg. " + (nextLeg.status === "active" ? "Your taxi is ready!" : "Please wait for your taxi.")
          };

        case "request_assistance":
          // Create assistance notification
          await ctx.db.insert("notifications", {
            notificationId: `transfer_assistance_${args.journeyId}_${args.currentLegIndex}_${Date.now()}`,
            userId: journey.passengerId,
            type: "transfer_assistance_requested" as const,
            title: "Transfer Assistance Requested",
            message: "Passenger has requested assistance at transfer point. Customer service will contact you shortly.",
            isRead: false,
            isPush: true,
            metadata: {
              additionalData: {
                journeyId: args.journeyId,
                legIndex: args.currentLegIndex,
                passengerLocation: args.passengerLocation,
                assistanceType: "transfer_coordination"
              }
            },
            priority: "urgent" as const,
            createdAt: Date.now(),
          });

          // Extend transfer window
          await ctx.runMutation(
            api.functions.notifications.proximityMonitor.manageTransferWindow,
            {
              journeyId: args.journeyId,
              legIndex: args.currentLegIndex,
              action: "extend_window",
              extensionMinutes: 20
            }
          );

          return {
            success: true,
            coordinationStatus: {
              currentLegCompleted: true,
              nextLegStatus: "assistance_requested",
              waitingTime: currentLeg.transferWindowStart ? Date.now() - currentLeg.transferWindowStart : 0,
              assistanceRequested: true
            },
            nextActions: ["wait_for_assistance", "contact_support"],
            message: "Assistance requested. Customer service will contact you shortly. Transfer window extended."
          };

        case "cancel_next_leg":
          if (isLastLeg) {
            return { success: false, error: "Cannot cancel - journey already completed" };
          }

          // Cancel next leg and mark journey as completed at current point
          const nextLegToCancel = await ctx.db
            .query("journeyLegs")
            .withIndex("by_journey_and_leg", (q) =>
              q.eq("journeyId", args.journeyId).eq("legIndex", args.currentLegIndex + 1)
            )
            .unique();

          if (nextLegToCancel) {
            await ctx.db.patch(nextLegToCancel._id, {
              status: "failed"
            });
          }

          await ctx.db.patch(journey._id, {
            status: "completed",
            completedAt: Date.now(),
            updatedAt: Date.now()
          });

          return {
            success: true,
            coordinationStatus: {
              currentLegCompleted: true,
              nextLegStatus: "cancelled",
              waitingTime: 0,
              assistanceRequested: false
            },
            nextActions: ["journey_completed_early"],
            message: "Next leg cancelled. Journey completed at current location."
          };

        default:
          return { success: false, error: "Invalid coordination action" };
      }

    } catch (error) {
      console.error("Transfer coordination error:", error);
      return {
        success: false,
        error: `Failed to handle transfer coordination: ${error}`
      };
    }
  }
});

// Monitor and cleanup expired transfer windows
export const cleanupExpiredTransferWindows = mutation({
  args: {
    batchSize: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<{
    processedWindows: number;
    expiredWindowsClosed: number;
    notificationsSent: number;
  }> => {
    const batchSize = Math.min(args.batchSize || 10, 15);

    try {
      const currentTime = Date.now();

      // Find legs with expired transfer windows
      const expiredLegs = await ctx.db
        .query("journeyLegs")
        .withIndex("by_status", (q) => q.eq("status", "completed"))
        .filter((q) =>
          q.and(
            q.neq(q.field("transferWindowStart"), undefined),
            q.neq(q.field("transferWindowEnd"), undefined),
            q.lt(q.field("transferWindowEnd"), currentTime)
          )
        )
        .take(batchSize);

      let expiredWindowsClosed = 0;
      let notificationsSent = 0;

      for (const leg of expiredLegs as Array<any>) {
        // Get associated journey
        const journey = await ctx.db
          .query("multiLegJourneys")
          .withIndex("by_journey_id", (q) => q.eq("journeyId", leg.journeyId))
          .unique();

        if (!journey) continue;

        // Close the expired window
        await ctx.db.patch(leg._id, {
          transferWindowEnd: currentTime - 1000 // Mark as definitely expired
        });

        expiredWindowsClosed++;

        // Send notification about expired window
        await ctx.db.insert("notifications", {
          notificationId: `transfer_window_expired_${leg.journeyId}_${leg.legIndex}_${Date.now()}`,
          userId: journey.passengerId,
          type: "transfer_window_expired" as const,
          title: "Transfer Window Expired",
          message: "Your transfer window has expired. Please contact customer service if you need assistance.",
          isRead: false,
          isPush: true,
          metadata: {
            additionalData: {
              journeyId: leg.journeyId,
              legIndex: leg.legIndex,
              expiredAt: currentTime
            }
          },
          priority: "medium" as const,
          createdAt: Date.now(),
        });

        notificationsSent++;
      }

      return {
        processedWindows: expiredLegs.length,
        expiredWindowsClosed,
        notificationsSent
      };

    } catch (error) {
      console.error("Transfer window cleanup error:", error);
      return {
        processedWindows: 0,
        expiredWindowsClosed: 0,
        notificationsSent: 0
      };
    }
  }
});

// JOURNEY PROGRESSION INTEGRATION
// ============================================================================

// Monitor journey progression proximity and trigger journey management actions
export const monitorJourneyProgressionProximity = mutation({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
    driverLocation: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    rideId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    progressionTriggered: boolean;
    nextLegRequested: boolean;
    transferWindowActive: boolean;
    journeyCompleted: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      // Get journey and current leg
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
        .unique();

      if (!journey) {
        return { success: false, progressionTriggered: false, nextLegRequested: false, transferWindowActive: false, journeyCompleted: false, error: "Journey not found" };
      }

      const currentLeg = await ctx.db
        .query("journeyLegs")
        .withIndex("by_journey_and_leg", (q) =>
          q.eq("journeyId", args.journeyId).eq("legIndex", args.currentLegIndex)
        )
        .unique();

      if (!currentLeg) {
        return { success: false, progressionTriggered: false, nextLegRequested: false, transferWindowActive: false, journeyCompleted: false, error: "Current leg not found" };
      }

      const isLastLeg = args.currentLegIndex >= journey.totalLegs - 1;
      const transferPoint = isLastLeg ? journey.destinationCoordinates : currentLeg.toCoordinates;

      // Calculate distance to transfer/final destination
      const distance = calculateDistance(
        args.driverLocation.latitude,
        args.driverLocation.longitude,
        transferPoint.latitude,
        transferPoint.longitude
      );

      const status = getProximityStatus(distance);
      const eta = calculateETA(distance);

      let progressionTriggered = false;
      let nextLegRequested = false;
      let transferWindowActive = false;
      let journeyCompleted = false;

      // Handle final destination arrival
      if (isLastLeg && status === 'arrived') {
        // Trigger journey completion
        await ctx.runMutation(
          api.functions.journeys.journeyManagement.progressJourneyToNextLeg,
          {
            journeyId: args.journeyId,
            completedLegIndex: args.currentLegIndex,
            passengerLocation: args.driverLocation, // Assume passenger is with driver
            actualFare: currentLeg.actualFare
          }
        );

        // Send journey completion notification
        await ctx.db.insert("notifications", {
          notificationId: `journey_completed_${args.journeyId}_${Date.now()}`,
          userId: journey.passengerId,
          type: "journey_completed" as const,
          title: "Journey Completed!",
          message: "Your multi-leg journey has been completed successfully. Thank you for using TaxiTap!",
          isRead: false,
          isPush: true,
          metadata: {
            rideId: args.rideId,
            additionalData: {
              journeyId: args.journeyId,
              totalLegs: journey.totalLegs,
              finalDestination: journey.destinationAddress
            }
          },
          priority: "high" as const,
          createdAt: Date.now(),
        });

        progressionTriggered = true;
        journeyCompleted = true;
      }
      // Handle transfer point approach for non-final legs
      else if (!isLastLeg && (status === 'approaching' || status === 'near') && eta <= 5) {
        // Check if transfer window is already active
        const hasActiveWindow = currentLeg.transferWindowStart && currentLeg.transferWindowEnd &&
                               Date.now() >= currentLeg.transferWindowStart && Date.now() <= currentLeg.transferWindowEnd;

        if (!hasActiveWindow) {
          // Start transfer window management
          await ctx.runMutation(
            api.functions.notifications.proximityMonitor.manageTransferWindow,
            {
              journeyId: args.journeyId,
              legIndex: args.currentLegIndex,
              action: "start_window"
            }
          );
          transferWindowActive = true;
        }

        // Check if next leg taxi request is needed
        const nextLeg = await ctx.db
          .query("journeyLegs")
          .withIndex("by_journey_and_leg", (q) =>
            q.eq("journeyId", args.journeyId).eq("legIndex", args.currentLegIndex + 1)
          )
          .unique();

        if (nextLeg && nextLeg.status === "pending") {
          try {
            await ctx.runMutation(
              api.functions.journeys.journeyManagement.requestNextLegTaxi,
              {
                journeyId: args.journeyId,
                legIndex: nextLeg.legIndex,
                transferLocation: transferPoint,
                destinationLocation: nextLeg.toCoordinates,
                expandedRadius: 2.0
              }
            );
            nextLegRequested = true;

            // Send next leg requested notification
            await ctx.db.insert("notifications", {
              notificationId: `next_leg_requested_${args.journeyId}_${nextLeg.legIndex}_${Date.now()}`,
              userId: journey.passengerId,
              type: "next_leg_requested" as const,
              title: "Next Taxi Requested",
              message: `Approaching transfer point in ${formatTime(eta)}. Next leg taxi has been requested automatically.`,
              isRead: false,
              isPush: true,
              metadata: {
                rideId: args.rideId,
                additionalData: {
                  journeyId: args.journeyId,
                  currentLegIndex: args.currentLegIndex,
                  nextLegIndex: nextLeg.legIndex,
                  transferPoint,
                  eta
                }
              },
              priority: "high" as const,
              createdAt: Date.now(),
            });
          } catch (error) {
            console.error("Failed to request next leg taxi:", error);
          }
        }
      }
      // Handle transfer point arrival for non-final legs
      else if (!isLastLeg && status === 'arrived') {
        // Trigger leg completion and journey progression
        await ctx.runMutation(
          api.functions.journeys.journeyManagement.progressJourneyToNextLeg,
          {
            journeyId: args.journeyId,
            completedLegIndex: args.currentLegIndex,
            passengerLocation: args.driverLocation,
            actualFare: currentLeg.actualFare
          }
        );

        // Send leg completion notification
        await ctx.db.insert("notifications", {
          notificationId: `journey_leg_completed_${args.journeyId}_${args.currentLegIndex}_${Date.now()}`,
          userId: journey.passengerId,
          type: "journey_leg_completed" as const,
          title: "Transfer Point Reached",
          message: `Leg ${args.currentLegIndex + 1} of ${journey.totalLegs} completed. Preparing for next leg...`,
          isRead: false,
          isPush: true,
          metadata: {
            rideId: args.rideId,
            additionalData: {
              journeyId: args.journeyId,
              completedLegIndex: args.currentLegIndex,
              totalLegs: journey.totalLegs,
              transferPoint
            }
          },
          priority: "high" as const,
          createdAt: Date.now(),
        });

        progressionTriggered = true;
      }

      return {
        success: true,
        progressionTriggered,
        nextLegRequested,
        transferWindowActive,
        journeyCompleted,
        message: `Proximity monitoring successful. Status: ${status}, ETA: ${formatTime(eta)}`
      };

    } catch (error) {
      console.error("Journey progression proximity monitoring error:", error);
      return {
        success: false,
        progressionTriggered: false,
        nextLegRequested: false,
        transferWindowActive: false,
        journeyCompleted: false,
        error: `Failed to monitor journey progression proximity: ${error}`
      };
    }
  }
});

// Sync proximity monitoring with journey status updates
export const syncProximityWithJourneyStatus = mutation({
  args: {
    journeyId: v.string(),
    newStatus: v.union(
      v.literal("planning"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    currentLegIndex: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    monitoringEnabled: boolean;
    transferWindowsClosed: number;
    message?: string;
    error?: string;
  }> => {
    try {
      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
        .unique();

      if (!journey) {
        return { success: false, monitoringEnabled: false, transferWindowsClosed: 0, error: "Journey not found" };
      }

      let transferWindowsClosed = 0;

      // Handle status changes
      switch (args.newStatus) {
        case "completed":
        case "cancelled":
          // Close all active transfer windows for this journey
          const allLegs = await ctx.db
            .query("journeyLegs")
            .filter((q) => q.eq(q.field("journeyId"), args.journeyId))
            .collect();

          for (const leg of allLegs) {
            if (leg.transferWindowStart && leg.transferWindowEnd &&
                Date.now() < leg.transferWindowEnd) {
              await ctx.db.patch(leg._id, {
                transferWindowEnd: Date.now()
              });
              transferWindowsClosed++;
            }
          }

          return {
            success: true,
            monitoringEnabled: false,
            transferWindowsClosed,
            message: `Journey ${args.newStatus}. All transfer windows closed.`
          };

        case "paused":
          // Extend any active transfer windows by 30 minutes
          const activeLegs = await ctx.db
            .query("journeyLegs")
            .filter((q) =>
              q.and(
                q.eq(q.field("journeyId"), args.journeyId),
                q.neq(q.field("transferWindowStart"), undefined),
                q.neq(q.field("transferWindowEnd"), undefined),
                q.gt(q.field("transferWindowEnd"), Date.now())
              )
            )
            .collect();

          for (const leg of activeLegs) {
            if (leg.transferWindowEnd) {
              await ctx.db.patch(leg._id, {
                transferWindowEnd: leg.transferWindowEnd + (30 * 60 * 1000) // Add 30 minutes
              });
            }
          }

          return {
            success: true,
            monitoringEnabled: false,
            transferWindowsClosed: 0,
            message: "Journey paused. Transfer windows extended by 30 minutes."
          };

        case "active":
          return {
            success: true,
            monitoringEnabled: true,
            transferWindowsClosed: 0,
            message: "Journey active. Proximity monitoring enabled."
          };

        default:
          return {
            success: true,
            monitoringEnabled: false,
            transferWindowsClosed: 0,
            message: `Journey status updated to ${args.newStatus}`
          };
      }

    } catch (error) {
      console.error("Journey status sync error:", error);
      return {
        success: false,
        monitoringEnabled: false,
        transferWindowsClosed: 0,
        error: `Failed to sync proximity with journey status: ${error}`
      };
    }
  }
});

// Trigger journey progression events from proximity detection
export const triggerJourneyProgression = mutation({
  args: {
    rideId: v.string(),
    driverLocation: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    triggerType: v.union(
      v.literal("approaching_transfer"),
      v.literal("arrived_transfer"),
      v.literal("approaching_destination"),
      v.literal("arrived_destination")
    ),
    forceProgression: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    journeyProgressed: boolean;
    nextLegTriggered: boolean;
    journeyCompleted: boolean;
    message?: string;
    error?: string;
  }> => {
    try {
      // Get ride and associated journey
      const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
        .first();

      if (!ride || !ride.parentJourneyId) {
        return {
          success: false,
          journeyProgressed: false,
          nextLegTriggered: false,
          journeyCompleted: false,
          error: "No associated multi-leg journey found for this ride"
        };
      }

      const journey = await ctx.db
        .query("multiLegJourneys")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", ride.parentJourneyId as string))
        .unique();

      if (!journey) {
        return {
          success: false,
          journeyProgressed: false,
          nextLegTriggered: false,
          journeyCompleted: false,
          error: "Journey not found"
        };
      }

      // Use the integrated monitoring function
      const result = await ctx.runMutation(
        api.functions.notifications.proximityMonitor.monitorJourneyProgressionProximity,
        {
          journeyId: journey.journeyId,
          currentLegIndex: ride.legIndex || journey.currentLegIndex,
          driverLocation: args.driverLocation,
          rideId: args.rideId
        }
      );

      return {
        success: result.success,
        journeyProgressed: result.progressionTriggered,
        nextLegTriggered: result.nextLegRequested,
        journeyCompleted: result.journeyCompleted,
        message: result.message || `Journey progression triggered for ${args.triggerType}`,
        error: result.error
      };

    } catch (error) {
      console.error("Journey progression trigger error:", error);
      return {
        success: false,
        journeyProgressed: false,
        nextLegTriggered: false,
        journeyCompleted: false,
        error: `Failed to trigger journey progression: ${error}`
      };
    }
  }
});

// Cleanup function for old notifications
export const cleanupOldProximityData = mutation({
  args: {},
  handler: async (ctx): Promise<{ deletedCount: number }> => {
    try {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

      // Clean up both old proximity notifications and transfer notifications
      const proximityTypes = [
        "driver_5min_away",
        "transfer_approaching",
        "transfer_arrived",
        "transfer_window_started",
        "transfer_window_extended",
        "transfer_window_expired",
        "next_leg_requested",
        "next_leg_ready"
      ] as const;

      let totalDeleted = 0;

      for (const notificationType of proximityTypes) {
        const oldNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_type", (q) => q.eq("type", notificationType))
          .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
          .take(50); // Limit per type to prevent overwhelming

        const deletePromises = oldNotifications.map(notification =>
          ctx.db.delete(notification._id).catch(err => {
            console.error("Failed to delete notification:", err);
            return null;
          })
        );

        await Promise.all(deletePromises);
        totalDeleted += oldNotifications.length;
      }

      return { deletedCount: totalDeleted };

    } catch (error) {
      console.error("Cleanup error:", error);
      return { deletedCount: 0 };
    }
  }
});