import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { endTripHandler } from "./endTripHandler";

export const endTrip = mutation({
  args: {
    passengerId: v.id("taxiTap_users"),
  },
  handler: endTripHandler,
});

export { endTripHandler };
