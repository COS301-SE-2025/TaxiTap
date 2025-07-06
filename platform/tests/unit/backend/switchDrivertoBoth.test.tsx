// Mock the convex/values module to provide v.id function for tests
jest.mock("convex/values", () => {
  return {
    v: {
      id: (tableName: string) => `mocked-id-for-${tableName}`
    }
  };
});

import { switchDriverToBothHandler } from "../../../convex/functions/users/UserManagement/switchDrivertoBoth";
import type { Id } from "../../../convex/_generated/dataModel";

describe("switchDriverToBothHandler", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
        insert: jest.fn(),
      },
    };
  });

  it("throws error if user not found", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({ first: () => Promise.resolve(null) }),
    });

    await expect(
      switchDriverToBothHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("User not found");
  });

  it("throws error if user is not a driver", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({ first: () => Promise.resolve({ accountType: "passenger" }) }),
    });

    await expect(
      switchDriverToBothHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("User is not currently a driver");
  });

  it("updates user account type and sets active role", async () => {
    ctx.db.query
      .mockReturnValueOnce({
        filter: () => ({ first: () => Promise.resolve({ accountType: "driver" }) }),
      })
      .mockReturnValueOnce({
        withIndex: () => ({ first: () => Promise.resolve({ /* existing passenger profile */ }) }),
      });

    ctx.db.patch.mockResolvedValue(undefined);

    const result = await switchDriverToBothHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> });

    expect(ctx.db.patch).toHaveBeenCalledWith("user_1", expect.objectContaining({
      accountType: "both",
      currentActiveRole: "driver",
    }));

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both driver and passenger",
    });

    // Since passenger profile exists, no insert should be called
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it("creates passenger profile if none exists", async () => {
    ctx.db.query
      .mockReturnValueOnce({
        filter: () => ({ first: () => Promise.resolve({ accountType: "driver" }) }),
      })
      .mockReturnValueOnce({
        withIndex: () => ({ first: () => Promise.resolve(null) }), // no passenger profile
      });

    ctx.db.patch.mockResolvedValue(undefined);
    ctx.db.insert.mockResolvedValue(undefined);

    const result = await switchDriverToBothHandler(ctx, { userId: "user_2" as Id<"taxiTap_users"> });

    expect(ctx.db.patch).toHaveBeenCalledWith("user_2", expect.objectContaining({
      accountType: "both",
      currentActiveRole: "driver",
    }));

    expect(ctx.db.insert).toHaveBeenCalledWith("passengers", expect.objectContaining({
      userId: "user_2",
      numberOfRidesTaken: 0,
      totalDistance: 0,
      totalFare: 0,
      averageRating: undefined,
    }));

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both driver and passenger",
    });
  });
});