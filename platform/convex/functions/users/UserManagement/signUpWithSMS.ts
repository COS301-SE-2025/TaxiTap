import { mutation } from "../../../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../../../_generated/server";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive key
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
    64 * 8 // 64 bytes
  );

  // Encode salt and derived key as hex for storage
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const derivedHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${derivedHex}`;
}

export const signUpSMSHandler = async (
  ctx: MutationCtx,
  args: {
    phoneNumber: string;
    name: string;
    password: string;
    accountType: "passenger" | "driver" | "both";
    email?: string;
    age?: number;
  }
) => {
  // Check if phone number already exists
  const existingByPhone = await ctx.db
    .query("taxiTap_users")
    .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
    .first();
  if (existingByPhone) {
    throw new Error("Phone number already exists");
  }

  const now = Date.now();

  const effectiveRole: "passenger" | "driver" =
    args.accountType === "both" ? "passenger" : args.accountType;

  const hashedPassword = await hashPassword(args.password);

  try {
    const userId = await ctx.db.insert("taxiTap_users", {
      phoneNumber: args.phoneNumber,
      name: args.name,
      password: hashedPassword,
      email: args.email || "",
      age: args.age ?? 18,
      accountType: args.accountType,
      currentActiveRole: effectiveRole,
      isVerified: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (args.accountType === "passenger" || args.accountType === "both") {
      await ctx.db.insert("passengers", {
        userId,
        numberOfRidesTaken: 0,
        totalDistance: 0,
        totalFare: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (args.accountType === "driver" || args.accountType === "both") {
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
      });
    }

    return { success: true, userId };
  } catch (e) {
    const exists = await ctx.db
      .query("taxiTap_users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    if (exists) {
      throw new Error("Phone number already exists (race condition)");
    }
    throw e;
  }
};

// Expose mutation
export const signUpSMS = mutation({
  args: {
    phoneNumber: v.string(),
    name: v.string(),
    password: v.string(),
    accountType: v.union(
      v.literal("passenger"),
      v.literal("driver"),
      v.literal("both")
    ),
    email: v.optional(v.string()),
    age: v.optional(v.number()),
  },
  handler: signUpSMSHandler,
});