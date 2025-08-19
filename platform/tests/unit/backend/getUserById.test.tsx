// __tests__/unit/backend/getUser.test.tsx

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock convex modules
jest.mock("../../../convex/_generated/server", () => ({
  query: (fn: any) => fn,
}));

jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => ({})),
    string: jest.fn(() => ({})),
  }
}));

import * as userModule from "../../../convex/functions/users/UserManagement/getUserById";

// Create QueryCtx mock
function createQueryCtx() {
  const first = jest.fn();
  const withIndex = jest.fn(() => ({ first }));
  const query = jest.fn(() => ({ withIndex }));

  return {
    db: {
      get: jest.fn(),
      query,
    },
    _internal: { first, withIndex }  // Optional: allow easy access in tests
  };
}

describe("getUser queries", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createQueryCtx();
  });

  describe("getUserByIdHandler", () => {
    it("returns user when found", async () => {
      const mockUser = {
        _id: "user1",
        name: "Ann",
        email: "ann@example.com",
        age: 25,
        phoneNumber: "12345",
        isVerified: true,
        isActive: true,
        accountType: "driver",
        currentActiveRole: "driver",
        lastRoleSwitchAt: "2024-06-01",
        profilePicture: "pic.jpg",
        dateOfBirth: "1999-01-01",
        gender: "female",
        emergencyContact: "911",
        createdAt: "2023-01-01",
        updatedAt: "2024-01-01",
        lastLoginAt: "2024-06-24"
      };
      ctx.db.get.mockResolvedValue(mockUser);
      const result = await userModule.getUserByIdHandler(ctx, { userId: "user1" });

      expect(result._id).toBe("user1");
    });

    it("throws error if user not found", async () => {
      ctx.db.get.mockResolvedValue(null);
      await expect(userModule.getUserByIdHandler(ctx, { userId: "user1" }))
        .rejects
        .toThrow("User not found");
    });
  });

  describe("getUserByPhoneHandler", () => {
    it("returns user when found", async () => {
      const mockUser = {
        _id: "user2",
        name: "John",
        email: "john@example.com",
        age: 30,
        phoneNumber: "55555",
        isVerified: false,
        isActive: false,
        accountType: "passenger",
        currentActiveRole: null,
        lastRoleSwitchAt: null,
        profilePicture: null,
        dateOfBirth: null,
        gender: null,
        emergencyContact: null,
        createdAt: "2023-02-01",
        updatedAt: "2024-01-01",
        lastLoginAt: "2024-06-20"
      };

      ctx.db.query().withIndex().first.mockResolvedValue(mockUser);
      const result = await userModule.getUserByPhoneHandler(ctx, { phoneNumber: "55555" });

      expect(result._id).toBe("user2");
    });

    it("throws error if user not found", async () => {
      ctx.db.query().withIndex().first.mockResolvedValue(null);
      await expect(userModule.getUserByPhoneHandler(ctx, { phoneNumber: "55555" }))
        .rejects
        .toThrow("User not found");
    });
  });

  describe("getUserWithProfilesHandler", () => {
    it("returns user without profiles if not driver/passenger", async () => {
      const mockUser = {
        _id: "user4",
        name: "Tom",
        email: "tom@example.com",
        accountType: "admin", // invalid type (no profiles)
      };

      ctx.db.get.mockResolvedValue(mockUser);
      const result = await userModule.getUserWithProfilesHandler(ctx, { userId: "user4" });

      expect(result.driverProfile).toBeNull();
      expect(result.passengerProfile).toBeNull();
    });

    it("throws error if user not found", async () => {
      ctx.db.get.mockResolvedValue(null);
      await expect(userModule.getUserWithProfilesHandler(ctx, { userId: "user5" }))
        .rejects
        .toThrow("User not found");
    });
  });

});