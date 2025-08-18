import { sendNotificationHandler } from "../../convex/functions/notifications/sendNotifications";
import { Id } from "../../convex/_generated/dataModel";

describe("sendNotificationHandler", () => {
  let ctx: any;
  const userId = "user1" as Id<"taxiTap_users">;
  const mockNotificationId = "notification1";

  beforeEach(() => {
    ctx = {
      db: {
        insert: jest.fn(),
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
    
    // Mock Date.now() to have predictable timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
    
    // Mock Math.random() for predictable notification IDs
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates notification with all required fields", async () => {
    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    const args = {
      userId,
      type: "ride_update",
      title: "Ride Started",
      message: "Your ride has begun",
      priority: "high",
    };

    const result = await sendNotificationHandler(ctx, args);

    // Use a more flexible approach - match the actual generated ID format
    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", {
      notificationId: expect.stringMatching(/^notif_1640995200000_[a-z0-9]+$/),
      userId,
      type: "ride_update",
      title: "Ride Started",
      message: "Your ride has begun",
      isRead: false,
      isPush: false,
      priority: "high",
      metadata: undefined,
      scheduledFor: undefined,
      expiresAt: undefined,
      createdAt: 1640995200000,
    });

    expect(result).toBe(mockNotificationId);
  });

  it("creates notification with optional fields", async () => {
    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    const args = {
      userId,
      type: "payment_alert",
      title: "Payment Due",
      message: "Your payment is due soon",
      priority: "medium",
      metadata: { amount: 50.00, currency: "USD" },
      scheduledFor: 1641000000000,
      expiresAt: 1641086400000,
    };

    await sendNotificationHandler(ctx, args);

    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", {
      notificationId: expect.stringMatching(/^notif_1640995200000_[a-z0-9]+$/),
      userId,
      type: "payment_alert",
      title: "Payment Due",
      message: "Your payment is due soon",
      isRead: false,
      isPush: false,
      priority: "medium",
      metadata: { amount: 50.00, currency: "USD" },
      scheduledFor: 1641000000000,
      expiresAt: 1641086400000,
      createdAt: 1640995200000,
    });
  });

  it("does not mark as push notification when user has no active tokens", async () => {
    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    const args = {
      userId,
      type: "system_alert",
      title: "System Maintenance",
      message: "Scheduled maintenance tonight",
      priority: "low",
    };

    await sendNotificationHandler(ctx, args);

    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("marks as push notification when user has active tokens", async () => {
    const mockTokens = [
      { _id: "token1", userId, token: "abc123", isActive: true },
      { _id: "token2", userId, token: "def456", isActive: true },
    ];

    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve(mockTokens),
        }),
      }),
    });
    ctx.db.patch.mockResolvedValue(true);

    const args = {
      userId,
      type: "ride_update",
      title: "Driver Assigned",
      message: "Your driver is on the way",
      priority: "high",
    };

    await sendNotificationHandler(ctx, args);

    expect(ctx.db.patch).toHaveBeenCalledWith(mockNotificationId, {
      isPush: true,
    });
  });

  it("queries push tokens with correct index and filter", async () => {
    const mockWithIndex = jest.fn().mockReturnValue({
      filter: jest.fn().mockReturnValue({
        collect: () => Promise.resolve([]),
      }),
    });

    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: mockWithIndex,
    });

    const args = {
      userId,
      type: "test",
      title: "Test",
      message: "Test message",
      priority: "low",
    };

    await sendNotificationHandler(ctx, args);

    expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
    expect(mockWithIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
  });

  it("handles multiple active tokens", async () => {
    const mockTokens = [
      { _id: "token1", userId, token: "abc123", isActive: true },
      { _id: "token2", userId, token: "def456", isActive: true },
      { _id: "token3", userId, token: "ghi789", isActive: true },
    ];

    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve(mockTokens),
        }),
      }),
    });
    ctx.db.patch.mockResolvedValue(true);

    const args = {
      userId,
      type: "promo",
      title: "Special Offer",
      message: "50% off your next ride",
      priority: "medium",
    };

    await sendNotificationHandler(ctx, args);

    expect(ctx.db.patch).toHaveBeenCalledWith(mockNotificationId, {
      isPush: true,
    });
    expect(ctx.db.patch).toHaveBeenCalledTimes(1);
  });

  it("generates unique notification IDs", async () => {
    const args = {
      userId,
      type: "test",
      title: "Test",
      message: "Test message",
      priority: "low",
    };

    // First call with specific mocks
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    
    ctx.db.insert = jest.fn().mockResolvedValue("notif1");
    ctx.db.query = jest.fn().mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    await sendNotificationHandler(ctx, args);
    const firstCall = ctx.db.insert.mock.calls[0][1];

    // Second call with different mocks
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995300000);
    jest.spyOn(Math, 'random').mockReturnValue(0.987654321);
    
    ctx.db.insert = jest.fn().mockResolvedValue("notif2");
    ctx.db.query = jest.fn().mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    await sendNotificationHandler(ctx, args);
    const secondCall = ctx.db.insert.mock.calls[0][1];

    // Verify that notification IDs are different
    expect(firstCall.notificationId).not.toBe(secondCall.notificationId);
    expect(firstCall.notificationId).toMatch(/^notif_1640995200000_[a-z0-9]+$/);
    expect(secondCall.notificationId).toMatch(/^notif_1640995300000_[a-z0-9]+$/);
    
    // Verify different timestamps are used
    expect(firstCall.createdAt).toBe(1640995200000);
    expect(secondCall.createdAt).toBe(1640995300000);
  });
});

describe("sendNotificationHandler (internal)", () => {
  let ctx: any;
  const userId = "user1" as Id<"taxiTap_users">;
  const mockNotificationId = "notification1";

  beforeEach(() => {
    ctx = {
      db: {
        insert: jest.fn(),
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("behaves identically for internal calls", async () => {
    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    const args = {
      userId,
      type: "system_generated",
      title: "System Alert",
      message: "Internal system notification",
      priority: "high",
    };

    const result = await sendNotificationHandler(ctx, args);

    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", {
      notificationId: expect.stringMatching(/^notif_1640995200000_[a-z0-9]+$/),
      userId,
      type: "system_generated",
      title: "System Alert",
      message: "Internal system notification",
      isRead: false,
      isPush: false,
      priority: "high",
      metadata: undefined,
      scheduledFor: undefined,
      expiresAt: undefined,
      createdAt: 1640995200000,
    });

    expect(result).toBe(mockNotificationId);
  });

  it("handles push notifications same as public mutation", async () => {
    const mockTokens = [
      { _id: "token1", userId, token: "abc123", isActive: true },
    ];

    ctx.db.insert.mockResolvedValue(mockNotificationId);
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve(mockTokens),
        }),
      }),
    });
    ctx.db.patch.mockResolvedValue(true);

    const args = {
      userId,
      type: "automated_reminder",
      title: "Ride Reminder",
      message: "Don't forget your scheduled ride",
      priority: "medium",
    };

    await sendNotificationHandler(ctx, args);

    expect(ctx.db.patch).toHaveBeenCalledWith(mockNotificationId, {
      isPush: true,
    });
  });
});