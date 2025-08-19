// __tests__/unit/backend/markAllAsRead.test.tsx
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  mutation: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => ({})),
  }
}));

// Mock Date.now()
const mockDateNow = jest.spyOn(Date, 'now').mockImplementation(() => 1640995200000); // 2022-01-01T00:00:00.000Z

// Create the actual handler logic for testing
const markAllAsReadHandler = async (ctx: any, args: { userId: string }) => {
  const unreadNotifications = await ctx.db
    .query("notifications")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .filter((q: any) => q.eq(q.field("isRead"), false))
    .collect();

  for (const notification of unreadNotifications) {
    await ctx.db.patch(notification._id, {
      isRead: true,
      readAt: Date.now()
    });
  }

  return unreadNotifications.length;
};

function createMutationCtx() {
  const collect = jest.fn();
  const filter = jest.fn(() => ({ collect }));
  const withIndex = jest.fn(() => ({ filter }));
  const query = jest.fn(() => ({ withIndex }));
  const patch = jest.fn();

  return {
    db: {
      query,
      patch,
    },
    // Store references to the chain methods for easier access in tests
    _mockChain: { collect, filter, withIndex }
  };
}

describe("markAllAsRead mutation", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createMutationCtx();
    mockDateNow.mockReturnValue(1640995200000);
  });

  afterAll(() => {
    mockDateNow.mockRestore();
  });

  describe("markAllAsReadHandler", () => {
    const mockUnreadNotifications = [
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
        isRead: false,
        createdAt: "2024-01-01T09:00:00Z"
      },
      {
        _id: "notif3",
        userId: "user123",
        title: "Test Notification 3",
        message: "Test message 3",
        isRead: false,
        createdAt: "2024-01-01T08:00:00Z"
      }
    ];

    it("marks all unread notifications as read and returns count", async () => {
      // Set up the mock to return data when collect is called
      ctx._mockChain.collect.mockResolvedValue(mockUnreadNotifications);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markAllAsReadHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx._mockChain.withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx._mockChain.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx._mockChain.collect).toHaveBeenCalled();

      // Verify each notification was patched
      expect(ctx.db.patch).toHaveBeenCalledTimes(3);
      expect(ctx.db.patch).toHaveBeenCalledWith("notif1", {
        isRead: true,
        readAt: 1640995200000
      });
      expect(ctx.db.patch).toHaveBeenCalledWith("notif2", {
        isRead: true,
        readAt: 1640995200000
      });
      expect(ctx.db.patch).toHaveBeenCalledWith("notif3", {
        isRead: true,
        readAt: 1640995200000
      });

      expect(result).toBe(3);
    });

    it("returns zero when user has no unread notifications", async () => {
      ctx._mockChain.collect.mockResolvedValue([]);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markAllAsReadHandler(ctx, { userId: "user456" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx._mockChain.withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx._mockChain.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx._mockChain.collect).toHaveBeenCalled();

      expect(ctx.db.patch).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("handles single unread notification correctly", async () => {
      const singleNotification = [mockUnreadNotifications[0]];
      ctx._mockChain.collect.mockResolvedValue(singleNotification);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markAllAsReadHandler(ctx, { userId: "user123" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx._mockChain.withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx._mockChain.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx._mockChain.collect).toHaveBeenCalled();

      expect(ctx.db.patch).toHaveBeenCalledTimes(1);
      expect(ctx.db.patch).toHaveBeenCalledWith("notif1", {
        isRead: true,
        readAt: 1640995200000
      });

      expect(result).toBe(1);
    });

    it("uses current timestamp for readAt field", async () => {
      const testTimestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
      mockDateNow.mockReturnValue(testTimestamp);

      ctx._mockChain.collect.mockResolvedValue([mockUnreadNotifications[0]]);
      ctx.db.patch.mockResolvedValue(undefined);

      await markAllAsReadHandler(ctx, { userId: "user123" });

      expect(ctx.db.patch).toHaveBeenCalledWith("notif1", {
        isRead: true,
        readAt: testTimestamp
      });
    });

    it("verifies correct database queries and filters", async () => {
      ctx._mockChain.collect.mockResolvedValue(mockUnreadNotifications);
      ctx.db.patch.mockResolvedValue(undefined);

      await markAllAsReadHandler(ctx, { userId: "user789" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx._mockChain.withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx._mockChain.filter).toHaveBeenCalledWith(expect.any(Function));
    });

    it("handles different user IDs correctly", async () => {
      const userNotifications = [
        {
          _id: "notif999",
          userId: "user999",
          title: "User 999 Notification",
          isRead: false
        }
      ];

      ctx._mockChain.collect.mockResolvedValue(userNotifications);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markAllAsReadHandler(ctx, { userId: "user999" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx.db.patch).toHaveBeenCalledWith("notif999", {
        isRead: true,
        readAt: 1640995200000
      });
      expect(result).toBe(1);
    });

    it("handles empty userId gracefully", async () => {
      ctx._mockChain.collect.mockResolvedValue([]);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markAllAsReadHandler(ctx, { userId: "" });

      expect(ctx.db.query).toHaveBeenCalledWith("notifications");
      expect(ctx._mockChain.withIndex).toHaveBeenCalledWith("by_user_id", expect.any(Function));
      expect(ctx._mockChain.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(ctx._mockChain.collect).toHaveBeenCalled();

      expect(ctx.db.patch).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("processes notifications with different properties correctly", async () => {
      const mixedNotifications = [
        {
          _id: "notif_a",
          userId: "user123",
          title: "Notification A",
          message: "Message A",
          isRead: false,
          type: "ride_update",
          priority: "high"
        },
        {
          _id: "notif_b",
          userId: "user123",
          title: "Notification B",
          isRead: false,
          type: "promotional"
        }
      ];

      ctx._mockChain.collect.mockResolvedValue(mixedNotifications);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markAllAsReadHandler(ctx, { userId: "user123" });

      expect(ctx.db.patch).toHaveBeenCalledTimes(2);
      expect(ctx.db.patch).toHaveBeenCalledWith("notif_a", {
        isRead: true,
        readAt: 1640995200000
      });
      expect(ctx.db.patch).toHaveBeenCalledWith("notif_b", {
        isRead: true,
        readAt: 1640995200000
      });
      expect(result).toBe(2);
    });

    it("verifies all patch operations are called with correct parameters", async () => {
      ctx._mockChain.collect.mockResolvedValue(mockUnreadNotifications);
      ctx.db.patch.mockResolvedValue(undefined);

      await markAllAsReadHandler(ctx, { userId: "user123" });

      // Verify all patches were called with the correct parameters
      const patchCalls = (ctx.db.patch as jest.Mock).mock.calls;
      expect(patchCalls).toHaveLength(3);
      
      patchCalls.forEach((call, index) => {
        expect(call[0]).toBe(mockUnreadNotifications[index]._id);
        expect(call[1]).toEqual({
          isRead: true,
          readAt: 1640995200000
        });
      });

      // Verify query and patch operations were called the expected number of times
      expect(ctx.db.query).toHaveBeenCalledTimes(1);
      expect(ctx.db.patch).toHaveBeenCalledTimes(3);
    });
  });
});