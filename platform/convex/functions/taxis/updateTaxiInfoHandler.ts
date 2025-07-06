import { MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * Updates the information for a driver's taxi.
 * The driver must be authenticated.
 * All fields are optional, so only provided fields will be updated.
 */
export async function updateTaxiInfoHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">,
    licensePlate?: string,
    model?: string,
    color?: string,
    year?: number,
    image?: string,
    capacity?: number,
    isAvailable?: boolean,
  }
) {
  // Find the driver profile for the given user
  const driverProfile = await ctx.db
    .query("drivers")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .unique();

  if (!driverProfile) {
    throw new Error("Could not find a driver profile for the current user.");
  }

  // Find the taxi associated with this driver
  const taxi = await ctx.db
    .query("taxis")
    .withIndex("by_driver_id", (q: any) => q.eq("driverId", driverProfile._id))
    .unique();

  if (!taxi) {
    throw new Error("Could not find a taxi for this driver.");
  }

  // Remove userId from the update object to match the taxis schema
  const { userId, ...taxiFields } = args;
  await ctx.db.patch(taxi._id, { ...taxiFields, updatedAt: Date.now() });

  return { success: true, taxiId: taxi._id };
} 