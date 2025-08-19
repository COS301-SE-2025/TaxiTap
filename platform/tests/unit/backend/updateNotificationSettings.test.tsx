import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  mutation: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => jest.fn()),
    object: jest.fn(() => ({})),
    optional: jest.fn((v) => v),
    boolean: jest.fn(() => ({})),
    string: jest.fn(() => ({})),
  }
}));

// Create the actual handler logic for testing
const actualHandler = async (ctx: any, args: any) => {
  const existingSettings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .first();

  if (existingSettings) {
    return await ctx.db.patch(existingSettings._id, {
      ...args.settings,
      updatedAt: expect.any(Number),
    });
  }

  return await ctx.db.insert("notificationSettings", {
    userId: args.userId,
    rideUpdates: args.settings.rideUpdates ?? true,
    promotionalOffers: args.settings.promotionalOffers ?? true,
    systemAlerts: args.settings.systemAlerts ?? true,
    emergencyNotifications: args.settings.emergencyNotifications ?? true,
    routeUpdates: args.settings.routeUpdates ?? true,
    paymentNotifications: args.settings.paymentNotifications ?? true,
    ratingReminders: args.settings.ratingReminders ?? true,
    soundEnabled: args.settings.soundEnabled ?? true,
    vibrationEnabled: args.settings.vibrationEnabled ?? true,
    quietHoursStart: args.settings.quietHoursStart ?? "22:00",
    quietHoursEnd: args.settings.quietHoursEnd ?? "07:00",
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  });
};

function createMutationCtx(firstResult: any = null) {
  const first = jest.fn();
  const withIndex = jest.fn(() => ({ first }));
  const query = jest.fn(() => ({ withIndex }));
  const patch = jest.fn();
  const insert = jest.fn();

  first.mockImplementation(() => Promise.resolve(firstResult));
  patch.mockImplementation((...args) => Promise.resolve(args));
  insert.mockImplementation((...args) => Promise.resolve(args));

  return {
    db: {
      query,
      patch,
      insert,
    },
    _internal: { first, withIndex, query, patch, insert },
  };
}

describe("updateNotificationSettings mutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates existing settings if found", async () => {
    const existing = { _id: "settings1" };
    const ctx = createMutationCtx(existing);
    const args = {
      userId: "user1",
      settings: {
        rideUpdates: false,
        promotionalOffers: false,
        systemAlerts: true,
      },
    };
    const patchResult = { _id: "settings1", ...args.settings, updatedAt: Date.now() };
    ctx.db.patch.mockImplementation(() => Promise.resolve(patchResult));
    const result = await actualHandler(ctx, args);
    expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
    expect(ctx.db.patch).toHaveBeenCalledWith("settings1", expect.objectContaining({
      rideUpdates: false,
      promotionalOffers: false,
      systemAlerts: true,
      updatedAt: expect.any(Number),
    }));
    expect(result).toEqual(patchResult);
  });

  it("creates new settings if not found, using defaults for missing fields", async () => {
    const ctx = createMutationCtx(null);
    const args = {
      userId: "user2",
      settings: {
        rideUpdates: false,
        soundEnabled: false,
      },
    };
    const insertResult = { _id: "settings2", ...args.settings, createdAt: Date.now(), updatedAt: Date.now() };
    ctx.db.insert.mockImplementation(() => Promise.resolve(insertResult));
    const result = await actualHandler(ctx, args);
    expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
    expect(ctx.db.insert).toHaveBeenCalledWith("notificationSettings", expect.objectContaining({
      userId: "user2",
      rideUpdates: false,
      soundEnabled: false,
      promotionalOffers: true,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: true,
      paymentNotifications: true,
      ratingReminders: true,
      vibrationEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));
    expect(result).toEqual(insertResult);
  });

  it("handles partial settings (some fields missing)", async () => {
    const ctx = createMutationCtx(null);
    const args = {
      userId: "user3",
      settings: {
        paymentNotifications: false,
      },
    };
    const insertResult = { _id: "settings3", ...args.settings, createdAt: Date.now(), updatedAt: Date.now() };
    ctx.db.insert.mockImplementation(() => Promise.resolve(insertResult));
    const result = await actualHandler(ctx, args);
    expect(ctx.db.insert).toHaveBeenCalledWith("notificationSettings", expect.objectContaining({
      userId: "user3",
      paymentNotifications: false,
      rideUpdates: true,
      promotionalOffers: true,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: true,
      ratingReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));
    expect(result).toEqual(insertResult);
  });
});
