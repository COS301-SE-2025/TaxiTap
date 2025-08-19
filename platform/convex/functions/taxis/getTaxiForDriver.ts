import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getTaxiForDriverHandler } from "./getTaxiForDriverHandler";

/**
 * Gets the taxi information for the given driver userId.
 */
export const getTaxiForDriver = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: getTaxiForDriverHandler,
}); 