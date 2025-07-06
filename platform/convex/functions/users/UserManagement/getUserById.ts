import { query } from "../../../_generated/server";
import { v } from "convex/values";
import { QueryCtx} from "../../../_generated/server";
import { Doc } from "../../../_generated/dataModel";

// Handler for getting user by ID
export const getUserByIdHandler = async (
  ctx: QueryCtx,
  args: { userId: string }
) => {
  // Get the user document by ID
  const user = await ctx.db.get(args.userId as any) as Doc<"taxiTap_users"> | null;
  
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
  };
};

// Get user by their Convex document ID
export const getUserById = query({
  args: { userId: v.id("taxiTap_users") },
  handler: getUserByIdHandler,
});

// Handler for getting user by phone number
export const getUserByPhoneHandler = async (
  ctx: QueryCtx,
  args: { phoneNumber: string }
) => {
  const user = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
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
  };
};

// Alternative: Get user by phone number (useful for login scenarios)
export const getUserByPhone = query({
  args: { phoneNumber: v.string() },
  handler: getUserByPhoneHandler,
});

// Handler for getting user with their driver/passenger profile data
export const getUserWithProfilesHandler = async (
  ctx: QueryCtx,
  args: { userId: string }
) => {
  // Get the main user document
  const user = await ctx.db.get(args.userId as any) as Doc<"taxiTap_users"> | null;
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get driver profile if user is a driver or has both roles
  let driverProfile = null;
  if (user.accountType === "driver" || user.accountType === "both") {
    driverProfile = await ctx.db
      .query("drivers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId as any))
      .first();
  }

  // Get passenger profile if user is a passenger or has both roles
  let passengerProfile = null;
  if (user.accountType === "passenger" || user.accountType === "both") {
    passengerProfile = await ctx.db
      .query("passengers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId as any))
      .first();
  }

  // Return combined data
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
    },
    driverProfile,
    passengerProfile,
  };
};

// Get user with their driver/passenger profile data
export const getUserWithProfiles = query({
  args: { userId: v.id("taxiTap_users") },
  handler: getUserWithProfilesHandler,
});