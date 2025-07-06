import { getNotificationsHandler } from "../../convex/functions/notifications/getNotifications";
import { Id } from "../../convex/_generated/dataModel";

describe("getNotificationsHandler integration", () => {
  let ctx: any;
  const userId = "user_123" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
      },
    };
    jest.clearAllMocks();
  });

  it("fetches all notifications for a user", async () => {
    const notifications = [
      { _id: "notif1", isRead: false },
      { _id: "notif2", isRead: true },
    ];
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        order: () => ({
          collect: () => Promise.resolve(notifications),
        }),
      }),
    });

    const result = await getNotificationsHandler(ctx, { userId });
    expect(ctx.db.query).toHaveBeenCalledWith("notifications");
    expect(result).toEqual(notifications);
  });

  it("limits the number of notifications returned", async () => {
    const limitedNotifications = [{ _id: "notif1", isRead: false }];
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        order: () => ({
          take: (limit: number) => Promise.resolve(limitedNotifications),
        }),
      }),
    });

    const result = await getNotificationsHandler(ctx, { userId, limit: 1 });
    expect(result).toEqual(limitedNotifications);
  });

  it("filters unread notifications only", async () => {
    const unreadNotifications = [{ _id: "notif1", isRead: false }];
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        order: () => ({
          filter: () => ({
            collect: () => Promise.resolve(unreadNotifications),
          }),
        }),
      }),
    });

    const result = await getNotificationsHandler(ctx, { userId, unreadOnly: true });
    expect(result).toEqual(unreadNotifications);
  });

  it("returns an empty array if no notifications exist", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        order: () => ({
          collect: () => Promise.resolve([]),
        }),
      }),
    });

    const result = await getNotificationsHandler(ctx, { userId });
    expect(result).toEqual([]);
  });
});
