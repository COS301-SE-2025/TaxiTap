import { registerPushTokenHandler } from "../../convex/functions/notifications/registerPushToken";
import { Id } from "../../convex/_generated/dataModel";

describe("registerPushTokenHandler", () => {
  let ctx: any;
  const userId = "user_123" as Id<"taxiTap_users">;
  const token = "firebase_token_abc123";
  const platform = "ios" as const;
  
  const mockExistingToken = {
    _id: "token_doc_id",
    userId: "other_user" as Id<"taxiTap_users">,
    token: "firebase_token_abc123",
    platform: "android" as const,
    isActive: false,
    createdAt: 1640995200000,
    updatedAt: 1640995200000,
    lastUsedAt: 1640995200000
  };

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
    
    // Mock Date.now() to return consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1641081600000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("new token registration", () => {
    it("creates new push token when token does not exist", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("new_token_id");

      const args = {
        userId,
        token,
        platform,
      };

      const result = await registerPushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.insert).toHaveBeenCalledTimes(1);
      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId,
        token,
        platform,
        isActive: true,
        createdAt: 1641081600000,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
      expect(ctx.db.patch).not.toHaveBeenCalled();
      expect(result).toBe("new_token_id");
    });

    it("creates new token for different platforms", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("android_token_id");

      const args = {
        userId,
        token: "android_token_xyz789",
        platform: "android" as const,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId,
        token: "android_token_xyz789",
        platform: "android",
        isActive: true,
        createdAt: 1641081600000,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
    });
  });

  describe("existing token update", () => {
    it("updates existing token when token already exists", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockExistingToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("updated_token_id");

      const args = {
        userId,
        token,
        platform,
      };

      const result = await registerPushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(ctx.db.patch).toHaveBeenCalledTimes(1);
      expect(ctx.db.patch).toHaveBeenCalledWith("token_doc_id", {
        userId,
        isActive: true,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
      expect(ctx.db.insert).not.toHaveBeenCalled();
      expect(result).toBe("updated_token_id");
    });

    it("reassigns token to new user when updating existing token", async () => {
      const differentUser = "user_456" as Id<"taxiTap_users">;
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockExistingToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("reassigned_token_id");

      const args = {
        userId: differentUser,
        token,
        platform: "android" as const,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("token_doc_id", {
        userId: differentUser,
        isActive: true,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
    });

    it("reactivates inactive token", async () => {
      const inactiveToken = { ...mockExistingToken, isActive: false };
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(inactiveToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("reactivated_token_id");

      const args = {
        userId,
        token,
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("token_doc_id", {
        userId,
        isActive: true,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
    });
  });

  describe("database query behavior", () => {
    it("queries pushTokens with correct index and filter", async () => {
      const mockWithIndex = jest.fn().mockReturnValue({
        first: () => Promise.resolve(null),
      });

      ctx.db.query.mockReturnValue({
        withIndex: mockWithIndex,
      });
      ctx.db.insert.mockResolvedValue("new_token_id");

      const args = {
        userId,
        token: "specific_token_123",
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("pushTokens");
      expect(mockWithIndex).toHaveBeenCalledWith("by_token", expect.any(Function));
    });

    it("handles database query errors gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.reject(new Error("Database query error")),
        }),
      });

      const args = {
        userId,
        token,
        platform,
      };

      await expect(registerPushTokenHandler(ctx, args)).rejects.toThrow("Database query error");
      expect(ctx.db.insert).not.toHaveBeenCalled();
      expect(ctx.db.patch).not.toHaveBeenCalled();
    });

    it("handles database insert errors gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockRejectedValue(new Error("Database insert error"));

      const args = {
        userId,
        token,
        platform,
      };

      await expect(registerPushTokenHandler(ctx, args)).rejects.toThrow("Database insert error");
    });

    it("handles database patch errors gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockExistingToken),
        }),
      });
      ctx.db.patch.mockRejectedValue(new Error("Database patch error"));

      const args = {
        userId,
        token,
        platform,
      };

      await expect(registerPushTokenHandler(ctx, args)).rejects.toThrow("Database patch error");
    });
  });

  describe("edge cases", () => {
    it("handles empty token string", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("empty_token_id");

      const args = {
        userId,
        token: "",
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId,
        token: "",
        platform,
        isActive: true,
        createdAt: 1641081600000,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
    });

    it("handles very long token strings", async () => {
      const longToken = "a".repeat(1000);
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("long_token_id");

      const args = {
        userId,
        token: longToken,
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId,
        token: longToken,
        platform,
        isActive: true,
        createdAt: 1641081600000,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
    });

    it("handles special characters in token", async () => {
      const specialToken = "token-with_special.chars:123@domain.com";
      
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("special_token_id");

      const args = {
        userId,
        token: specialToken,
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId,
        token: specialToken,
        platform,
        isActive: true,
        createdAt: 1641081600000,
        updatedAt: 1641081600000,
        lastUsedAt: 1641081600000
      });
    });
  });

  describe("timestamp consistency", () => {
    it("uses same timestamp for all date fields when creating new token", async () => {
      const fixedTimestamp = 1641168000000;
      jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);

      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("timestamp_token_id");

      const args = {
        userId,
        token,
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", {
        userId,
        token,
        platform,
        isActive: true,
        createdAt: fixedTimestamp,
        updatedAt: fixedTimestamp,
        lastUsedAt: fixedTimestamp
      });
    });

    it("uses current timestamp for updatedAt and lastUsedAt when updating", async () => {
      const updateTimestamp = 1641254400000;
      jest.spyOn(Date, 'now').mockReturnValue(updateTimestamp);

      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockExistingToken),
        }),
      });
      ctx.db.patch.mockResolvedValue("updated_timestamp_id");

      const args = {
        userId,
        token,
        platform,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.patch).toHaveBeenCalledWith("token_doc_id", {
        userId,
        isActive: true,
        updatedAt: updateTimestamp,
        lastUsedAt: updateTimestamp
      });
    });
  });

  describe("platform variations", () => {
    it("handles iOS platform correctly", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("ios_token_id");

      const args = {
        userId,
        token: "ios_token_123",
        platform: "ios" as const,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", expect.objectContaining({
        platform: "ios"
      }));
    });

    it("handles Android platform correctly", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });
      ctx.db.insert.mockResolvedValue("android_token_id");

      const args = {
        userId,
        token: "android_token_456",
        platform: "android" as const,
      };

      await registerPushTokenHandler(ctx, args);

      expect(ctx.db.insert).toHaveBeenCalledWith("pushTokens", expect.objectContaining({
        platform: "android"
      }));
    });
  });
});