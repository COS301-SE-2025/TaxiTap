import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const endTrip = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, { passengerId }) => {
    console.log("🔍 endTrip called for passengerId:", passengerId);
    
    // Step 1: Find the most recent ongoing trip
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_passenger_and_startTime", q => q.eq("passengerId", passengerId))
      .order("desc")
      .collect();

    console.log("📋 Found trips:", trips.length);
    
    const ongoingTrip = trips.find(t => t.endTime === 0);
    if (!ongoingTrip) {
      throw new Error("No ongoing trip found for this passenger.");
    }

    console.log("🚗 Ongoing trip found:", {
      tripId: ongoingTrip._id,
      driverId: ongoingTrip.driverId,
      passengerId: ongoingTrip.passengerId,
      startTime: ongoingTrip.startTime
    });

    // Step 2: Try to find the corresponding ride using multiple strategies
    let ride = null;
    
    // Strategy 1: Try to find ride by tripId (if the trip-ride linkage exists)
    if (ongoingTrip._id) {
      try {
        console.log("🔍 Strategy 1: Looking for ride by tripId:", ongoingTrip._id);
        ride = await ctx.db
          .query("rides")
          .withIndex("by_trip_id", q => q.eq("tripId", ongoingTrip._id))
          .unique();
        
        if (ride) {
          console.log("✅ Strategy 1 succeeded, found ride:", ride._id);
        } else {
          console.log("❌ Strategy 1 failed, no ride found by tripId");
        }
      } catch (error) {
        // If the index lookup fails, continue to alternative strategies
        console.log("❌ Strategy 1 failed with error:", error);
      }
    }

    // Strategy 2: If tripId lookup failed, try to find ride by passenger and driver
    if (!ride && ongoingTrip.driverId) {
      console.log("🔍 Strategy 2: Looking for ride by passenger and driver");
      ride = await ctx.db
        .query("rides")
        .withIndex("by_passenger_and_driver", q => 
          q.eq("passengerId", passengerId).eq("driverId", ongoingTrip.driverId)
        )
        .filter(q => 
          q.or(
            q.eq(q.field("status"), "in_progress"),
            q.eq(q.field("status"), "completed")
          )
        )
        .order("desc")
        .first();
      
      if (ride) {
        console.log("✅ Strategy 2 succeeded, found ride:", ride._id);
      } else {
        console.log("❌ Strategy 2 failed, no ride found by passenger and driver");
      }
    }

    // Strategy 3: If still no ride found, try to find any recent ride for this passenger
    if (!ride) {
      console.log("🔍 Strategy 3: Looking for any recent ride by passenger");
      ride = await ctx.db
        .query("rides")
        .withIndex("by_passenger", q => q.eq("passengerId", passengerId))
        .filter(q => 
          q.or(
            q.eq(q.field("status"), "in_progress"),
            q.eq(q.field("status"), "completed")
          )
        )
        .order("desc")
        .first();
      
      if (ride) {
        console.log("✅ Strategy 3 succeeded, found ride:", ride._id);
      } else {
        console.log("❌ Strategy 3 failed, no ride found by passenger");
      }
    }

    if (!ride) {
      console.log("💥 All strategies failed, no ride found");
      throw new Error("No ride found for this trip. This may indicate a data consistency issue.");
    }

    console.log("🎯 Final ride found:", {
      rideId: ride._id,
      status: ride.status,
      estimatedFare: ride.estimatedFare,
      finalFare: ride.finalFare
    });

    // Step 3: Get the fare (try multiple sources)
    let fare = 0;
    
    if (ride.estimatedFare && ride.estimatedFare > 0) {
      fare = ride.estimatedFare;
      console.log("💰 Using estimatedFare:", fare);
    } else if (ride.finalFare && ride.finalFare > 0) {
      fare = ride.finalFare;
      console.log("💰 Using finalFare:", fare);
    } else {
      // If no fare is available, use a default or throw an error
      console.log("💥 No fare available");
      throw new Error("No fare information available for this trip. Please contact support.");
    }

    const endTime = Date.now();

    // Step 4: Patch the trip with the endTime and fare
    await ctx.db.patch(ongoingTrip._id, {
      endTime,
      fare: fare,
    });

    console.log("✅ Trip ended successfully:", { endTime, fare });

    return { endTime, fare: fare };
  },
});