import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { Id } from "../../../convex/_generated/dataModel";

// Query to get passenger's wallet summary for the last 30 days
export const getWalletSummary = query({
  args: { 
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Get completed rides in the last 30 days
    const recentRides = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("completedAt"), thirtyDaysAgo),
          q.neq(q.field("finalFare"), undefined)
        )
      )
      .collect();

    // Calculate summary statistics
    const totalSpent = recentRides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);
    const totalTrips = recentRides.length;
    const averageTrip = totalTrips > 0 ? totalSpent / totalTrips : 0;
    
    // Get payment type distribution
    const paymentTypes = recentRides.reduce((acc, ride) => {
      const type = ride.paymentType || 'not_paid';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSpent,
      totalTrips,
      averageTrip,
      paymentTypes,
      timeframe: "Last 30 days"
    };
  },
});

// Query to get detailed transaction history for the last 30 days
export const getTransactionHistory = query({
  args: { 
    passengerId: v.id("taxiTap_users"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const limit = args.limit || 50;
    
    // Get completed rides with payment details
    const rides = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("completedAt"), thirtyDaysAgo)
        )
      )
      .order("desc")
      .take(limit);

    // Enrich with driver information
    const transactions = await Promise.all(
      rides.map(async (ride) => {
        let driverInfo = null;
        if (ride.driverId) {
          driverInfo = await ctx.db.get(ride.driverId);
        }

        return {
          id: ride._id,
          rideId: ride.rideId,
          date: ride.completedAt || ride.requestedAt,
          startLocation: ride.startLocation.address,
          endLocation: ride.endLocation.address,
          fare: ride.finalFare || ride.estimatedFare || 0,
          paymentType: ride.paymentType || 'not_paid',
          paymentStatus: ride.tripPaid ? 'paid' : 'unpaid',
          amountPaid: ride.amountPaid || 0,
          changeDue: ride.changeDue || 0,
          amountOwed: ride.amountOwed || 0,
          changeReceived: ride.changeReceived,
          driver: driverInfo ? {
            name: driverInfo.name,
            profilePicture: driverInfo.profilePicture
          } : null,
          distance: ride.actualDistance || ride.estimatedDistance || ride.distance,
          duration: ride.completedAt && ride.startedAt ? 
            ride.completedAt - ride.startedAt : null
        };
      })
    );

    return transactions;
  },
});

// Query to get spending analytics by time periods
export const getSpendingAnalytics = query({
  args: { 
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const periods = {
      last7Days: now - (7 * 24 * 60 * 60 * 1000),
      last30Days: now - (30 * 24 * 60 * 60 * 1000),
    };

    const analytics: Record<string, {
      totalSpent: number;
      totalTrips: number;
      averageTrip: number;
      dailySpending: { date: string; amount: number }[];
    }> = {};

    for (const [period, timestamp] of Object.entries(periods)) {
      const rides = await ctx.db
        .query("rides")
        .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
        .filter((q) => 
          q.and(
            q.eq(q.field("status"), "completed"),
            q.gte(q.field("completedAt"), timestamp),
            q.neq(q.field("finalFare"), undefined)
          )
        )
        .collect();

      const totalSpent = rides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);
      const totalTrips = rides.length;
      const averageTrip = totalTrips > 0 ? totalSpent / totalTrips : 0;

      // Group by days for trend analysis
      const dailySpending = rides.reduce((acc, ride) => {
        const date = new Date(ride.completedAt || ride.requestedAt).toDateString();
        acc[date] = (acc[date] || 0) + (ride.finalFare || 0);
        return acc;
      }, {} as Record<string, number>);

      analytics[period] = {
        totalSpent,
        totalTrips,
        averageTrip,
        dailySpending: Object.entries(dailySpending).map(([date, amount]) => ({
          date,
          amount
        }))
      };
    }

    return analytics;
  },
});

// Query to get outstanding payments (rides where passenger owes money)
export const getOutstandingPayments = query({
  args: { 
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    const outstandingRides = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.or(
            q.gt(q.field("amountOwed"), 0),
            q.and(
              q.eq(q.field("tripPaid"), false),
              q.neq(q.field("finalFare"), undefined)
            )
          )
        )
      )
      .collect();

    const totalOwed = outstandingRides.reduce((sum, ride) => {
      return sum + (ride.amountOwed || ride.finalFare || 0);
    }, 0);

    return {
      rides: outstandingRides.map(ride => ({
        id: ride._id,
        rideId: ride.rideId,
        date: ride.completedAt || ride.requestedAt,
        startLocation: ride.startLocation.address,
        endLocation: ride.endLocation.address,
        amountOwed: ride.amountOwed || ride.finalFare || 0,
        fare: ride.finalFare || ride.estimatedFare || 0
      })),
      totalOwed
    };
  },
});

// Mutation to mark a payment as completed
export const markPaymentCompleted = mutation({
  args: {
    rideId: v.id("rides"),
    amountPaid: v.number(),
    paymentMethod: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const ride = await ctx.db.get(args.rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }

    const fare = ride.finalFare || ride.estimatedFare || 0;
    const changeDue = Math.max(0, args.amountPaid - fare);
    const amountOwed = Math.max(0, fare - args.amountPaid);
    
    let paymentType: "exact" | "overpaid" | "underpaid" | "not_paid";
    if (args.amountPaid === fare) {
      paymentType = "exact";
    } else if (args.amountPaid > fare) {
      paymentType = "overpaid";
    } else if (args.amountPaid < fare && args.amountPaid > 0) {
      paymentType = "underpaid";
    } else {
      paymentType = "not_paid";
    }

    await ctx.db.patch(args.rideId, {
      tripPaid: amountOwed === 0,
      amountPaid: args.amountPaid,
      changeDue,
      amountOwed,
      paymentType,
      paymentConfirmedAt: Date.now(),
      updatedAt: Date.now()
    });

    return {
      success: true,
      changeDue,
      amountOwed,
      paymentType
    };
  },
});

// Query to get wallet balance and payment summary
export const getWalletBalance = query({
  args: { 
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    // Get all completed rides
    const completedRides = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q) => q.eq("passengerId", args.passengerId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Calculate totals
    const totalSpent = completedRides.reduce((sum, ride) => 
      sum + (ride.finalFare || 0), 0
    );
    
    const totalPaid = completedRides.reduce((sum, ride) => 
      sum + (ride.amountPaid || 0), 0
    );
    
    const totalOwed = completedRides.reduce((sum, ride) => 
      sum + (ride.amountOwed || 0), 0
    );
    
    const totalChangeDue = completedRides.reduce((sum, ride) => 
      sum + (ride.changeDue || 0), 0
    );

    return {
      totalSpent,
      totalPaid,
      totalOwed,
      totalChangeDue,
      balance: totalPaid - totalSpent,
      totalTrips: completedRides.length
    };
  },
});