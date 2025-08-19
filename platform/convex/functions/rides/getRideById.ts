import { query } from "../../_generated/server";
import { v } from "convex/values";

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