import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getActiveTripsHandler } from "./getActiveTripsHandler";
import { handlePassengerPayment as handlerFn } from "./getActiveTripsHandler";
import { markChangeGiven as handlerFn2 } from "./getActiveTripsHandler";
import { getPassengersNeedingChange as handlerFn3 } from "./getActiveTripsHandler";

export const getActiveTrips = query({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, args) => {
    return getActiveTripsHandler(ctx, args.driverId);
  },
});

export const handlePassengerPayment = mutation({
  args: {
    rideId: v.string(),
    amountPaid: v.number(),
    isPaid: v.boolean(),
  },
  handler: async (ctx, args) => {
    return handlerFn(ctx, args.rideId, args.amountPaid, args.isPaid);
  },
});

export const markChangeGiven = mutation({
  args: { rideId: v.string() },
  handler: async (ctx, args) => handlerFn2(ctx, args.rideId),
});

export const getPassengersNeedingChange = query({
  args: { driverId: v.id("taxiTap_users") },
  handler: async (ctx, args) => handlerFn3(ctx, args.driverId),
});