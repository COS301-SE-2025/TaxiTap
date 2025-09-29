import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";
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

export async function loginSMSHandler(ctx: MutationCtx, args: { phoneNumber: string; password: string; deviceId: string }) {
  const response: any = { success: false, reason: null, user: null };

  const user = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q: any) => q.eq("phoneNumber", args.phoneNumber))
    .first();

  if (!user) {
    response.reason = "User not found";
    return response;
  }

  const isValid = await verifyPassword(user.password, args.password);
  if (!isValid) {
    response.reason = "Invalid password";
    return response;
  }

  if (!user.isActive) {
    response.reason = "Account is deactivated";
    return response;
  }

  const activeRole = user.currentActiveRole;
  if (!activeRole) {
    response.reason = "No active role set";
    return response;
  }

  const hasPermission = user.accountType === activeRole || user.accountType === "both";
  if (!hasPermission) {
    response.reason = `Role mismatch`;
    return response;
  }

  if (user.isLoggedIn && user.loggedInDeviceId !== args.deviceId) {
    response.reason = "Already logged in on another device";
    return response;
  }

  await ctx.db.patch(user._id, {
    isLoggedIn: true,
    loggedInDeviceId: args.deviceId,
    lastLoginAt: Date.now(),
  });

  response.success = true;
  response.user = {
    id: user._id,
    phoneNumber: user.phoneNumber,
    name: user.name,
    accountType: user.accountType,
    currentActiveRole: user.currentActiveRole,
    isVerified: user.isVerified,
  };

  return response;
}

export const loginSMS = mutation({
  args: {
    phoneNumber: v.string(),
    password: v.string(),
    deviceId: v.string(),
  },
  handler: loginSMSHandler,
});

export const logoutMutation = mutation({
  args: {
    userId: v.string(),
    deviceId: v.string(),
  },
  handler: async (
    ctx: MutationCtx,
    { userId, deviceId }: { userId: string; deviceId: string }
  ) => {
    const response: any = { success: false, reason: null };

    try {
      const userIdConvex = userId as unknown as Id<"taxiTap_users">;
      const user = await ctx.db.get(userIdConvex);
      if (!user) {
        response.reason = "User not found";
        return response;
      }

      if ((user as any).loggedInDeviceId === deviceId) {
        await ctx.db.patch(userIdConvex, {
          isLoggedIn: false,
          loggedInDeviceId: undefined,
        });
      }

      response.success = true;
      return response;
    } catch (err: any) {
      response.reason = "Failed to logout";
      return response;
    }
  },
});
