// Mock signUpWithSMS function for testing
export const signUpSMSHandler = async (ctx: any, args: any) => {
  // Check if user already exists
  const existingUser = await ctx.db.query("taxiTap_users")
    .withIndex("by_phone", (q: any) => q.eq("phoneNumber", args.phoneNumber))
    .first();
  
  if (existingUser) {
    throw new Error("Phone number already exists");
  }

  // Insert user
  const userId = await ctx.db.insert("taxiTap_users", {
    phoneNumber: args.phoneNumber,
    name: args.name,
    password: args.password,
    accountType: args.accountType,
    currentActiveRole: args.accountType === "both" ? "passenger" : args.accountType,
    isVerified: false,
    isActive: true,
    age: args.age || 18
  });

  // Insert location
  await ctx.db.insert("locations", {
    userId: userId,
    role: args.accountType === "both" ? "driver" : args.accountType,
    latitude: 0,
    longitude: 0
  });

  // Insert passenger record if applicable
  if (args.accountType === "passenger" || args.accountType === "both") {
    await ctx.db.insert("passengers", {
      userId: userId,
      numberOfRidesTaken: 0,
      totalDistance: 0,
      totalFare: 0
    });
  }

  // Insert driver record if applicable
  if (args.accountType === "driver" || args.accountType === "both") {
    await ctx.db.insert("drivers", {
      userId: userId,
      isOnline: false,
      currentLocation: null,
      vehicleInfo: null,
      numberOfRidesCompleted: 0,
      totalDistance: 0,
      totalFare: 0,
      averageRating: undefined
    });
  }

  return {
    success: true,
    userId: userId,
    message: "User signed up successfully"
  };
};
