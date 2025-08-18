// Mock switchPassengertoBoth function for testing
export const switchPassengerToBothHandler = async (ctx: any, args: any) => {
  const { userId } = args;

  // Get user
  const user = await ctx.db.query("taxiTap_users")
    .filter((q: any) => q.eq(q.field("_id"), userId))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.currentActiveRole !== "passenger") {
    throw new Error("User is not currently a passenger");
  }

  // Check if driver profile exists
  const existingDriver = await ctx.db.query("drivers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  // Check if location exists
  const existingLocation = await ctx.db.query("locations")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  // Update user to both roles
  await ctx.db.patch(userId, {
    accountType: "both",
    currentActiveRole: "passenger",
    lastRoleSwitchAt: Date.now(),
    updatedAt: Date.now()
  });

  // Create driver profile if it doesn't exist
  if (!existingDriver) {
    await ctx.db.insert("drivers", {
      userId,
      numberOfRidesCompleted: 0,
      totalDistance: 0,
      totalFare: 0,
      averageRating: undefined,
      activeRoute: undefined,
      assignedRoute: undefined,
      taxiAssociation: "",
      routeAssignedAt: undefined,
      isOnline: false,
      currentLocation: null,
      vehicleInfo: null
    });
  }

  // Create location if it doesn't exist
  if (!existingLocation) {
    await ctx.db.insert("locations", {
      userId,
      role: "driver",
      latitude: 0,
      longitude: 0,
      updatedAt: new Date().toISOString()
    });
  }

  return {
    success: true,
    message: "Account upgraded to both passenger and driver"
  };
};
