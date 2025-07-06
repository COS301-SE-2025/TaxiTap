import { markAsReadHandler } from "../../convex/functions/notifications/markAsRead";
import { Id } from "../../convex/_generated/dataModel";

describe("markAsReadHandler integration", () => {
  let ctx: any;
  const notificationId = "notif_123" as Id<"notifications">;

  beforeEach(() => {
    ctx = {
      db: {
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("marks notification as read and returns the patch result", async () => {
    const patchResult = { _id: notificationId, isRead: true, readAt: 1640995200000 };
    ctx.db.patch.mockResolvedValue(patchResult);

    const result = await markAsReadHandler(ctx, { notificationId });

    expect(ctx.db.patch).toHaveBeenCalledWith(notificationId, {
      isRead: true,
      readAt: 1640995200000,
    });
    expect(result).toEqual(patchResult);
  });

  it("handles errors from db.patch", async () => {
    ctx.db.patch.mockRejectedValue(new Error("DB error"));
    await expect(markAsReadHandler(ctx, { notificationId })).rejects.toThrow("DB error");
  });
});
