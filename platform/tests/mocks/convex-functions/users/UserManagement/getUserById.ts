// Mock getUserById functions for testing
export const getUserByIdHandler = async (
  ctx: any,
  args: { userId: string }
) => {
  // Get the user document by ID
  const user = await ctx.db.get(args.userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Return the user data (excluding sensitive information like password)
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    phoneNumber: user.phoneNumber,
    isVerified: user.isVerified,
    isActive: user.isActive,
    accountType: user.accountType,
    currentActiveRole: user.currentActiveRole,
    lastRoleSwitchAt: user.lastRoleSwitchAt,
    profilePicture: user.profilePicture,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    emergencyContact: user.emergencyContact,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    homeAddress: user.homeAddress,
    workAddress: user.workAddress,
  };
};

export const getUserByPhoneHandler = async (
  ctx: any,
  args: { phoneNumber: string }
) => {
  const user = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q: any) => q.eq("phoneNumber", args.phoneNumber))
    .first();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Return the user data (excluding password)
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    phoneNumber: user.phoneNumber,
    isVerified: user.isVerified,
    isActive: user.isActive,
    accountType: user.accountType,
    currentActiveRole: user.currentActiveRole,
    lastRoleSwitchAt: user.lastRoleSwitchAt,
    profilePicture: user.profilePicture,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    emergencyContact: user.emergencyContact,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    homeAddress: user.homeAddress,
    workAddress: user.workAddress,
  };
};

export const getUserWithProfilesHandler = async (
  ctx: any,
  args: { userId: string }
) => {
  // Get the main user document
  const user = await ctx.db.get(args.userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get driver profile if user is a driver
  let driverProfile = null;
  if (user.accountType === "driver" || user.accountType === "both") {
    driverProfile = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
      .first();
  }

  // Get passenger profile if user is a passenger
  let passengerProfile = null;
  if (user.accountType === "passenger" || user.accountType === "both") {
    passengerProfile = await ctx.db
      .query("passengers")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
      .first();
  }

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
      isActive: user.isActive,
      accountType: user.accountType,
      currentActiveRole: user.currentActiveRole,
      lastRoleSwitchAt: user.lastRoleSwitchAt,
      profilePicture: user.profilePicture,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      emergencyContact: user.emergencyContact,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      homeAddress: user.homeAddress,
      workAddress: user.workAddress,
    },
    driverProfile,
    passengerProfile,
  };
};
