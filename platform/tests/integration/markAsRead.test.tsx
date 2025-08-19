import { markAsReadHandler } from "../../convex/functions/notifications/markAsRead";
import { Id } from "../../convex/_generated/dataModel";

describe("markAsReadHandler integration", () => {
  const notificationId = "notif_123" as Id<"notifications">;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("marks notification as read and returns the patch result", async () => {
    const patchResult = { _id: notificationId, isRead: true, readAt: 1640995200000 };
    
    const ctx = {
      db: {
        patch: jest.fn(() => Promise.resolve(patchResult))
      }
    };

    const result = await markAsReadHandler(ctx as any, { notificationId });

    expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
      isRead: true,
      readAt: 1640995200000,
    });
    expect(result).toEqual(patchResult);
  });

  it("handles errors from db.patch", async () => {
    const ctx = {
      db: {
        patch: jest.fn(() => Promise.reject(new Error("DB error")))
      }
    };

    await expect(markAsReadHandler(ctx as any, { notificationId }))
      .rejects.toThrow("DB error");
  });
});
