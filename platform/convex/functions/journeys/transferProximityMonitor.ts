import { mutation, query, internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

// Transfer point proximity threshold (1km as per requirements)
const TRANSFER_PROXIMITY_THRESHOLD = 1.0; // kilometers

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

/**
 * Check proximity of active multi-leg journey drivers to their transfer points
 */
export const checkTransferPointProximity = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx: QueryCtx, args) => {
    const limit = Math.min(args.limit || 10, 20); // Cap at 20 journeys maximum

    // Get active multi-leg journeys that are in progress
    const activeJourneys = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_status", (q) => q.eq("status", "in_progress"))
      .take(limit);

    if (activeJourneys.length === 0) return [];

    const proximityAlerts: Array<{
      journeyId: string;
      currentLegIndex: number;
      driverDistance: number;
      transferPoint: any;
      rideId: Id<"rides">;
      driverId: Id<"taxiTap_users">;
      passengerId: Id<"taxiTap_users">;
    }> = [];

    for (const journey of activeJourneys) {
      const currentLeg = journey.legs[journey.currentLegIndex];

      // Skip if current leg is not in progress or is the last leg
      if (currentLeg?.status !== "in_progress" || journey.currentLegIndex >= journey.totalLegs - 1) {
        continue;
      }

      if (!currentLeg.rideId || !currentLeg.driverId) {
        continue;
      }

      // Get current ride to check driver location
      const ride = await ctx.db.get(currentLeg.rideId);
      if (!ride || ride.status !== "accepted") {
        continue;
      }

      // Get driver's current location from locations table
      const driverLocation = await ctx.db
        .query("locations")
        .withIndex("by_user", (q) => q.eq("userId", currentLeg.driverId!))
        .order("desc")
        .first();

      if (!driverLocation || driverLocation.updatedAt < Date.now() - 5 * 60 * 1000) {
        continue; // Skip if no recent location (within 5 minutes)
      }

      // Get transfer point coordinates (destination of current leg)
      const transferStopLat = currentLeg.destination.coordinates.latitude;
      const transferStopLng = currentLeg.destination.coordinates.longitude;

      // Calculate distance from driver to transfer point
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        transferStopLat,
        transferStopLng
      );

      // Check if driver is within 1km of transfer point
      if (distance <= TRANSFER_PROXIMITY_THRESHOLD) {
        console.log(`🚩 Driver ${currentLeg.driverId} is ${distance.toFixed(2)}km from transfer point for journey ${journey.journeyId}`);

        proximityAlerts.push({
          journeyId: journey.journeyId,
          currentLegIndex: journey.currentLegIndex,
          driverDistance: distance,
          transferPoint: journey.transferPoint,
          rideId: currentLeg.rideId,
          driverId: currentLeg.driverId,
          passengerId: journey.passengerId,
        });
      }
    }

    return proximityAlerts;
  },
});

/**
 * Trigger transfer point arrival notification and leg completion
 */
export const triggerTransferPointArrival = internalMutation({
  args: {
    journeyId: v.string(),
    currentLegIndex: v.number(),
    actualCost: v.number(),
  },
  handler: async (ctx: MutationCtx, { journeyId, currentLegIndex, actualCost }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey) {
      throw new Error(`Journey ${journeyId} not found`);
    }

    const currentLeg = journey.legs[currentLegIndex];
    if (!currentLeg) {
      throw new Error(`Leg ${currentLegIndex} not found for journey ${journeyId}`);
    }

    console.log(`🎯 Transfer point reached for journey ${journeyId}, leg ${currentLegIndex + 1}`);

    const now = Date.now();

    // Update the current leg as completed
    const updatedLegs = journey.legs.map((leg, index) => {
      if (index === currentLegIndex) {
        return {
          ...leg,
          status: "completed" as const,
          actualCost,
          completedAt: now,
        };
      }
      return leg;
    });

    const totalActualCost = updatedLegs
      .filter(leg => leg.actualCost !== undefined)
      .reduce((sum, leg) => sum + (leg.actualCost || 0), 0);

    // Update the corresponding ride and trip records for driver statistics
    if (currentLeg.rideId) {
      try {
        const ride = await ctx.db.get(currentLeg.rideId);
        if (ride) {
          // Verify that payment has been confirmed before completing the leg
          if (ride.tripPaid !== true) {
            throw new Error("Payment must be confirmed before completing this leg of the journey. Please use the payment confirmation screen first.");
          }

          // Use the actual payment amount from the ride record, not the passed actualCost
          const actualPaymentAmount = ride.amountPaid || actualCost;

          // Update ride with final cost information
          await ctx.db.patch(currentLeg.rideId, {
            finalFare: actualPaymentAmount,
            paymentConfirmedAt: now,
          });

          // Update the corresponding trip record for driver statistics
          if (ride.tripId) {
            const trip = await ctx.db.get(ride.tripId);
            if (trip) {
              await ctx.db.patch(ride.tripId, {
                fare: actualPaymentAmount,
                endTime: now,
              });
              console.log(`Updated multi-leg trip ${ride.tripId} fare to ${actualPaymentAmount} for transfer at leg ${currentLegIndex + 1}`);
            }
          }

          // Update the actualCost to match the payment amount for consistency
          actualCost = actualPaymentAmount;
        }
      } catch (error) {
        console.error(`Error updating trip record for multi-leg journey transfer at leg ${currentLegIndex}:`, error);
        throw error; // Re-throw payment verification errors
      }
    }

    const isLastLeg = currentLegIndex === journey.totalLegs - 1;
    const isJourneyComplete = isLastLeg;

    await ctx.db.patch(journey._id, {
      legs: updatedLegs,
      totalActualCost,
      updatedAt: now,
      ...(isJourneyComplete && {
        status: "completed",
        completedAt: now,
      }),
      ...(!isJourneyComplete && {
        // Set up transfer window for next leg
        transferTimeoutAt: now + (5 * 60 * 1000), // 5 minutes from now
      }),
    });

    // Send notification to passenger about transfer point arrival
    await ctx.db.insert("notifications", {
      notificationId: `transfer-${journeyId}-${currentLegIndex}-${now}`,
      userId: journey.passengerId,
      type: "transfer_arrived",
      title: `Transfer Point Reached`,
      message: isJourneyComplete
        ? `Your journey is complete! Total cost: R${totalActualCost.toFixed(2)}`
        : `Leg ${currentLegIndex + 1} complete! You have 5 minutes to board the next taxi for leg ${currentLegIndex + 2}.`,
      isRead: false,
      isPush: true,
      priority: "high",
      createdAt: now,
      metadata: {
        rideId: currentLeg.rideId?.toString(),
        passengerId: journey.passengerId,
        driverId: currentLeg.driverId,
        additionalData: {
          journeyId,
          currentLegIndex,
          isJourneyComplete,
          transferTimeoutAt: isJourneyComplete ? undefined : now + (5 * 60 * 1000),
        },
      },
    });

    console.log(`✅ Transfer point arrival processed for journey ${journeyId}`);

    // Return information about next leg if journey continues
    if (!isJourneyComplete && currentLegIndex + 1 < journey.totalLegs) {
      const nextLeg = journey.legs[currentLegIndex + 1];
      return {
        success: true,
        journeyComplete: false,
        nextLeg: {
          ...nextLeg,
          legIndex: currentLegIndex + 1,
        },
        transferTimeoutAt: now + (5 * 60 * 1000),
        message: `Ready for leg ${currentLegIndex + 2}! You have 5 minutes to board.`,
      };
    }

    return {
      success: true,
      journeyComplete: true,
      totalActualCost,
      message: `Journey complete! Total cost: R${totalActualCost.toFixed(2)}`,
    };
  },
});

/**
 * Get transfer point proximity status for a specific journey
 */
export const getTransferProximityStatus = query({
  args: {
    journeyId: v.string(),
  },
  handler: async (ctx: QueryCtx, { journeyId }) => {
    const journey = await ctx.db
      .query("multiLegJourneys")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
      .unique();

    if (!journey || journey.status !== "in_progress") {
      return null;
    }

    const currentLeg = journey.legs[journey.currentLegIndex];
    if (!currentLeg || currentLeg.status !== "in_progress" || !currentLeg.driverId) {
      return null;
    }

    // Get driver's current location from locations table
    const driverLocation = await ctx.db
      .query("locations")
      .withIndex("by_user", (q) => q.eq("userId", currentLeg.driverId!))
      .order("desc")
      .first();

    if (!driverLocation || driverLocation.updatedAt < Date.now() - 5 * 60 * 1000) {
      return null; // Skip if no recent location (within 5 minutes)
    }

    // Calculate distance to transfer point
    const transferStopLat = currentLeg.destination.coordinates.latitude;
    const transferStopLng = currentLeg.destination.coordinates.longitude;

    const distance = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      transferStopLat,
      transferStopLng
    );

    return {
      journeyId,
      currentLegIndex: journey.currentLegIndex,
      distanceToTransfer: distance,
      isNearTransfer: distance <= TRANSFER_PROXIMITY_THRESHOLD,
      transferPoint: journey.transferPoint,
      estimatedArrival: distance <= 0.1 ? "Arrived" : `${Math.ceil((distance / 30) * 60)} min`, // rough ETA
    };
  },
});