import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { tripPaidHandler } from "./tripPaidHandler";

export const tripPaid = mutation({
  args: { 
    rideId: v.string(),
    userId: v.id("taxiTap_users"),
    paid: v.boolean()
  },
  handler: async (ctx, args) => {
    return await tripPaidHandler(ctx, args.rideId, args.userId, args.paid);
  },
});