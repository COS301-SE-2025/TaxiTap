import { switchDriverToBothHandler } from "../../convex/functions/users/UserManagement/switchDrivertoBoth";
import { Id } from "../../convex/_generated/dataModel";

describe("switchDriverToBothHandler", () => {
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
      switchDriverToBothHandler(ctx, { userId })
    ).rejects.toThrow("User not found");
  });

  it("throws if user is not a driver", async () => {
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
      switchDriverToBothHandler(ctx, { userId })
    ).rejects.toThrow("User is not currently a driver");
  });

  it("creates passenger profile if missing and switches accountType to both", async () => {
    // First call returns user with accountType driver
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "driver",
              currentActiveRole: "driver",
            }),
        }),
      }))
      // Second call checks for existing passenger profile and returns null
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      }));

    ctx.db.patch.mockResolvedValue(true);
    ctx.db.insert.mockResolvedValue("passenger1");

    const result = await switchDriverToBothHandler(ctx, { userId });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        accountType: "both",
        currentActiveRole: "driver",
        lastRoleSwitchAt: expect.any(Number),
        updatedAt: expect.any(Number),
      })
    );

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "passengers",
      expect.objectContaining({
        userId,
        numberOfRidesTaken: 0,
        totalDistance: 0,
        totalFare: 0,
        averageRating: undefined,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      })
    );

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both driver and passenger",
    });
  });

  it("does not create passenger profile if already exists", async () => {
    // First call returns user with accountType driver
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "driver",
              currentActiveRole: "driver",
            }),
        }),
      }))
      // Second call returns existing passenger profile
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve({ _id: "passenger1" }),
        }),
      }));

    ctx.db.patch.mockResolvedValue(true);

    const result = await switchDriverToBothHandler(ctx, { userId });

    expect(ctx.db.patch).toHaveBeenCalledWith(userId, expect.objectContaining({
      accountType: "both",
      currentActiveRole: "driver",
      lastRoleSwitchAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));

    expect(ctx.db.insert).not.toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both driver and passenger",
    });
  });
});