import { switchActiveRoleHandler } from "../../convex/functions/users/UserManagement/switchActiveRole";
import { Id } from "../../convex/_generated/dataModel";

describe("switchActiveRoleHandler", () => {
  let ctx: any;
  const userId = "user1" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
        insert: jest.fn(),
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
      switchActiveRoleHandler(ctx, { userId, newRole: "driver" })
    ).rejects.toThrow("User not found");
  });

  it("throws if user accountType is not 'both'", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({
        first: () =>
          Promise.resolve({
            _id: userId,
            accountType: "passenger",
            currentActiveRole: "passenger",
          }),
      }),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId, newRole: "driver" })
    ).rejects.toThrow("User must have both account types to switch active roles");
  });

  it("throws if newRole is same as currentActiveRole", async () => {
    ctx.db.query.mockReturnValue({
      filter: () => ({
        first: () =>
          Promise.resolve({
            _id: userId,
            accountType: "both",
            currentActiveRole: "driver",
          }),
      }),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId, newRole: "driver" })
    ).rejects.toThrow("User is already in driver mode");
  });

  it("throws if switching to passenger but active driver rides exist", async () => {
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "driver",
            }),
        }),
      })) // user query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve({ id: "ride1" }),
          }),
        }),
      })); // activeDriverRides query

    await expect(
      switchActiveRoleHandler(ctx, { userId, newRole: "passenger" })
    ).rejects.toThrow(
      "Cannot switch to passenger mode while you have active rides as a driver"
    );
  });

  it("throws if switching to driver but active passenger rides exist", async () => {
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "passenger",
            }),
        }),
      })) // user query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve({ id: "ride2" }),
          }),
        }),
      })); // activePassengerRides query

    await expect(
      switchActiveRoleHandler(ctx, { userId, newRole: "driver" })
    ).rejects.toThrow(
      "Cannot switch to driver mode while you have active rides as a passenger"
    );
  });

  it("successfully switches from driver to passenger", async () => {
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "driver",
            }),
        }),
      })) // user query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve(null), // no active rides as driver
          }),
        }),
      })); 

    ctx.db.patch.mockResolvedValue(true);

    const result = await switchActiveRoleHandler(ctx, { userId, newRole: "passenger" });

    expect(ctx.db.patch).toHaveBeenCalledWith(userId, expect.objectContaining({
      currentActiveRole: "passenger",
      lastRoleSwitchAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));

    expect(result).toEqual({
      success: true,
      message: "Successfully switched to passenger mode",
      newRole: "passenger",
    });
  });

  it("successfully switches from passenger to driver and inserts location if missing", async () => {
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "passenger",
            }),
        }),
      })) // user query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve(null), // no active rides as passenger
          }),
        }),
      })) // activePassengerRides query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve(null), // no existing location
        }),
      })); // existingLocation query

    ctx.db.patch.mockResolvedValue(true);
    ctx.db.insert.mockResolvedValue("location_1");

    const result = await switchActiveRoleHandler(ctx, { userId, newRole: "driver" });

    expect(ctx.db.patch).toHaveBeenCalledWith(userId, expect.objectContaining({
      currentActiveRole: "driver",
      lastRoleSwitchAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));

    expect(ctx.db.insert).toHaveBeenCalledWith("locations", expect.objectContaining({
      userId,
      latitude: 0,
      longitude: 0,
      role: "driver",
      updatedAt: expect.any(String),
    }));

    expect(result).toEqual({
      success: true,
      message: "Successfully switched to driver mode",
      newRole: "driver",
    });
  });

  it("successfully switches from passenger to driver and skips location insert if exists", async () => {
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "both",
              currentActiveRole: "passenger",
            }),
        }),
      })) // user query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          filter: () => ({
            first: () => Promise.resolve(null), // no active rides as passenger
          }),
        }),
      })) // activePassengerRides query
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve({ userId }), // existing location found
        }),
      })); // existingLocation query

    ctx.db.patch.mockResolvedValue(true);

    const result = await switchActiveRoleHandler(ctx, { userId, newRole: "driver" });

    expect(ctx.db.patch).toHaveBeenCalledWith(userId, expect.objectContaining({
      currentActiveRole: "driver",
    }));

    expect(ctx.db.insert).not.toHaveBeenCalled();

    expect(result.success).toBe(true);
  });
});