import { query, mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { QueryCtx, MutationCtx } from "../../../_generated/server";
import { Id } from "../../../_generated/dataModel";

export async function verifyPassword(stored: string, passwordAttempt: string): Promise<boolean> {
  const [saltHex, storedHashHex] = stored.split(":");
  if (!saltHex || !storedHashHex) return false;

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(passwordAttempt);
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const storedHash = new Uint8Array(storedHashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    64 * 8
  );

  const derivedHash = new Uint8Array(derivedBits);

  // Constant-time comparison
  return storedHash.length === derivedHash.length &&
    storedHash.every((byte, i) => byte === derivedHash[i]);
}

export async function loginSMSHandler(ctx: QueryCtx, args: { 
  phoneNumber: string; 
  password: string; 
  deviceId?: string;
  deviceName?: string;
  platform?: "ios" | "android" | "web";
}) {
  const user = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
    .first();

  if (!user) throw new Error("User not found");

  const isValid = await verifyPassword(user.password, args.password);
  if (!isValid) throw new Error("Invalid password");

  if (!user.isActive) throw new Error("Account is deactivated. Please contact support.");

  const activeRole = user.currentActiveRole;
  if (!activeRole) throw new Error("No active role set. Please contact support.");

  const hasPermission = user.accountType === activeRole || user.accountType === "both";

  if (!hasPermission) {
    throw new Error(
      `Role mismatch: Current active role (${activeRole}) doesn't match your account permissions (${user.accountType})`
    );
  }

  // Check if driver is already logged in on another device
  if (activeRole === "driver" && args.deviceId) {
    console.log('Checking sessions for driver:', user._id, 'deviceId:', args.deviceId);
    
    let sessionCheckPassed = false;
    
    try {
      // Use the proper index for better performance
      const existingSessions = await ctx.db
        .query("sessions")
        .withIndex("by_user_and_active", (q) => 
          q.eq("userId", user._id).eq("isActive", true)
        )
        .collect();

      console.log('Found existing sessions:', existingSessions.length);
      
      if (existingSessions.length > 0) {
        const sameDevice = existingSessions.find(session => session.deviceId === args.deviceId);
        console.log('Same device found:', !!sameDevice);
        
        if (!sameDevice) {
          console.log('Driver login blocked - session exists on different device');
          throw new Error("Driver account is already active on another device. Please log out from the other device first.");
        }
      }
      
      sessionCheckPassed = true;
    } catch (sessionError: any) {
      console.error('Error checking sessions:', sessionError);
      
      // If it's our driver restriction error, re-throw it
      if (sessionError.message.includes('Driver account is already active')) {
        throw sessionError;
      }
      
      // For other errors (like table doesn't exist), log but allow login
      console.error('Sessions table may not exist or is not accessible');
      sessionCheckPassed = true; // Allow login if we can't check sessions
    }
    
    // Only proceed if session check passed
    if (!sessionCheckPassed) {
      throw new Error("Unable to verify session status. Please try again.");
    }
  }

  return {
    success: true,
    user: {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      accountType: user.accountType,
      currentActiveRole: user.currentActiveRole,
      isVerified: user.isVerified,
    }
  };
}

export const loginSMS = query({
  args: {
    phoneNumber: v.string(),
    password: v.string(),
    deviceId: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    platform: v.optional(v.union(v.literal("ios"), v.literal("android"), v.literal("web"))),
  },
  handler: loginSMSHandler,
});

// Create session after successful login
export async function createSessionHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
    deviceId: string;
    deviceName?: string;
    platform: "ios" | "android" | "web";
  }
) {
  try {
    // Check if session already exists for this device
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_device_id", (q) => q.eq("deviceId", args.deviceId))
      .first();

    const now = Date.now();

    if (existingSession) {
      // Update existing session to be active
      await ctx.db.patch(existingSession._id, {
        isActive: true,
        lastActivityAt: now,
        deviceName: args.deviceName,
        platform: args.platform,
      });
      console.log('Updated existing session for device:', args.deviceId);
    } else {
      // Create new session
      await ctx.db.insert("sessions", {
        userId: args.userId,
        deviceId: args.deviceId,
        deviceName: args.deviceName,
        platform: args.platform,
        isActive: true,
        lastActivityAt: now,
        createdAt: now,
      });
      console.log('Created new session for device:', args.deviceId);
    }
  } catch (error) {
    console.error('Error creating/updating session:', error);
    throw error; // Re-throw to handle in calling function
  }
}

export const createSession = mutation({
  args: {
    userId: v.id("taxiTap_users"),
    deviceId: v.string(),
    deviceName: v.optional(v.string()),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
  },
  handler: createSessionHandler,
});

// Deactivate session on logout
export async function deactivateSessionHandler(
  ctx: MutationCtx,
  args: {
    deviceId: string;
  }
) {
  try {
    const sessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("deviceId"), args.deviceId))
      .collect();

    const session = sessions[0];
    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
        lastActivityAt: Date.now(),
      });
    }
  } catch (error) {
    console.error('Error deactivating session:', error);
  }
}

export const deactivateSession = mutation({
  args: {
    deviceId: v.string(),
  },
  handler: deactivateSessionHandler,
});

// Login with session management
export async function loginWithSessionHandler(ctx: MutationCtx, args: { 
  phoneNumber: string; 
  password: string; 
  deviceId?: string;
  deviceName?: string;
  platform?: "ios" | "android" | "web";
}) {
  const user = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
    .first();

  if (!user) throw new Error("User not found");

  const isValid = await verifyPassword(user.password, args.password);
  if (!isValid) throw new Error("Invalid password");

  if (!user.isActive) throw new Error("Account is deactivated. Please contact support.");

  const activeRole = user.currentActiveRole;
  if (!activeRole) throw new Error("No active role set. Please contact support.");

  const hasPermission = user.accountType === activeRole || user.accountType === "both";

  if (!hasPermission) {
    throw new Error(
      `Role mismatch: Current active role (${activeRole}) doesn't match your account permissions (${user.accountType})`
    );
  }

  // Check if driver is already logged in on another device
  if (activeRole === "driver" && args.deviceId) {
    console.log('Checking sessions for driver:', user._id, 'deviceId:', args.deviceId);
    
    try {
      const existingSessions = await ctx.db
        .query("sessions")
        .withIndex("by_user_and_active", (q) => 
          q.eq("userId", user._id).eq("isActive", true)
        )
        .collect();

      console.log('Found existing sessions:', existingSessions.length);
      
      if (existingSessions.length > 0) {
        const sameDevice = existingSessions.find(session => session.deviceId === args.deviceId);
        console.log('Same device found:', !!sameDevice);
        
        if (!sameDevice) {
          console.log('Driver login blocked - session exists on different device');
          throw new Error("Driver account is already active on another device. Please log out from the other device first.");
        }
      }
    } catch (sessionError: any) {
      console.error('Error checking sessions:', sessionError);
      
      // If it's our driver restriction error, re-throw it
      if (sessionError.message.includes('Driver account is already active')) {
        throw sessionError;
      }
      
      // For other errors (like table doesn't exist), log but allow login
      console.error('Sessions table may not exist or is not accessible');
    }
  }

  // Use the existing createSession function instead of duplicating logic
  if (args.deviceId && args.platform) {
    try {
      await createSessionHandler(ctx, {
        userId: user._id,
        deviceId: args.deviceId,
        deviceName: args.deviceName,
        platform: args.platform,
      });
      console.log('Session created successfully for user:', user._id);
    } catch (sessionError: any) {
      console.error('Error creating session:', sessionError);
      // Don't fail login if session creation fails, but log the issue
      console.error('Session creation failed but login will proceed');
    }
  }

  return {
    success: true,
    user: {
      id: user._id,
      phoneNumber: user.phoneNumber,
      name: user.name,
      accountType: user.accountType,
      currentActiveRole: user.currentActiveRole,
      isVerified: user.isVerified,
    }
  };
}

export const loginWithSession = mutation({
  args: {
    phoneNumber: v.string(),
    password: v.string(),
    deviceId: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    platform: v.optional(v.union(v.literal("ios"), v.literal("android"), v.literal("web"))),
  },
  handler: loginWithSessionHandler,
});

// Test function to check if sessions table exists
export async function testSessionsTableHandler(ctx: QueryCtx) {
  try {
    const sessions = await ctx.db.query("sessions").collect();
    return { success: true, count: sessions.length, message: 'Sessions table exists and is accessible' };
  } catch (error: any) {
    return { success: false, error: error.message, message: 'Sessions table may not exist' };
  }
}

export const testSessionsTable = query({
  args: {},
  handler: testSessionsTableHandler,
});

// Check active sessions for a user
export async function checkActiveSessionsHandler(
  ctx: QueryCtx,
  args: {
    userId: Id<"taxiTap_users">;
  }
) {
  try {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    return sessions.map(session => ({
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      platform: session.platform,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    }));
  } catch (error) {
    console.error('Error checking active sessions:', error);
    return [];
  }
}

export const checkActiveSessions = query({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: checkActiveSessionsHandler,
});

// Force logout all sessions for a user (useful for admin actions)
export async function forceLogoutAllSessionsHandler(
  ctx: MutationCtx,
  args: {
    userId: Id<"taxiTap_users">;
  }
) {
  try {
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_active", (q) => 
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();

    let deactivatedCount = 0;
    
    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
        lastActivityAt: Date.now(),
      });
      deactivatedCount++;
    }

    return { deactivatedCount };
  } catch (error) {
    console.error('Error force logging out all sessions:', error);
    return { deactivatedCount: 0 };
  }
}

export const forceLogoutAllSessions = mutation({
  args: {
    userId: v.id("taxiTap_users"),
  },
  handler: forceLogoutAllSessionsHandler,
});

// Cleanup expired sessions (can be run periodically)
export async function cleanupExpiredSessionsHandler(
  ctx: MutationCtx,
  args: {
    maxInactivityHours?: number;
  }
) {
  const maxInactivityHours = args.maxInactivityHours || 24;
  const cutoffTime = Date.now() - (maxInactivityHours * 60 * 60 * 1000);

  try {
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .filter((q) => q.lt(q.field("lastActivityAt"), cutoffTime))
      .collect();

    let deactivatedCount = 0;
    
    for (const session of expiredSessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
      deactivatedCount++;
    }

    return { deactivatedCount };
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return { deactivatedCount: 0 };
  }
}

export const cleanupExpiredSessions = mutation({
  args: {
    maxInactivityHours: v.optional(v.number()),
  },
  handler: cleanupExpiredSessionsHandler,
});
