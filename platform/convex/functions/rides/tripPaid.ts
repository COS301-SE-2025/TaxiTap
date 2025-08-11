import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const tripPaid = mutation({
    args: {
        rideId: v.string(),
        userId: v.id("taxiTap_users"),
        paid: v.boolean(),
    },
    handler: async (ctx, args) => {
        const ride = await ctx.db
        .query("rides")
        .withIndex("by_ride_id", (q) => q.eq("rideId", args.rideId))
        .first();

        if (!ride) {
        throw new Error("Ride not found");
        }
        if (ride.passengerId !== args.userId) {
        throw new Error("Only the passenger can start the ride");
        }

        await ctx.db.patch(ride._id, {
            tripPaid: args.paid,
        });
    }
});