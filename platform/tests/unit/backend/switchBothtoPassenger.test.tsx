// Mock the convex/values module to provide v.id function for tests
jest.mock("convex/values", () => {
  return {
    v: {
      id: (tableName: string) => `mocked-id-for-${tableName}`
    }
  };
});

import { switchBothToPassengerHandler } from ".../../../convex/functions/users/UserManagement/switchBothtoPassenger";
import type { Id } from "../../../convex/_generated/dataModel";

describe("switchBothToPassengerHandler", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  it("throws error if user not found", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({ first: () => Promise.resolve(null) }),
    });

    await expect(
      switchBothToPassengerHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("User not found");
  });

  it("throws error if user does not have 'both' account type", async () => {
    ctx.db.query.mockReturnValueOnce({
      filter: () => ({ first: () => Promise.resolve({ accountType: "passenger" }) }),
    });

    await expect(
      switchBothToPassengerHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("User does not currently have both account types");
  });

  it("throws error if user has active driver rides", async () => {
    ctx.db.query
      .mockReturnValueOnce({
        filter: () => ({ first: () => Promise.resolve({ accountType: "both" }) }),
      })
      .mockReturnValueOnce({
        withIndex: () => ({
          filter: () => ({ first: () => Promise.resolve({ rideId: "ride_123" }) }),
        }),
      });

    await expect(
      switchBothToPassengerHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("Cannot switch to passenger-only while you have active rides as a driver");
  });

  it("successfully switches user to passenger", async () => {
    ctx.db.query
      .mockReturnValueOnce({
        filter: () => ({ first: () => Promise.resolve({ accountType: "both" }) }),
      })
      .mockReturnValueOnce({
        withIndex: () => ({
          filter: () => ({ first: () => Promise.resolve(null) }),
        }),
      });

    ctx.db.patch.mockResolvedValue(undefined);

    const result = await switchBothToPassengerHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> });

    expect(ctx.db.patch).toHaveBeenCalledWith("user_1", expect.objectContaining({
      accountType: "passenger",
      currentActiveRole: "passenger",
    }));

    expect(result).toEqual({
      success: true,
      message: "Account switched to passenger only",
    });
  });
});