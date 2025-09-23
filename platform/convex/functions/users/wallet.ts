import { v } from "convex/values";
import { query, mutation } from "../../_generated/server";

export interface Ride {
  _id: string;
  rideId: string;
  passengerId: string;

  startLocation: {
    coordinates: { latitude: number; longitude: number };
    address: string;
  };
  endLocation: {
    coordinates: { latitude: number; longitude: number };
    address: string;
  };

  status: "requested" | "accepted" | "in_progress" | "completed" | "cancelled" | "declined";
  driverId?: string;

  requestedAt: number;
  acceptedAt?: number;
  startedAt?: number;
  completedAt?: number;

  estimatedFare?: number;
  finalFare?: number;

  estimatedDistance?: number;
  actualDistance?: number;
  distance?: number;

  tripId?: string;
  tripPaid?: boolean;
  amountPaid?: number;
  changeDue?: number;
  amountOwed?: number;
  paymentType?: "exact" | "overpaid" | "not_paid" | "underpaid";
  changeReceived?: boolean;

  ridePin?: string;
  pinRegeneratedAt?: number;
  pinVerifiedAt?: number;

  lastProximityAlertAt?: number;
  lastProximityStatus?: string;

  paymentConfirmedAt?: number;

  parentJourneyId?: string;
  legIndex?: number;
  isMultiLegRide?: boolean;

  legPaymentStatus?: "pending" | "completed" | "failed" | "skipped";
  legPaymentMethod?: "cash" | "card" | "digital" | "other";
  isPartialJourneyPayment?: boolean;
  journeyLegNumber?: string; // e.g., "2 of 3"

  updatedAt?: number;

  isFrontPassenger?: boolean;
  frontPassengerSetAt?: number;
}

export const getWalletSummaryHandler = async (ctx: any, passengerId: string) => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const recentRides = await ctx.db
    .query("rides")
    .withIndex("by_passenger", (q: any) => q.eq("passengerId", passengerId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("status"), "completed"),
        q.gte(q.field("completedAt"), thirtyDaysAgo),
        q.neq(q.field("finalFare"), undefined)
      )
    )
    .collect();

  const totalSpent = recentRides.reduce((sum: number, ride: Ride) => sum + (ride.finalFare || 0), 0);
  const totalTrips = recentRides.length;
  const averageTrip = totalTrips > 0 ? totalSpent / totalTrips : 0;

  const paymentTypes = recentRides.reduce((acc: Record<string, number>, ride: Ride) => {
    const type = ride.paymentType || 'not_paid';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    totalSpent,
    totalTrips,
    averageTrip,
    paymentTypes,
    timeframe: "Last 30 days",
  };
};

export const getTransactionHistoryHandler = async (ctx: any, passengerId: string, limit?: number) => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const maxResults = limit || 50;

  const rides = await ctx.db
    .query("rides")
    .withIndex("by_passenger_completedAt", (q: any) =>
      q.eq("passengerId", passengerId).gte("completedAt", thirtyDaysAgo)
    )
    .collect();

  rides.sort((a: any, b: any) => (b.completedAt || 0) - (a.completedAt || 0));

  const limitedRides = rides.slice(0, maxResults);

  return Promise.all(
    limitedRides.map(async (ride: Ride) => {
      const driverInfo = ride.driverId ? await ctx.db.get(ride.driverId) : null;
      return {
        id: ride._id,
        rideId: ride.rideId,
        date: ride.completedAt || ride.requestedAt,
        startLocation: ride.startLocation.address,
        endLocation: ride.endLocation.address,
        fare: ride.finalFare || ride.estimatedFare || 0,
        paymentType: ride.paymentType || "not_paid",
        paymentStatus: ride.tripPaid ? "paid" : "unpaid",
        amountPaid: ride.amountPaid || 0,
        changeDue: ride.changeDue || 0,
        amountOwed: ride.amountOwed || 0,
        changeReceived: ride.changeReceived,
        driver: driverInfo
          ? { name: driverInfo.name, profilePicture: driverInfo.profilePicture }
          : null,
        distance: ride.actualDistance || ride.estimatedDistance || ride.distance,
        duration: ride.completedAt && ride.startedAt ? ride.completedAt - ride.startedAt : null,
      };
    })
  );
};

export const getSpendingAnalyticsHandler = async (ctx: any, passengerId: string) => {
  const now = Date.now();
  const periods = {
    last7Days: now - 7 * 24 * 60 * 60 * 1000,
    last30Days: now - 30 * 24 * 60 * 60 * 1000,
  };

  const analytics: Record<string, any> = {};

  for (const [period, timestamp] of Object.entries(periods)) {
    const rides = await ctx.db
      .query("rides")
      .withIndex("by_passenger", (q: any) => q.eq("passengerId", passengerId))
      .filter((q: any) =>
        q.and(q.eq(q.field("status"), "completed"), q.gte(q.field("completedAt"), timestamp))
      )
      .collect();

    const totalSpent = rides.reduce((sum: number, ride: Ride) => sum + (ride.finalFare || 0), 0);
    const totalTrips = rides.length;
    const averageTrip = totalTrips > 0 ? totalSpent / totalTrips : 0;

    const dailySpending = rides.reduce((acc: Record<string, number>, ride: Ride) => {
      const date = new Date(ride.completedAt || ride.requestedAt).toDateString();
      acc[date] = (acc[date] || 0) + (ride.finalFare || 0);
      return acc;
    }, {});

    analytics[period] = {
      totalSpent,
      totalTrips,
      averageTrip,
      dailySpending: Object.entries(dailySpending).map(([date, amount]) => ({ date, amount })),
    };
  }

  return analytics;
};

export const getOutstandingPaymentsHandler = async (ctx: any, passengerId: string) => {
  const outstandingRides = await ctx.db
    .query("rides")
    .withIndex("by_passenger", (q: any) => q.eq("passengerId", passengerId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("status"), "completed"),
        q.or(
          q.gt(q.field("amountOwed"), 0),
          q.and(q.eq(q.field("tripPaid"), false), q.neq(q.field("finalFare"), undefined))
        )
      )
    )
    .collect();

  const totalOwed = outstandingRides.reduce((sum: number, ride: Ride) => sum + (ride.amountOwed || ride.finalFare || 0), 0);

  return {
    rides: outstandingRides.map((ride: Ride) => ({
      id: ride._id,
      rideId: ride.rideId,
      date: ride.completedAt || ride.requestedAt,
      startLocation: ride.startLocation.address,
      endLocation: ride.endLocation.address,
      amountOwed: ride.amountOwed || ride.finalFare || 0,
      fare: ride.finalFare || ride.estimatedFare || 0,
    })),
    totalOwed,
  };
};

export const markPaymentCompletedHandler = async (ctx: any, rideId: string, amountPaid: number, paymentMethod?: string) => {
  const ride = await ctx.db.get(rideId);
  if (!ride) throw new Error("Ride not found");

  const fare = ride.finalFare || ride.estimatedFare || 0;
  const changeDue = Math.max(0, amountPaid - fare);
  const amountOwed = Math.max(0, fare - amountPaid);

  let paymentType: "exact" | "overpaid" | "underpaid" | "not_paid";
  if (amountPaid === fare) paymentType = "exact";
  else if (amountPaid > fare) paymentType = "overpaid";
  else if (amountPaid < fare && amountPaid > 0) paymentType = "underpaid";
  else paymentType = "not_paid";

  await ctx.db.patch(rideId, {
    tripPaid: amountOwed === 0,
    amountPaid,
    changeDue,
    amountOwed,
    paymentType,
    paymentConfirmedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { success: true, changeDue, amountOwed, paymentType };
};

export const getWalletBalanceHandler = async (ctx: any, passengerId: string) => {
  const completedRides = await ctx.db
    .query("rides")
    .withIndex("by_passenger", (q: any) => q.eq("passengerId", passengerId))
    .filter((q: any) => q.eq(q.field("status"), "completed"))
    .collect();

  const totalSpent = completedRides.reduce((sum: number, ride: Ride) => sum + (ride.finalFare || 0), 0);
  const totalPaid = completedRides.reduce((sum: number, ride: Ride) => sum + (ride.amountPaid || 0), 0);
  const totalOwed = completedRides.reduce((sum: number, ride: Ride) => sum + (ride.amountOwed || 0), 0);
  const totalChangeDue = completedRides.reduce((sum: number, ride: Ride) => sum + (ride.changeDue || 0), 0);

  return {
    totalSpent,
    totalPaid,
    totalOwed,
    totalChangeDue,
    balance: totalPaid - totalSpent,
    totalTrips: completedRides.length,
  };
};

// ---------------- CONVEX EXPORTS ----------------

export const getWalletSummary = query({
  args: { passengerId: v.id("taxiTap_users") },
  handler: (ctx, { passengerId }) => getWalletSummaryHandler(ctx, passengerId),
});

export const getTransactionHistory = query({
  args: { passengerId: v.id("taxiTap_users"), limit: v.optional(v.number()) },
  handler: (ctx, { passengerId, limit }) => getTransactionHistoryHandler(ctx, passengerId, limit),
});

export const getSpendingAnalytics = query({
  args: { passengerId: v.id("taxiTap_users") },
  handler: (ctx, { passengerId }) => getSpendingAnalyticsHandler(ctx, passengerId),
});

export const getOutstandingPayments = query({
  args: { passengerId: v.id("taxiTap_users") },
  handler: (ctx, { passengerId }) => getOutstandingPaymentsHandler(ctx, passengerId),
});

export const markPaymentCompleted = mutation({
  args: { rideId: v.id("rides"), amountPaid: v.number(), paymentMethod: v.optional(v.string()) },
  handler: (ctx, { rideId, amountPaid, paymentMethod }) =>
    markPaymentCompletedHandler(ctx, rideId, amountPaid, paymentMethod),
});

export const getWalletBalance = query({
  args: { passengerId: v.id("taxiTap_users") },
  handler: (ctx, { passengerId }) => getWalletBalanceHandler(ctx, passengerId),
});