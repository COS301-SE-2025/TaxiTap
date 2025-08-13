import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getActiveTripsHandler } from "./getActiveTripsHandler";

export const getActiveTrips = typeof query === "function" && v?.id
  ? query({
      args: { driverId: v.id("taxiTap_users") },
      handler: async (ctx: any, args: any) => getActiveTripsHandler(ctx, args.driverId),
    })
  : undefined;