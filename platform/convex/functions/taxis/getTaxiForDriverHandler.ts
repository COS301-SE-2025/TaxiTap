import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * Gets the taxi information for the given driver userId.
 */
export async function getTaxiForDriverHandler(
  ctx: QueryCtx,
  args: { userId: Id<"taxiTap_users"> }
) {
  // Find the driver profile for the given user
  const driverProfile = await ctx.db
    .query("drivers")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .unique();

  if (!driverProfile) {
    // No driver profile found for this user.
    return null;
  }

  // Find the taxi associated with this driver
  const taxi = await ctx.db
    .query("taxis")
    .withIndex("by_driver_id", (q: any) => q.eq("driverId", driverProfile._id))
    .unique();

  return taxi ?? null;
} 