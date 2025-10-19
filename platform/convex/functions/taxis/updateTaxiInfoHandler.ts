import { MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

/**
 * Creates or updates the information for a driver's taxi.
 * If the driver doesn't have a taxi, one will be created.
 * If they already have a taxi, it will be updated.
 * The driver must be authenticated.
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
  // Validate capacity if provided - maximum 14 seats allowed
  if (args.capacity !== undefined && args.capacity > 14) {
    throw new Error("Maximum 14 seats are allowed for taxis.");
  }

  // Find the driver profile for the given user
  const driverProfile = await ctx.db
    .query("drivers")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .unique();

  if (!driverProfile) {
    throw new Error("Could not find a driver profile for the current user.");
  }

  // Find the taxi associated with this driver
  const existingTaxi = await ctx.db
    .query("taxis")
    .withIndex("by_driver_id", (q: any) => q.eq("driverId", driverProfile._id))
    .unique();

  const now = Date.now();

  // If taxi exists, update it
  if (existingTaxi) {
    const { userId, ...taxiFields } = args;
    
    // Only update fields that were provided
    const updateData: any = { updatedAt: now };
    if (taxiFields.licensePlate !== undefined) updateData.licensePlate = taxiFields.licensePlate;
    if (taxiFields.model !== undefined) updateData.model = taxiFields.model;
    if (taxiFields.color !== undefined) updateData.color = taxiFields.color;
    if (taxiFields.year !== undefined) updateData.year = taxiFields.year;
    if (taxiFields.image !== undefined) updateData.image = taxiFields.image;
    if (taxiFields.capacity !== undefined) updateData.capacity = taxiFields.capacity;
    if (taxiFields.isAvailable !== undefined) updateData.isAvailable = taxiFields.isAvailable;

    await ctx.db.patch(existingTaxi._id, updateData);

    return { 
      success: true, 
      taxiId: existingTaxi._id, 
      created: false,
      message: "Taxi information updated successfully" 
    };
  }

  // If taxi doesn't exist, create a new one
  // Require essential fields for creation
  if (!args.licensePlate || !args.model || !args.color || !args.year || !args.capacity) {
    throw new Error("License plate, model, color, year, and capacity are required to create a new taxi.");
  }

  const newTaxiId = await ctx.db.insert("taxis", {
    driverId: driverProfile._id,
    licensePlate: args.licensePlate,
    model: args.model,
    color: args.color,
    year: args.year,
    capacity: args.capacity,
    image: args.image || "",
    isAvailable: args.isAvailable ?? true,
    createdAt: now,
    updatedAt: now,
  });

  return { 
    success: true, 
    taxiId: newTaxiId, 
    created: true,
    message: "Taxi created successfully" 
  };
}