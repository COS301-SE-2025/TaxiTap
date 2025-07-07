/**
 * Handler function for updating user location.
 * Used internally by the mutation and exported for unit testing.
 * 
 * @author Moyahabo Hamese
 */
export const updateUserLocationHandler = async (
  ctx: any,
  {
    userId,
    latitude,
    longitude,
    role,
  }: {
    userId: string;
    latitude: number;
    longitude: number;
    role: "passenger" | "driver" | "both";
  }
) => {
  // Check if the user already has a location record
  const existing = await ctx.db
    .query("locations")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  // If a record exists, delete it before inserting the new one
  if (existing) {
    await ctx.db.delete(existing._id);
  }

  // Insert the new location data
  await ctx.db.insert("locations", {
    userId,
    latitude,
    longitude,
    role,
    updatedAt: new Date().toISOString(), // Store the update timestamp
  });
};
