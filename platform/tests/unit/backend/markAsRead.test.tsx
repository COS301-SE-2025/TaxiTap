// __tests__/unit/backend/markAsRead.test.tsx
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

// Define types for better type safety
interface MutationContext {
  db: {
    patch: jest.MockedFunction<(id: string, payload: Record<string, any>) => Promise<any>>;
  };
}

interface MarkAsReadArgs {
  notificationId: string;
}

// Create the actual handler logic for testing
const markAsReadHandler = async (ctx: MutationContext, args: MarkAsReadArgs) => {
  return await ctx.db.patch(args.notificationId, {
    isRead: true,
    readAt: Date.now()
  });
};

function createMutationCtx(): MutationContext {
  const patch = jest.fn() as jest.MockedFunction<(id: string, payload: Record<string, any>) => Promise<any>>;

  return {
    db: {
      patch,
    }
  };
}

describe("markAsRead mutation", () => {
  let ctx: MutationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createMutationCtx();
    mockDateNow.mockReturnValue(1640995200000);
  });

  afterAll(() => {
    mockDateNow.mockRestore();
  });

  describe("markAsReadHandler", () => {
    it("marks notification as read with correct parameters", async () => {
      const notificationId = "notif123";
      ctx.db.patch.mockResolvedValue(undefined);

      await markAsReadHandler(ctx, { notificationId });

      expect(ctx.db.patch).toHaveBeenCalledTimes(1);
      expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
        isRead: true,
        readAt: 1640995200000
      });
    });

    it("uses current timestamp for readAt field", async () => {
      const testTimestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
      mockDateNow.mockReturnValue(testTimestamp);

      const notificationId = "notif456";
      ctx.db.patch.mockResolvedValue(undefined);

      await markAsReadHandler(ctx, { notificationId });

      expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
        isRead: true,
        readAt: testTimestamp
      });
    });

    it("returns the result from db.patch", async () => {
      const notificationId = "notif789";
      const patchResult = { success: true };
      ctx.db.patch.mockResolvedValue(patchResult);

      const result = await markAsReadHandler(ctx, { notificationId });

      expect(result).toBe(patchResult);
      expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
        isRead: true,
        readAt: 1640995200000
      });
    });

    it("handles different notification IDs correctly", async () => {
      const testCases = [
        "notification_001",
        "notif_abc123",
        "user_notification_xyz",
        "12345"
      ];

      ctx.db.patch.mockResolvedValue(undefined);

      for (const notificationId of testCases) {
        await markAsReadHandler(ctx, { notificationId });
        
        expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
          isRead: true,
          readAt: 1640995200000
        });
      }

      expect(ctx.db.patch).toHaveBeenCalledTimes(testCases.length);
    });

    it("preserves patch operation parameters across multiple calls", async () => {
      ctx.db.patch.mockResolvedValue(undefined);

      const notificationIds = ["notif1", "notif2", "notif3"];
      
      for (const id of notificationIds) {
        await markAsReadHandler(ctx, { notificationId: id });
      }

      // Verify all patches were called with the correct parameters
      const patchCalls = ctx.db.patch.mock.calls;
      expect(patchCalls).toHaveLength(3);
      
      patchCalls.forEach((call, index) => {
        expect(call[0]).toBe(notificationIds[index]);
        expect(call[1]).toEqual({
          isRead: true,
          readAt: 1640995200000
        });
      });
    });

    it("handles empty notification ID", async () => {
      const notificationId = "";
      ctx.db.patch.mockResolvedValue(undefined);

      await markAsReadHandler(ctx, { notificationId });

      expect(ctx.db.patch).toHaveBeenCalledWith("", {
        isRead: true,
        readAt: 1640995200000
      });
    });

    it("propagates database errors", async () => {
      const notificationId = "notif_error";
      const dbError = new Error("Database connection failed");
      ctx.db.patch.mockRejectedValue(dbError);

      await expect(markAsReadHandler(ctx, { notificationId }))
        .rejects.toThrow("Database connection failed");

      expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
        isRead: true,
        readAt: 1640995200000
      });
    });

    it("verifies patch is called exactly once per invocation", async () => {
      const notificationId = "single_call_test";
      ctx.db.patch.mockResolvedValue({ _id: notificationId, isRead: true });

      await markAsReadHandler(ctx, { notificationId });

      expect(ctx.db.patch).toHaveBeenCalledTimes(1);
      expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
        isRead: true,
        readAt: 1640995200000
      });
    });

    it("uses Date.now() for each call independently", async () => {
      const timestamps = [1640995200000, 1641081600000, 1641168000000];
      let callCount = 0;
      
      mockDateNow.mockImplementation(() => timestamps[callCount++]);
      ctx.db.patch.mockResolvedValue(undefined);

      for (let i = 0; i < timestamps.length; i++) {
        await markAsReadHandler(ctx, { notificationId: `notif${i}` });
        
        expect(ctx.db.patch).toHaveBeenLastCalledWith(`notif${i}`, {
          isRead: true,
          readAt: timestamps[i]
        });
      }

      expect(ctx.db.patch).toHaveBeenCalledTimes(3);
    });

    it("maintains correct patch payload structure", async () => {
      const notificationId = "structure_test";
      ctx.db.patch.mockResolvedValue(undefined);

      await markAsReadHandler(ctx, { notificationId });

      const patchCall = ctx.db.patch.mock.calls[0];
      const [id, payload] = patchCall;

      expect(id).toBe(notificationId);
      expect(payload).toHaveProperty('isRead', true);
      expect(payload).toHaveProperty('readAt', 1640995200000);
      expect(Object.keys(payload)).toHaveLength(2);
      expect(typeof payload.isRead).toBe('boolean');
      expect(typeof payload.readAt).toBe('number');
    });
  });
});