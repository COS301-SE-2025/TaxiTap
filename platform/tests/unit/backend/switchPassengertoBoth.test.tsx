// Mock the convex/values module to provide v.id function for tests
jest.mock("convex/values", () => {
  return {
    v: {
      id: (tableName: string) => `mocked-id-for-${tableName}`
    }
  };
});

import { switchPassengerToBothHandler } from "../../../convex/functions/users/UserManagement/switchPassengertoBoth";
import type { Id } from "../../../convex/_generated/dataModel";

describe("switchPassengerToBothHandler", () => {
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
      switchPassengerToBothHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("User not found");
  });

  it("throws error if user is not a passenger", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({ first: () => Promise.resolve({ accountType: "driver" }) }),
    });

    await expect(
      switchPassengerToBothHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> })
    ).rejects.toThrow("User is not currently a passenger");
  });

  it("updates user account type and skips inserts if profiles exist", async () => {
    // First query to get user
    ctx.db.query
      .mockReturnValueOnce({
        filter: () => ({ first: () => Promise.resolve({ accountType: "passenger" }) }),
      })
      // Second query to find existing driver profile
      .mockReturnValueOnce({
        withIndex: () => ({ first: () => Promise.resolve({ /* driver profile exists */ }) }),
      })
      // Third query to find existing location
      .mockReturnValueOnce({
        withIndex: () => ({ first: () => Promise.resolve({ /* location exists */ }) }),
      });

    ctx.db.patch.mockResolvedValue(undefined);

    const result = await switchPassengerToBothHandler(ctx, { userId: "user_1" as Id<"taxiTap_users"> });

    expect(ctx.db.patch).toHaveBeenCalledWith("user_1", expect.objectContaining({
      accountType: "both",
      currentActiveRole: "passenger",
    }));

    expect(ctx.db.insert).not.toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both passenger and driver",
    });
  });

  it("inserts driver profile and location if missing", async () => {
    ctx.db.query
      .mockReturnValueOnce({
        filter: () => ({ first: () => Promise.resolve({ accountType: "passenger" }) }),
      })
      .mockReturnValueOnce({
        withIndex: () => ({ first: () => Promise.resolve(null) }), // no driver profile
      })
      .mockReturnValueOnce({
        withIndex: () => ({ first: () => Promise.resolve(null) }), // no location
      });

    ctx.db.patch.mockResolvedValue(undefined);
    ctx.db.insert.mockResolvedValue(undefined);

    const result = await switchPassengerToBothHandler(ctx, { userId: "user_2" as Id<"taxiTap_users"> });

    expect(ctx.db.patch).toHaveBeenCalledWith("user_2", expect.objectContaining({
      accountType: "both",
      currentActiveRole: "passenger",
    }));

    expect(ctx.db.insert).toHaveBeenCalledWith("drivers", expect.objectContaining({
      userId: "user_2",
      numberOfRidesCompleted: 0,
      totalDistance: 0,
      totalFare: 0,
      averageRating: undefined,
      taxiAssociation: "",
    }));

    expect(ctx.db.insert).toHaveBeenCalledWith("locations", expect.objectContaining({
      userId: "user_2",
      latitude: 0,
      longitude: 0,
      role: "driver",
    }));

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both passenger and driver",
    });
  });
});