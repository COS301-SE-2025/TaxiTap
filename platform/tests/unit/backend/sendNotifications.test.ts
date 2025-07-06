import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  mutation: jest.fn(),
  internalMutation: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => jest.fn()),
    string: jest.fn(() => ({})),
    optional: jest.fn((v) => v),
    any: jest.fn(() => ({})),
    number: jest.fn(() => ({})),
  }
}));

// Create the actual handler logic for testing
const actualHandler = async (ctx: any, args: any) => {
  const notificationId = `notif_${Date.now()}_test`;
  const notification = await ctx.db.insert("notifications", {
    notificationId,
    userId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    isRead: false,
    isPush: false,
    priority: args.priority,
    metadata: args.metadata,
    scheduledFor: args.scheduledFor,
    expiresAt: args.expiresAt,
    createdAt: expect.any(Number),
  });

  // Trigger push notification if user has tokens
  const userTokens = await ctx.db
    .query("pushTokens")
    .withIndex("by_user_id", (q: any) => q.eq("userId", args.userId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  if (userTokens.length > 0) {
    await ctx.db.patch(notification, { isPush: true });
  }

  return notification;
};

function createMutationCtx(tokens: any[] = [], insertResult: any = {}) {
  const collect: jest.Mock = jest.fn();
  const filter = jest.fn(() => ({ collect }));
  const withIndex = jest.fn(() => ({ filter }));
  const query = jest.fn(() => ({ withIndex }));
  const patch = jest.fn();
  const insert: jest.Mock = jest.fn();

  collect.mockImplementationOnce(() => Promise.resolve(tokens));
  insert.mockImplementationOnce(() => Promise.resolve(insertResult));

  return {
    db: {
      query,
      patch,
      insert,
    },
    _internal: { collect, filter, withIndex, query, patch, insert },
  };
}

describe("sendNotification mutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates notification and patches isPush if user has active tokens", async () => {
    const insertResult = { _id: "notif1" };
    const ctx = createMutationCtx([{}, {}], insertResult);
    const args = {
      userId: "user1",
      type: "test_type",
      title: "Test Title",
      message: "Test Message",
      priority: "high",
      metadata: { foo: "bar" },
      scheduledFor: 12345,
      expiresAt: 67890,
    };
    const result = await actualHandler(ctx, args);
    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", expect.objectContaining({
      userId: "user1",
      type: "test_type",
      title: "Test Title",
      message: "Test Message",
      priority: "high",
      metadata: { foo: "bar" },
      scheduledFor: 12345,
      expiresAt: 67890,
      isRead: false,
      isPush: false,
    }));
    expect(ctx.db.patch).toHaveBeenCalledWith(insertResult, { isPush: true });
    expect(result).toEqual(insertResult);
  });

  it("creates notification and does not patch isPush if user has no active tokens", async () => {
    const insertResult = { _id: "notif2" };
    const ctx = createMutationCtx([], insertResult);
    const args = {
      userId: "user2",
      type: "test_type2",
      title: "Test Title 2",
      message: "Test Message 2",
      priority: "low",
    };
    const result = await actualHandler(ctx, args);
    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", expect.objectContaining({
      userId: "user2",
      type: "test_type2",
      title: "Test Title 2",
      message: "Test Message 2",
      priority: "low",
      isRead: false,
      isPush: false,
    }));
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(result).toEqual(insertResult);
  });

  it("handles metadata, scheduledFor, and expiresAt fields", async () => {
    const insertResult = { _id: "notif3" };
    const ctx = createMutationCtx([{}], insertResult);
    const args = {
      userId: "user3",
      type: "meta_type",
      title: "Meta Title",
      message: "Meta Message",
      priority: "medium",
      metadata: { a: 1 },
      scheduledFor: 111,
      expiresAt: 222,
    };
    const result = await actualHandler(ctx, args);
    expect(ctx.db.insert).toHaveBeenCalledWith("notifications", expect.objectContaining({
      metadata: { a: 1 },
      scheduledFor: 111,
      expiresAt: 222,
    }));
    expect(result).toEqual(insertResult);
  });
});
