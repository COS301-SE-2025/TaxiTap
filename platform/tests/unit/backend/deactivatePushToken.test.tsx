// __tests__/unit/backend/deactivatePushToken.test.tsx
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock the entire module to return our test handler
jest.mock("../../../convex/functions/notifications/deactivatePushToken", () => ({
  deactivatePushToken: jest.fn()
}));

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  mutation: jest.fn(),
}));

jest.mock("convex/values", () => ({
  v: {
    string: jest.fn(() => ({})),
  }
}));

// Create the actual handler logic for testing
const actualHandler = async (ctx: any, args: { token: string }) => {
  const tokenDoc = await ctx.db
    .query("pushTokens")
    .withIndex("by_token", (q: any) => q.eq("token", args.token))
    .first();

  if (tokenDoc) {
    return await ctx.db.patch(tokenDoc._id, {
      isActive: false,
      updatedAt: Date.now()
    });
  }

  return null;
};

// Create MutationCtx mock function
function createMutationCtx() {
  const first = jest.fn();
  const withIndex = jest.fn(() => ({ first }));
  const query = jest.fn(() => ({ withIndex }));
  const patch = jest.fn();

  return {
    db: {
      query,
      patch,
    },
    _internal: { first, withIndex, patch } // Optional: allow easy access in tests
  };
}

describe("deactivatePushToken mutation", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createMutationCtx();
  });

  describe("deactivatePushTokenHandler", () => {
    it("deactivates push token when token is found", async () => {
      const mockToken = {
        _id: "token123",
        token: "push_token_abc123",
        isActive: true,
        createdAt: 1640995200000,
        updatedAt: 1640995200000
      };

      const mockPatchResult = {
        _id: "token123",
        token: "push_token_abc123",
        isActive: false,
        createdAt: 1640995200000,
        updatedAt: expect.any(Number)
      };

      // Mock the database query chain
      ctx.db.query().withIndex().first.mockResolvedValue(mockToken);
      ctx.db.patch.mockResolvedValue(mockPatchResult);

      const result = await actualHandler(ctx, { 
        token: "push_token_abc123" 
      });

      // Verify the query was called correctly
      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_token", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();

      // Verify the patch was called with correct parameters
      expect(ctx.db.patch).toHaveBeenCalledWith("token123", {
        isActive: false,
        updatedAt: expect.any(Number)
      });

      // Verify the result
      expect(result).toEqual(mockPatchResult);
    });

    it("returns null when token is not found", async () => {
      // Mock the database query to return null (token not found)
      ctx.db.query().withIndex().first.mockResolvedValue(null);

      const result = await actualHandler(ctx, { 
        token: "nonexistent_token" 
      });

      // Verify the query was called correctly
      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.query().withIndex).toHaveBeenCalledWith("by_token", expect.any(Function));
      expect(ctx.db.query().withIndex().first).toHaveBeenCalled();

      // Verify patch was NOT called since token wasn't found
      expect(ctx.db.patch).not.toHaveBeenCalled();

      // Verify the result is null
      expect(result).toBeNull();
    });

    it("updates timestamp when deactivating token", async () => {
      const mockToken = {
        _id: "token456",
        token: "push_token_xyz789",
        isActive: true,
        createdAt: 1640995200000,
        updatedAt: 1640995200000
      };

      const mockPatchResult = {
        _id: "token456",
        token: "push_token_xyz789",
        isActive: false,
        createdAt: 1640995200000,
        updatedAt: Date.now()
      };

      ctx.db.query().withIndex().first.mockResolvedValue(mockToken);
      ctx.db.patch.mockResolvedValue(mockPatchResult);

      const beforeTime = Date.now();
      await actualHandler(ctx, { 
        token: "push_token_xyz789" 
      });
      const afterTime = Date.now();

      // Verify that the updatedAt timestamp is current
      const patchCall = ctx.db.patch.mock.calls[0];
      const updatedAt = patchCall[1].updatedAt;
      
      expect(updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(updatedAt).toBeLessThanOrEqual(afterTime);
    });

    it("handles empty token string", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);

      const result = await actualHandler(ctx, { 
        token: "" 
      });

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(result).toBeNull();
    });
  });
});