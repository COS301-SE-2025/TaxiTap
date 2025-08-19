// Mock logInWithSMS functions for testing
export const loginSMSHandler = async (
  ctx: any,
  args: { phoneNumber: string; password: string }
) => {
  // Find user by phone number
  const user = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q: any) => q.eq("phoneNumber", args.phoneNumber))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  // In a real implementation, you would verify the password here
  // For testing purposes, we'll just check if it matches
  if (user.password !== args.password) {
    throw new Error("Invalid password");
  }

  // Update last login time
  await ctx.db.patch(user._id, {
    lastLoginAt: Date.now(),
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    accountType: user.accountType,
    currentActiveRole: user.currentActiveRole,
    isVerified: user.isVerified,
    isActive: user.isActive,
  };
};

export const loginSMS = {
  handler: loginSMSHandler,
};
