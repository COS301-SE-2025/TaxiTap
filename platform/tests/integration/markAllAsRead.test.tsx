import { markAllAsReadHandler } from "../../convex/functions/notifications/markAllAsRead";
import { Id } from "../../convex/_generated/dataModel";

describe("markAllAsReadHandler integration", () => {
  let ctx: any;
  const userId = "user_123" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("marks all unread notifications as read and returns the count", async () => {
    const unreadNotifications = [
      { _id: "notif1" },
      { _id: "notif2" },
      { _id: "notif3" },
    ];
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve(unreadNotifications),
        }),
      }),
    });
    ctx.db.patch.mockResolvedValue(undefined);

    const result = await markAllAsReadHandler(ctx, { userId });

    expect(ctx.db.query).toHaveBeenCalledWith("notifications");
    expect(ctx.db.patch).toHaveBeenCalledTimes(unreadNotifications.length);
    for (const notification of unreadNotifications) {
      expect(ctx.db.patch).toHaveBeenCalledWith(notification._id, {
        isRead: true,
        readAt: 1640995200000,
      });
    }
    expect(result).toBe(unreadNotifications.length);
  });

  it("returns 0 and does not patch if there are no unread notifications", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });
    ctx.db.patch.mockResolvedValue(undefined);

    const result = await markAllAsReadHandler(ctx, { userId });

    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });

  it("handles errors from db.patch", async () => {
    const unreadNotifications = [
      { _id: "notif1" },
      { _id: "notif2" },
    ];
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        filter: () => ({
          collect: () => Promise.resolve(unreadNotifications),
        }),
      }),
    });
    ctx.db.patch.mockRejectedValue(new Error("DB error"));

    await expect(markAllAsReadHandler(ctx, { userId })).rejects.toThrow("DB error");
  });
});
