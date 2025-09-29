import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

export const getRideByIdHandler = async (ctx: any, args: { rideId: string }) => {
  if (!args.rideId) {
    throw new Error("Ride not found");
  }
  const ride = await ctx.db
    .query("rides")
    .withIndex("by_ride_id", (q: any) => q.eq("rideId", args.rideId))
    .first();
  if (!ride) throw new Error("Ride not found");
  return ride;
};

export const getRideById = query({
  args: {
    rideId: v.string(),
  },
  handler: getRideByIdHandler,
});

// Internal version for actions
export const getRideByDocId = internalQuery({
  args: {
    rideDocId: v.id("rides"),
  },
  handler: async (ctx, { rideDocId }) => {
    const ride = await ctx.db.get(rideDocId);
    if (!ride) throw new Error("Ride not found");
    return ride;
  },
});