import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { updateTaxiInfoHandler } from "./updateTaxiInfoHandler";

/**
 * Updates the information for a driver's taxi.
 * The driver must be authenticated.
 * All fields are optional, so only provided fields will be updated.
 */
export const updateTaxiInfo = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    licensePlate: v.optional(v.string()),
    model: v.optional(v.string()),
    color: v.optional(v.string()),
    year: v.optional(v.number()),
    image: v.optional(v.string()),
    capacity: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
  },
  handler: updateTaxiInfoHandler,
}); 