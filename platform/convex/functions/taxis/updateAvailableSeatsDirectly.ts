import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { Id } from "../../_generated/dataModel";

export const updateAvailableSeatsDirectly = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    action: v.union(v.literal("increase"), v.literal("decrease")),
  },
  handler: async (ctx, args: { userId: Id<"taxiTap_users">; action: "increase" | "decrease" }) => {
    const userId = args.userId;

    const driver = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", q => q.eq("userId", userId))
      .first();

    if (!driver) throw new Error("Driver profile not found.");

    const taxi = await ctx.db
      .query("taxis")
      .withIndex("by_driver_id", q => q.eq("driverId", driver._id))
      .first();

    if (!taxi) throw new Error("Taxi not found for this driver.");

    const currentCapacity = taxi.capacity ?? 0;
    const newCapacity =
      args.action === "decrease" ? Math.max(currentCapacity - 1, 0) : currentCapacity + 1;

    await ctx.db.patch(taxi._id, {
      capacity: newCapacity,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      previousCapacity: currentCapacity,
      updatedCapacity: newCapacity,
    };
  },
});