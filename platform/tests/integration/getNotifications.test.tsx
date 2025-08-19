import { getNotificationsHandler } from "../../convex/functions/notifications/getNotifications";
import { Id } from "../../convex/_generated/dataModel";

// Mock the convex values to prevent the v.optional import error
jest.mock("convex/values", () => ({
  v: {
    optional: jest.fn(),
    string: jest.fn(),
    boolean: jest.fn(),
    number: jest.fn(),
    literal: jest.fn(),
    any: jest.fn(),
    object: jest.fn(),
    array: jest.fn(),
    id: jest.fn(),
  },
}));

// Mock the server functions if needed
jest.mock("../../convex/_generated/server", () => ({
  query: jest.fn(),
  mutation: jest.fn(),
}));

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
    
    const mockQuery = {
      withIndex: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue(notifications),
        }),
      }),
    };
    
    ctx.db.query.mockReturnValue(mockQuery);

    const result = await getNotificationsHandler(ctx, { userId });
    
    expect(ctx.db.query).toHaveBeenCalledWith("notifications");
    expect(mockQuery.withIndex).toHaveBeenCalled();
    expect(result).toEqual(notifications);
  });

  it("limits the number of notifications returned", async () => {
    const limitedNotifications = [{ _id: "notif1", isRead: false }];
    
    const mockQuery = {
      withIndex: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          take: jest.fn().mockResolvedValue(limitedNotifications),
        }),
      }),
    };
    
    ctx.db.query.mockReturnValue(mockQuery);

    const result = await getNotificationsHandler(ctx, { userId, limit: 1 });
    
    expect(mockQuery.withIndex().order().take).toHaveBeenCalledWith(1);
    expect(result).toEqual(limitedNotifications);
  });

  it("filters unread notifications only", async () => {
    const unreadNotifications = [{ _id: "notif1", isRead: false }];
    
    const mockQuery = {
      withIndex: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(unreadNotifications),
          }),
        }),
      }),
    };
    
    ctx.db.query.mockReturnValue(mockQuery);

    const result = await getNotificationsHandler(ctx, { userId, unreadOnly: true });
    
    expect(mockQuery.withIndex().order().filter).toHaveBeenCalled();
    expect(result).toEqual(unreadNotifications);
  });

  it("returns an empty array if no notifications exist", async () => {
    const mockQuery = {
      withIndex: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    
    ctx.db.query.mockReturnValue(mockQuery);

    const result = await getNotificationsHandler(ctx, { userId });
    
    expect(result).toEqual([]);
  });

  it("handles database query errors gracefully", async () => {
    const mockQuery = {
      withIndex: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          collect: jest.fn().mockRejectedValue(new Error("Database error")),
        }),
      }),
    };
    
    ctx.db.query.mockReturnValue(mockQuery);

    await expect(getNotificationsHandler(ctx, { userId })).rejects.toThrow("Database error");
  });
});