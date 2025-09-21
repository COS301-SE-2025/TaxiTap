import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const setFrontPassenger = mutation({
  args: { rideId: v.string() },
  handler: async (ctx, args) => {
    const { rideId } = args;

    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q) => q.eq("rideId", rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    if (ride.status !== "in_progress") {
      throw new Error("Only active rides can have front passengers set");
    }

    const driverId = ride.driverId;
    if (!driverId) {
      throw new Error("No driver assigned to this ride");
    }

    const driverActiveRides = await ctx.db
      .query("rides")
      .withIndex("by_driver", (q) => q.eq("driverId", driverId))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .collect();

    for (const activeRide of driverActiveRides) {
      if (activeRide._id !== ride._id && activeRide.isFrontPassenger) {
        await ctx.db.patch(activeRide._id, {
          isFrontPassenger: false,
          frontPassengerSetAt: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(ride._id, {
      isFrontPassenger: true,
      frontPassengerSetAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Front passenger set successfully",
      rideId: rideId,
    };
  },
});

export const removeFrontPassenger = mutation({
  args: { rideId: v.string() },
  handler: async (ctx, args) => {
    const { rideId } = args;

    const ride = await ctx.db
      .query("rides")
      .withIndex("by_ride_id", (q) => q.eq("rideId", rideId))
      .first();

    if (!ride) {
      throw new Error("Ride not found");
    }

    if (!ride.isFrontPassenger) {
      throw new Error("This passenger is not currently set as front passenger");
    }

    await ctx.db.patch(ride._id, {
      isFrontPassenger: false,
      frontPassengerSetAt: undefined,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Front passenger status removed successfully",
      rideId: rideId,
    };
  },
});

export const getFrontPassenger = mutation({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, args) => {
    const { driverId } = args;

    const frontPassengerRide = await ctx.db
      .query("rides")
      .withIndex("by_driver", (q) => q.eq("driverId", driverId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("isFrontPassenger"), true)
        )
      )
      .first();

    if (!frontPassengerRide) {
      return {
        hasFrontPassenger: false,
        frontPassenger: null,
      };
    }

    const passenger = await ctx.db.get(frontPassengerRide.passengerId);

    return {
      hasFrontPassenger: true,
      frontPassenger: {
        rideId: frontPassengerRide.rideId,
        name: passenger?.name,
        phoneNumber: passenger?.phoneNumber,
        setAt: frontPassengerRide.frontPassengerSetAt,
      },
    };
  },
});

export const checkPassengerFrontStatus = query({
  args: { passengerId: v.id("taxiTap_users") },
  handler: async (ctx, args) => {
    const { passengerId } = args;

    // Find any active ride where this passenger is marked as front passenger
    const frontPassengerRide = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", passengerId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("isFrontPassenger"), true)
        )
      )
      .first();

    if (!frontPassengerRide) {
      return {
        isFrontPassenger: false,
        rideInfo: null,
      };
    }

    // Get driver information for additional context
    const driver = frontPassengerRide.driverId 
      ? await ctx.db.get(frontPassengerRide.driverId)
      : null;

    return {
      isFrontPassenger: true,
      rideInfo: {
        rideId: frontPassengerRide.rideId,
        driverId: frontPassengerRide.driverId,
        driverName: driver?.name || "Unknown Driver",
        driverPhone: driver?.phoneNumber || "",
        startLocation: frontPassengerRide.startLocation,
        endLocation: frontPassengerRide.endLocation,
        setAsFrontAt: frontPassengerRide.frontPassengerSetAt,
        estimatedFare: frontPassengerRide.estimatedFare,
        finalFare: frontPassengerRide.finalFare,
      },
    };
  },
});

// Additional helper function to get all front passengers for a specific driver
export const getDriverFrontPassengers = query({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, args) => {
    const { driverId } = args;

    // Find all active rides for this driver where passengers are marked as front passengers
    const frontPassengerRides = await ctx.db
      .query("rides")
      .withIndex("by_driver_and_front", (q) => 
        q.eq("driverId", driverId).eq("isFrontPassenger", true)
      )
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .collect();

    const frontPassengers = [];

    for (const ride of frontPassengerRides) {
      const passenger = await ctx.db.get(ride.passengerId);
      if (passenger) {
        frontPassengers.push({
          rideId: ride.rideId,
          passengerId: ride.passengerId,
          passengerName: passenger.name,
          passengerPhone: passenger.phoneNumber,
          setAsFrontAt: ride.frontPassengerSetAt,
          tripPaid: ride.tripPaid,
          estimatedFare: ride.estimatedFare,
          finalFare: ride.finalFare,
        });
      }
    }

    return {
      count: frontPassengers.length,
      frontPassengers,
    };
  },
});