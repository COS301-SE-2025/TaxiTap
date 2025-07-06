import { deactivatePushTokenHandler } from "../../convex/functions/notifications/deactivatePushToken";
import { Id } from "../../convex/_generated/dataModel";

describe("deactivatePushTokenHandler", () => {
  let ctx: any;
  const token = "firebase_token_abc123";
  
  const mockActiveToken = {
    _id: "active_token_doc_id",
    userId: "user_123" as Id<"taxiTap_users">,
    token: "firebase_token_abc123",
    platform: "ios" as const,
    isActive: true,
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
    lastUsedAt: 1640995200000
  };

  const mockInactiveToken = {
    _id: "inactive_token_doc_id",
    userId: "user_456" as Id<"taxiTap_users">,
    token: "firebase_token_xyz789",
    platform: "android" as const,
    isActive: false,
    createdAt: 1640995200000,
    updatedAt: 1641081600000,
    lastUsedAt: 1640995200000
  };

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
    
    // Mock Date.now() to return consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1641168000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("successful deactivation", () => {
    it("deactivates active push token when token exists", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockActiveToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("deactivated_token_id");

      const args = { token };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.patch).toHaveBeenCalledTimes(1);
      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
      expect(result).toBe("deactivated_token_id");
    });

    it("deactivates already inactive token", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockInactiveToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("updated_inactive_token_id");

      const args = { token: "firebase_token_xyz789" };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("inactive_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
      expect(result).toBe("updated_inactive_token_id");
    });

    it("uses current timestamp for updatedAt field", async () => {
      const customTimestamp = 1641254400000;
      jest.spyOn(Date, 'now').mockReturnValue(customTimestamp);

      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockActiveToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("timestamp_updated_id");

      const args = { token };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: customTimestamp
      });
    });
  });

  describe("token not found", () => {
    it("returns null when token does not exist", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });

      const args = { token: "nonexistent_token" };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.patch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("does not call patch when token is null", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });

      const args = { token: "missing_token_123" };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).not.toHaveBeenCalled();
    });
  });

  describe("database query behavior", () => {
    it("queries pushTokens with correct index and filter", async () => {
      const mockWithIndex = jest.fn().mockReturnValue({
        first: () => Promise.resolve(mockActiveToken),
      });

      ctx.db.query.mockReturnValue({
        withIndex: mockWithIndex,
      });
      ctx.db.patch.mockResolvedValue("indexed_query_id");

      const args = { token: "specific_token_456" };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(mockWithIndex).toHaveBeenCalledWith("by_token", expect.any(Function));
    });

    it("handles database query errors gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.reject(new Error("Database query error")),
        }),
      });

      const args = { token };

      await expect(deactivatePushTokenHandler(ctx, args)).rejects.toThrow("Database query error");
      expect(ctx.db.patch).not.toHaveBeenCalled();
    });

    it("handles database patch errors gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockActiveToken),
        }),
      });
      ctx.db.patch.mockRejectedValue(new Error("Database patch error"));

      const args = { token };

      await expect(deactivatePushTokenHandler(ctx, args)).rejects.toThrow("Database patch error");
    });
  });

  describe("edge cases", () => {
    it("handles empty token string", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });

      const args = { token: "" };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(result).toBeNull();
    });

    it("handles very long token strings", async () => {
      const longToken = "a".repeat(1000);
      const longTokenDoc = { ...mockActiveToken, token: longToken };
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(longTokenDoc),
        }),
      });
      ctx.db.patch.mockResolvedValue("long_token_deactivated_id");

      const args = { token: longToken };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
      expect(result).toBe("long_token_deactivated_id");
    });

    it("handles special characters in token", async () => {
      const specialToken = "token-with_special.chars:123@domain.com";
      const specialTokenDoc = { ...mockActiveToken, token: specialToken };
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(specialTokenDoc),
        }),
      });
      ctx.db.patch.mockResolvedValue("special_token_deactivated_id");

      const args = { token: specialToken };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
    });

    it("handles whitespace in token", async () => {
      const whitespaceToken = "  token_with_spaces  ";
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });

      const args = { token: whitespaceToken };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(result).toBeNull();
    });
  });

  describe("token document variations", () => {
    it("works with iOS platform tokens", async () => {
      const iosToken = { ...mockActiveToken, platform: "ios" as const };
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(iosToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("ios_token_deactivated");

      const args = { token };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
    });

    it("works with Android platform tokens", async () => {
      const androidToken = { ...mockActiveToken, platform: "android" as const };
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(androidToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("android_token_deactivated");

      const args = { token };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
    });

    it("works with tokens that have different user IDs", async () => {
      const differentUserToken = { 
        ...mockActiveToken, 
        userId: "different_user_789" as Id<"taxiTap_users"> 
      };
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(differentUserToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("different_user_token_deactivated");

      const args = { token };

      await deactivatePushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("active_token_doc_id", {
        isActive: false,
        updatedAt: 1641168000000
      });
    });
  });

  describe("return value validation", () => {
    it("returns the result of db.patch when token exists", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockActiveToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("specific_patch_result");

      const args = { token };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(result).toBe("specific_patch_result");
    });

    it("returns exactly null when token does not exist", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });

      const args = { token };

      const result = await deactivatePushTokenHandler(ctx, args);

      expect(result).toBeNull();
      expect(result).not.toBeUndefined();
    });
  });

  describe("multiple calls behavior", () => {
    it("can deactivate multiple different tokens in sequence", async () => {
      const token1 = "token_1";
      const token2 = "token_2";
      const tokenDoc1 = { ...mockActiveToken, _id: "doc_1", token: token1 };
      const tokenDoc2 = { ...mockActiveToken, _id: "doc_2", token: token2 };

      ctx.db.query
        .mockReturnValueOnce({
          withIndex: () => ({
            first: () => Promise.resolve(tokenDoc1),
          }),
        })
        .mockReturnValueOnce({
          withIndex: () => ({
            first: () => Promise.resolve(tokenDoc2),
          }),
        });
      
      ctx.db.patch
        .mockResolvedValueOnce("result_1")
        .mockResolvedValueOnce("result_2");

      const result1 = await deactivatePushTokenHandler(ctx, { token: token1 });
      const result2 = await deactivatePushTokenHandler(ctx, { token: token2 });

      expect(ctx.db.patch).toHaveBeenCalledTimes(2);
      expect(ctx.db.patch).toHaveBeenNthCalledWith(1, "doc_1", {
        isActive: false,
        updatedAt: 1641168000000
      });
      expect(ctx.db.patch).toHaveBeenNthCalledWith(2, "doc_2", {
        isActive: false,
        updatedAt: 1641168000000
      });
      expect(result1).toBe("result_1");
      expect(result2).toBe("result_2");
    });
  });
});