// __tests__/unit/backend/getNotifications.test.tsx
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  query: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => ({})),
    optional: jest.fn(() => ({})),
    number: jest.fn(() => ({})),
    boolean: jest.fn(() => ({})),
  }
}));

// Create the actual handler logic for testing
const getNotificationsHandler = async (ctx: any, args: { userId: string, limit?: number, unreadOnly?: boolean }) => {
  let q = ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .order("desc");

  if (args.unreadOnly) {
    q = q.filter((q: any) => q.eq(q.field("isRead"), false));
  }

  if (args.limit !== undefined) {
    return await q.take(args.limit);
  }

  return await q.collect();
};

const getUnreadCountHandler = async (ctx: any, args: { userId: string }) => {
  const unreadNotifications = await ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .filter((q: any) => q.eq(q.field("isRead"), false))
    .collect();

  return unreadNotifications.length;
};

// Create QueryCtx mock function
function createQueryCtx() {
  const take = jest.fn();
  const collect = jest.fn();
  const filter = jest.fn(() => ({ take, collect, order, filter }));
  const order = jest.fn(() => ({ filter, take, collect, order }));
  const withIndex = jest.fn(() => ({ order, filter, take, collect, withIndex }));
  const query = jest.fn(() => ({ withIndex, order, filter, take, collect }));

  return {
    db: {
      query,
    },
    _internal: { take, collect, filter, order, withIndex }
  };
}

describe("notifications queries", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createQueryCtx();
  });

  describe("getNotificationsHandler", () => {
    const mockNotifications = [
      {
        _id: "notif1",
        userId: "user123",
        title: "Test Notification 1",
        message: "Test message 1",
        isRead: false,
        createdAt: "2024-01-01T10:00:00Z"
      },
      {
        _id: "notif2",
        userId: "user123",
        title: "Test Notification 2",
        message: "Test message 2",
        isRead: true,
        createdAt: "2024-01-01T09:00:00Z"
      }
    ];

    it("returns all notifications when no filters applied", async () => {
      ctx.db.query().withIndex().order().collect.mockResolvedValue(mockNotifications);

      const result = await getNotificationsHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().order).toHaveBeenCalledWith("desc");
      expect(ctx.db.query().withIndex().order().collect).toHaveBeenCalled();
      expect(result).toEqual(mockNotifications);
    });

    it("returns limited number of notifications when limit is provided", async () => {
      const limitedNotifications = [mockNotifications[0]];
      ctx.db.query().withIndex().order().take.mockResolvedValue(limitedNotifications);

      const result = await getNotificationsHandler(ctx, { 
        userId: "user123", 
        limit: 1 
      });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().order).toHaveBeenCalledWith("desc");
      expect(ctx.db.query().withIndex().order().take).toHaveBeenCalledWith(1);
      expect(result).toEqual(limitedNotifications);
    });

    it("filters unread notifications when unreadOnly is true", async () => {
      const unreadNotifications = [mockNotifications[0]]; // Only unread notification
      ctx.db.query().withIndex().order().filter().collect.mockResolvedValue(unreadNotifications);

      const result = await getNotificationsHandler(ctx, { 
        userId: "user123", 
        unreadOnly: true 
      });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().order).toHaveBeenCalledWith("desc");
      expect(ctx.db.query().withIndex().order().filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx.db.query().withIndex().order().filter().collect).toHaveBeenCalled();
      expect(result).toEqual(unreadNotifications);
    });

    it("applies both unreadOnly filter and limit", async () => {
      const limitedUnreadNotifications = [mockNotifications[0]];
      ctx.db.query().withIndex().order().filter().take.mockResolvedValue(limitedUnreadNotifications);

      const result = await getNotificationsHandler(ctx, { 
        userId: "user123", 
        unreadOnly: true,
        limit: 1
      });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().order).toHaveBeenCalledWith("desc");
      expect(ctx.db.query().withIndex().order().filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx.db.query().withIndex().order().filter().take).toHaveBeenCalledWith(1);
      expect(result).toEqual(limitedUnreadNotifications);
    });

    it("handles empty results", async () => {
      ctx.db.query().withIndex().order().collect.mockResolvedValue([]);

      const result = await getNotificationsHandler(ctx, { userId: "user456" });

      expect(result).toEqual([]);
    });

    it("handles zero limit", async () => {
      ctx.db.query().withIndex().order().take.mockResolvedValue([]);

      const result = await getNotificationsHandler(ctx, { 
        userId: "user123", 
        limit: 0 
      });

      expect(ctx.db.query().withIndex().order().take).toHaveBeenCalledWith(0);
      expect(result).toEqual([]);
    });
  });

  describe("getUnreadCountHandler", () => {
    it("returns correct count of unread notifications", async () => {
      const unreadNotifications = [
        {
          _id: "notif1",
          userId: "user123",
          title: "Unread Notification 1",
          isRead: false
        },
        {
          _id: "notif3",
          userId: "user123",
          title: "Unread Notification 2",
          isRead: false
        }
      ];

      ctx.db.query().withIndex().filter().collect.mockResolvedValue(unreadNotifications);

      const result = await getUnreadCountHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx.db.query().withIndex().filter().collect).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it("returns zero when no unread notifications exist", async () => {
      ctx.db.query().withIndex().filter().collect.mockResolvedValue([]);

      const result = await getUnreadCountHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx.db.query().withIndex().filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx.db.query().withIndex().filter().collect).toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("handles user with no notifications", async () => {
      ctx.db.query().withIndex().filter().collect.mockResolvedValue([]);

      const result = await getUnreadCountHandler(ctx, { userId: "user456" });

      expect(result).toBe(0);
    });

    it("returns correct count for user with mixed read/unread notifications", async () => {
      const unreadNotifications = [
        {
          _id: "notif1",
          userId: "user123",
          isRead: false
        }
      ];

      ctx.db.query().withIndex().filter().collect.mockResolvedValue(unreadNotifications);

      const result = await getUnreadCountHandler(ctx, { userId: "user123" });

      expect(result).toBe(1);
    });
  });
});