import { switchBothToPassengerHandler } from "../../convex/functions/users/UserManagement/switchBothtoPassenger";
import { Id } from "../../convex/_generated/dataModel";

describe("switchBothToPassengerHandler", () => {
  let ctx: any;
  const userId = "user1" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
    jest.clearAllMocks();
  });

  it("throws if user not found", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    await expect(
      switchBothToPassengerHandler(ctx, { userId })
    ).rejects.toThrow("User not found");
  });

  it("throws if user accountType is not 'both'", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({
        first: () =>
          Promise.resolve({
            _id: userId,
            accountType: "driver",
            currentActiveRole: "driver",
          }),
      }),
    });

    await expect(
      switchBothToPassengerHandler(ctx, { userId })
    ).rejects.toThrow("User does not currently have both account types");
  });

  it("throws if user has active driver rides", async () => {
    // First call returns user with accountType "both"
    // Second call returns active rides for driver
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "both",
            }),
        }),
      }))
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve({ id: "ride1" }),
          }),
        }),
      }));

    await expect(
      switchBothToPassengerHandler(ctx, { userId })
    ).rejects.toThrow(
      "Cannot switch to passenger-only while you have active rides as a driver"
    );
  });

  it("successfully switches user to passenger only when no active driver rides", async () => {
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "both",
            }),
        }),
      }))
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve(null),
          }),
        }),
      }));

    ctx.db.patch.mockResolvedValue(true);

    const result = await switchBothToPassengerHandler(ctx, { userId });

    expect(ctx.db.patch).toHaveBeenCalledWith(userId, expect.objectContaining({
      accountType: "passenger",
      currentActiveRole: "passenger",
      lastRoleSwitchAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));

    expect(result).toEqual({
      success: true,
      message: "Account switched to passenger only",
    });
  });
});