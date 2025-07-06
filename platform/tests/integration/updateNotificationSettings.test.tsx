import { updateNotificationSettingsHandler } from "../../convex/functions/notifications/updateNotificationSettings";
import { Id } from "../../convex/_generated/dataModel";

describe("updateNotificationSettingsHandler", () => {
  let ctx: any;
  const userId = "user1" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
        insert: jest.fn(),
      },
    };
    jest.clearAllMocks();
  });

  it("creates new notification settings when none exist", async () => {
    // Mock no existing settings
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    ctx.db.insert.mockResolvedValue("settings1");

    const settings = {
      rideUpdates: false,
      promotionalOffers: true,
      soundEnabled: false,
      quietHoursStart: "23:00",
    };

    const result = await updateNotificationSettingsHandler(ctx, {
      userId,
      settings,
    });

    expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
    expect(ctx.db.insert).toHaveBeenCalledWith("notificationSettings", {
      userId,
      rideUpdates: false,
      promotionalOffers: true,
      systemAlerts: true, // default
      emergencyNotifications: true, // default
      routeUpdates: true, // default
      paymentNotifications: true, // default
      ratingReminders: true, // default
      soundEnabled: false,
      vibrationEnabled: true, // default
      quietHoursStart: "23:00",
      quietHoursEnd: "07:00", // default
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    expect(result).toBe("settings1");
  });

  it("creates new notification settings with all default values when settings is empty", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    ctx.db.insert.mockResolvedValue("settings1");

    const result = await updateNotificationSettingsHandler(ctx, {
      userId,
      settings: {},
    });

    expect(ctx.db.insert).toHaveBeenCalledWith("notificationSettings", {
      userId,
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
      quietHoursEnd: "07:00",
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });

    expect(result).toBe("settings1");
  });

  it("updates existing notification settings", async () => {
    const existingSettings = {
      _id: "existing1",
      userId,
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
      quietHoursEnd: "07:00",
      createdAt: 1640995200000,
      updatedAt: 1640995200000,
    };

    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(existingSettings),
      }),
    });

    ctx.db.patch.mockResolvedValue("updated1");

    const updates = {
      rideUpdates: false,
      soundEnabled: false,
      quietHoursStart: "23:30",
    };

    const result = await updateNotificationSettingsHandler(ctx, {
      userId,
      settings: updates,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith("existing1", {
      rideUpdates: false,
      soundEnabled: false,
      quietHoursStart: "23:30",
      updatedAt: expect.any(Number),
    });

    expect(ctx.db.insert).not.toHaveBeenCalled();
    expect(result).toBe("updated1");
  });

  it("updates existing settings with partial data", async () => {
    const existingSettings = {
      _id: "existing1",
      userId,
      rideUpdates: true,
      promotionalOffers: false,
      soundEnabled: true,
      createdAt: 1640995200000,
      updatedAt: 1640995200000,
    };

    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(existingSettings),
      }),
    });

    ctx.db.patch.mockResolvedValue("updated1");

    const result = await updateNotificationSettingsHandler(ctx, {
      userId,
      settings: { promotionalOffers: true },
    });

    expect(ctx.db.patch).toHaveBeenCalledWith("existing1", {
      promotionalOffers: true,
      updatedAt: expect.any(Number),
    });

    expect(result).toBe("updated1");
  });

  it("handles all boolean settings set to false", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    ctx.db.insert.mockResolvedValue("settings1");

    const allFalseSettings = {
      rideUpdates: false,
      promotionalOffers: false,
      systemAlerts: false,
      emergencyNotifications: false,
      routeUpdates: false,
      paymentNotifications: false,
      ratingReminders: false,
      soundEnabled: false,
      vibrationEnabled: false,
    };

    await updateNotificationSettingsHandler(ctx, {
      userId,
      settings: allFalseSettings,
    });

    expect(ctx.db.insert).toHaveBeenCalledWith("notificationSettings", {
      userId,
      rideUpdates: false,
      promotionalOffers: false,
      systemAlerts: false,
      emergencyNotifications: false,
      routeUpdates: false,
      paymentNotifications: false,
      ratingReminders: false,
      soundEnabled: false,
      vibrationEnabled: false,
      quietHoursStart: "22:00", // default
      quietHoursEnd: "07:00", // default
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
  });

  it("handles custom quiet hours", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    ctx.db.insert.mockResolvedValue("settings1");

    const customTimeSettings = {
      quietHoursStart: "21:30",
      quietHoursEnd: "08:45",
    };

    await updateNotificationSettingsHandler(ctx, {
      userId,
      settings: customTimeSettings,
    });

    expect(ctx.db.insert).toHaveBeenCalledWith("notificationSettings", 
      expect.objectContaining({
        quietHoursStart: "21:30",
        quietHoursEnd: "08:45",
      })
    );
  });

  it("verifies database query uses correct index and filter", async () => {
    const mockWithIndex = jest.fn().mockReturnValue({
      first: () => Promise.resolve(null),
    });

    ctx.db.query.mockReturnValue({
      withIndex: mockWithIndex,
    });

    ctx.db.insert.mockResolvedValue("settings1");

    await updateNotificationSettingsHandler(ctx, {
      userId,
      settings: { rideUpdates: false },
    });

    expect(ctx.db.query).toHaveBeenCalledWith("notificationSettings");
    expect(mockWithIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
  });
});