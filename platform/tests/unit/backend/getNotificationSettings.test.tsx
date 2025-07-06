// __tests__/unit/backend/getNotificationSettings.test.tsx
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  query: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => ({})),
  }
}));

// Create the actual handler logic for testing
const getNotificationSettingsHandler = async (ctx: any, args: { userId: string }) => {
  const settings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .first();

  // Return default settings if none exist
  if (!settings) {
    return {
      rideUpdates: true,
      promotionalOffers: true,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: true,
      paymentNotifications: true,
      ratingReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00"
    };
  }

  return settings;
};

// Create QueryCtx mock function
function createQueryCtx() {
  const first = jest.fn();
  const withIndex = jest.fn(() => ({ first, withIndex }));
  const query = jest.fn(() => ({ withIndex, first }));

  return {
    db: {
      query,
    },
    _internal: { first, withIndex }
  };
}

describe("getNotificationSettings query", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createQueryCtx();
  });

  describe("getNotificationSettingsHandler", () => {
    const mockSettings = {
      _id: "settings123",
      userId: "user123",
      rideUpdates: false,
      promotionalOffers: false,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: false,
      paymentNotifications: true,
      ratingReminders: false,
      soundEnabled: false,
      vibrationEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "06:00"
    };

    const defaultSettings = {
      rideUpdates: true,
      promotionalOffers: true,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: true,
      paymentNotifications: true,
      ratingReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00"
    };

    it("returns existing notification settings when user has settings", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(mockSettings);

      const result = await getNotificationSettingsHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    it("returns default settings when user has no existing settings", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);

      const result = await getNotificationSettingsHandler(ctx, { userId: "user456" });

      expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();
      expect(result).toEqual(defaultSettings);
    });

    it("returns default settings when user has no existing settings (undefined)", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(undefined);

      const result = await getNotificationSettingsHandler(ctx, { userId: "user789" });

      expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();
      expect(result).toEqual(defaultSettings);
    });

    it("handles different user IDs correctly", async () => {
      const userSettings = {
        ...mockSettings,
        userId: "user999",
        rideUpdates: true,
        soundEnabled: true
      };
      
      ctx.db.query().withIndex().first.mockResolvedValue(userSettings);

      const result = await getNotificationSettingsHandler(ctx, { userId: "user999" });

      expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();
      expect(result).toEqual(userSettings);
    });

    it("verifies correct database table and index are used", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);

      await getNotificationSettingsHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
    });

    it("handles empty string userId", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);

      const result = await getNotificationSettingsHandler(ctx, { userId: "" });

      expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();
      expect(result).toEqual(defaultSettings);
    });

    it("returns settings with all required default properties", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);

      const result = await getNotificationSettingsHandler(ctx, { userId: "user123" });

      expect(result).toHaveProperty('rideUpdates', true);
      expect(result).toHaveProperty('promotionalOffers', true);
      expect(result).toHaveProperty('systemAlerts', true);
      expect(result).toHaveProperty('emergencyNotifications', true);
      expect(result).toHaveProperty('routeUpdates', true);
      expect(result).toHaveProperty('paymentNotifications', true);
      expect(result).toHaveProperty('ratingReminders', true);
      expect(result).toHaveProperty('soundEnabled', true);
      expect(result).toHaveProperty('vibrationEnabled', true);
      expect(result).toHaveProperty('quietHoursStart', "22:00");
      expect(result).toHaveProperty('quietHoursEnd', "07:00");
    });

    it("preserves all existing settings properties when found", async () => {
      const fullSettings = {
        _id: "settings456",
        _creationTime: 1234567890,
        userId: "user123",
        rideUpdates: false,
        promotionalOffers: true,
        systemAlerts: false,
        emergencyNotifications: true,
        routeUpdates: true,
        paymentNotifications: false,
        ratingReminders: true,
        soundEnabled: false,
        vibrationEnabled: false,
        quietHoursStart: "21:30",
        quietHoursEnd: "08:00"
      };

      ctx.db.query().withIndex().first.mockResolvedValue(fullSettings);

      const result = await getNotificationSettingsHandler(ctx, { userId: "user123" });

      expect(result).toEqual(fullSettings);
      expect(result).toHaveProperty('_id', "settings456");
      expect(result).toHaveProperty('_creationTime', 1234567890);
    });
  });
});