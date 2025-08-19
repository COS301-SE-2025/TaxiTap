import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requestRideHandler } from "./RequestRideHandler";

export const requestRide = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
    driverId: v.id("taxiTap_users"),
    startLocation: v.object({
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
      }),
      address: v.string(),
    }),
    endLocation: v.object({
      coordinates: v.object({
        latitude: v.number(),
        longitude: v.number(),
      }),
      address: v.string(),
    }),
    estimatedFare: v.optional(v.number()),
    estimatedDistance: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
  },
  handler: requestRideHandler,
});