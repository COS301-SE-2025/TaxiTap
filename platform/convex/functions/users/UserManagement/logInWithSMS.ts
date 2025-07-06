import { query } from "../../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../../_generated/server";

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

export async function loginSMSHandler(ctx: QueryCtx, args: { phoneNumber: string; password: string; }) {
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

  return {
    id: user._id,
    phoneNumber: user.phoneNumber,
    name: user.name,
    accountType: user.accountType,
    currentActiveRole: user.currentActiveRole,
    isVerified: user.isVerified,
  };
}

export const loginSMS = query({
  args: {
    phoneNumber: v.string(),
    password: v.string(),
  },
  handler: loginSMSHandler,
});