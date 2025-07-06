import { switchPassengerToBothHandler } from "../../convex/functions/users/UserManagement/switchPassengertoBoth";
import { Id } from "../../convex/_generated/dataModel";

describe("switchPassengerToBothHandler", () => {
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
      switchPassengerToBothHandler(ctx, { userId })
    ).rejects.toThrow("User not found");
  });

  it("throws if user is not a passenger", async () => {
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
      switchPassengerToBothHandler(ctx, { userId })
    ).rejects.toThrow("User is not currently a passenger");
  });

  it("creates driver profile and location if missing and switches accountType to both", async () => {
    // First call returns user with accountType passenger
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "passenger",
              currentActiveRole: "passenger",
            }),
        }),
      }))
      // Second call checks for existing driver profile and returns null
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      }))
      // Third call checks for existing location and returns null
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      }));

    ctx.db.patch.mockResolvedValue(true);
    ctx.db.insert.mockResolvedValueOnce("driverProfile1");
    ctx.db.insert.mockResolvedValueOnce("location1");

    const result = await switchPassengerToBothHandler(ctx, { userId });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        accountType: "both",
        currentActiveRole: "passenger",
        lastRoleSwitchAt: expect.any(Number),
        updatedAt: expect.any(Number),
      })
    );

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "drivers",
      expect.objectContaining({
        userId,
        numberOfRidesCompleted: 0,
        totalDistance: 0,
        totalFare: 0,
        averageRating: undefined,
        activeRoute: undefined,
        assignedRoute: undefined,
        taxiAssociation: "",
        routeAssignedAt: undefined,
      })
    );

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "locations",
      expect.objectContaining({
        userId,
        latitude: 0,
        longitude: 0,
        role: "driver",
        updatedAt: expect.any(String),
      })
    );

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both passenger and driver",
    });
  });

  it("does not create driver profile or location if they already exist", async () => {
    // First call returns user with accountType passenger
    ctx.db.query
      .mockImplementationOnce(() => ({
        filter: () => ({
          first: () =>
            Promise.resolve({
              _id: userId,
              accountType: "passenger",
              currentActiveRole: "passenger",
            }),
        }),
      }))
      // Second call returns existing driver profile
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve({ _id: "driverProfile1" }),
        }),
      }))
      // Third call returns existing location
      .mockImplementationOnce(() => ({
        withIndex: () => ({
          first: () => Promise.resolve({ _id: "location1" }),
        }),
      }));

    ctx.db.patch.mockResolvedValue(true);

    const result = await switchPassengerToBothHandler(ctx, { userId });

    expect(ctx.db.patch).toHaveBeenCalledWith(userId, expect.objectContaining({
      accountType: "both",
      currentActiveRole: "passenger",
      lastRoleSwitchAt: expect.any(Number),
      updatedAt: expect.any(Number),
    }));

    expect(ctx.db.insert).not.toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: "Account upgraded to both passenger and driver",
    });
  });
});