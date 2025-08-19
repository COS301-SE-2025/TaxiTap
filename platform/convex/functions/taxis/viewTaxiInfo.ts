//this is a function for passengers to be able to view the info of a taxi after they have reserved a seat for said taxi
import { query } from "../../_generated/server";
import { v } from "convex/values";
import { viewTaxiInfoHandler } from "./viewTaxiInfoHandler";

// View taxi info for a passenger's current reservation
export const viewTaxiInfo = query({
  args: {
    passengerId: v.id("taxiTap_users"),
    // Optionally: rideId: v.optional(v.string())
  },
  handler: viewTaxiInfoHandler,
});

