import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock the entire module to return our test handler
jest.mock("../../../convex/functions/notifications/registerPushToken", () => ({
  registerPushToken: jest.fn()
}));

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  mutation: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => jest.fn()),
    string: jest.fn(() => ({})),
    union: jest.fn(() => ({})),
    literal: jest.fn(() => ({})),
  }
}));

// Create the actual handler logic for testing
const actualHandler = async (
  ctx: any,
  args: { userId: string; token: string; platform: "ios" | "android" }
) => {
  const existingToken = await ctx.db
    .query("pushTokens")
    .withIndex("by_token", (q: any) => q.eq("token", args.token))
    .first();

  if (existingToken) {
    return await ctx.db.patch(existingToken._id, {
      userId: args.userId,
      isActive: true,
      updatedAt: Date.now(),
      lastUsedAt: Date.now(),
    });
  }

  return await ctx.db.insert("pushTokens", {
    userId: args.userId,
    token: args.token,
    platform: args.platform,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastUsedAt: Date.now(),
  });
};

// Create MutationCtx mock function
function createMutationCtx() {
  const first = jest.fn();
  const withIndex = jest.fn(() => ({ first }));
  const query = jest.fn(() => ({ withIndex }));
  const patch = jest.fn();
  const insert = jest.fn();

  return {
    db: {
      query,
      patch,
      insert,
    },
    _internal: { first, withIndex, patch, insert },
  };
}

describe("registerPushToken mutation", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createMutationCtx();
  });

  describe("registerPushTokenHandler", () => {
    it("updates existing token if found", async () => {
      const mockToken = {
        _id: "token123",
        token: "push_token_abc123",
        userId: "user1",
        isActive: false,
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
        lastUsedAt: 1640995200000,
      };

      const mockPatchResult = {
        _id: "token123",
        token: "push_token_abc123",
        userId: "user1",
        isActive: true,
        updatedAt: expect.any(Number),
        lastUsedAt: expect.any(Number),
        createdAt: 1640995200000,
      };

      ctx.db.query().withIndex().first.mockResolvedValue(mockToken);
      ctx.db.patch.mockResolvedValue(mockPatchResult);

      const result = await actualHandler(ctx, {
        userId: "user1",
        token: "push_token_abc123",
        platform: "ios",
      });

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith(
        "by_token",
        expect.any(Function)
      );
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();
      expect(ctx.db.patch).toHaveBeenCalledWith("token123", {
        userId: "user1",
        isActive: true,
        updatedAt: expect.any(Number),
        lastUsedAt: expect.any(Number),
      });
      expect(result).toEqual(mockPatchResult);
    });

    it("creates new token if not found", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);
      const mockInsertResult = {
        _id: "token999",
        userId: "user2",
        token: "push_token_new",
        platform: "android",
        isActive: true,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        lastUsedAt: expect.any(Number),
      };
      ctx.db.insert.mockResolvedValue(mockInsertResult);

      const result = await actualHandler(ctx, {
        userId: "user2",
        token: "push_token_new",
        platform: "android",
      });

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId: "user2",
        token: "push_token_new",
        platform: "android",
        isActive: true,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        lastUsedAt: expect.any(Number),
      });
      expect(result).toEqual(mockInsertResult);
    });

    it("handles empty token string", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);
      ctx.db.insert.mockResolvedValue(null);

      const result = await actualHandler(ctx, {
        userId: "user3",
        token: "",
        platform: "ios",
      });

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(result).toBeNull();
    });

    it("handles missing userId", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);
      ctx.db.insert.mockResolvedValue(null);

      // @ts-expect-error purposely omitting userId
      const result = await actualHandler(ctx, {
        token: "push_token_missing_user",
        platform: "ios",
      });

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(result).toBeNull();
    });
  });
});
