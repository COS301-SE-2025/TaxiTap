// getAvailableTaxis.ts

import { query } from "../../_generated/server";

export async function getAvailableTaxisHandler(ctx: any) {
  // Your existing handler code here:
  const availableTaxis = await ctx.db
    .query("taxis")
    .withIndex("by_is_available", (q: any) => q.eq("isAvailable", true))
    .collect();

  const results = [];

  for (const taxi of availableTaxis) {
    const driver = await ctx.db.get(taxi.driverId);
    if (!driver) continue;

    const user = await ctx.db.get(driver.userId);
    if (!user) continue;

    results.push({
      licensePlate: taxi.licensePlate,
      image: taxi.image ?? null,
      seats: taxi.capacity,
      model: taxi.model,
      driverName: user.name,
      userId: user._id,
      driverId: driver._id,
    });
  }

  return results;
}

export const getAvailableTaxis = query({
  handler: getAvailableTaxisHandler,
});