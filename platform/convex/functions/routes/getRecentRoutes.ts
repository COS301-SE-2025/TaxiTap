import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getPassengerTopRoutesHandler } from "./getRecentRoutesHandler"; 

export const getPassengerTopRoutes = query({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: async (ctx, args) => {
    return getPassengerTopRoutesHandler(ctx, args.passengerId);
  },
});