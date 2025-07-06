import { switchActiveRoleHandler } from "../../../convex/functions/users/UserManagement/switchActiveRole";
import { MutationCtx } from "../../../convex/_generated/server";

// Full mock convex/values (because your main file imports it, so we need to avoid type errors)
jest.mock("convex/values", () => ({
  v: {
    id: jest.fn(() => ({})),
    string: jest.fn(() => ({})),
    number: jest.fn(() => ({})),
    literal: jest.fn((val) => val),
    union: jest.fn((...args) => args),
    optional: jest.fn((val) => val),
  },
}));

describe("switchActiveRoleHandler", () => {
  let ctx: MutationCtx;

  beforeEach(() => {
    jest.clearAllMocks();

    // Loose mock for MutationCtx
    ctx = {
      db: {
        query: jest.fn(),
        patch: jest.fn(),
        insert: jest.fn(),
      },
    } as unknown as MutationCtx;
  });

  it("throws error if user not found", async () => {
    (ctx.db.query as any).mockReturnValue({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue(null),
      })),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "driver" })
    ).rejects.toThrow("User not found");
  });

  it("throws error if user does not have 'both' accountType", async () => {
    (ctx.db.query as any).mockReturnValue({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue({
          _id: "user1",
          accountType: "driver",
        }),
      })),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "passenger" })
    ).rejects.toThrow("User must have both account types to switch active roles");
  });

  it("throws error if switching to same role", async () => {
    (ctx.db.query as any).mockReturnValue({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue({
          _id: "user1",
          accountType: "both",
          currentActiveRole: "driver",
        }),
      })),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "driver" })
    ).rejects.toThrow("User is already in driver mode");
  });

  it("throws if active driver rides exist when switching to passenger", async () => {
    // mock user fetch
    (ctx.db.query as any).mockReturnValueOnce({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue({
          _id: "user1",
          accountType: "both",
          currentActiveRole: "driver",
        }),
      })),
    });

    // mock rides query for active driver rides
    (ctx.db.query as any).mockReturnValueOnce({
      withIndex: jest.fn(() => ({
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue({
            _id: "ride1",
          }),
        })),
      })),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "passenger" })
    ).rejects.toThrow("Cannot switch to passenger mode while you have active rides as a driver");
  });

  it("throws if active passenger rides exist when switching to driver", async () => {
    (ctx.db.query as any).mockReturnValueOnce({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue({
          _id: "user1",
          accountType: "both",
          currentActiveRole: "passenger",
        }),
      })),
    });

    (ctx.db.query as any).mockReturnValueOnce({
      withIndex: jest.fn(() => ({
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue({
            _id: "ride2",
          }),
        })),
      })),
    });

    await expect(
      switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "driver" })
    ).rejects.toThrow("Cannot switch to driver mode while you have active rides as a passenger");
  });

  it("switches successfully to passenger mode", async () => {
    (ctx.db.query as any).mockReturnValueOnce({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue({
          _id: "user1",
          accountType: "both",
          currentActiveRole: "driver",
        }),
      })),
    });

    (ctx.db.query as any).mockReturnValueOnce({
      withIndex: jest.fn(() => ({
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(null),
        })),
      })),
    });

    const result = await switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "passenger" });

    expect(result.success).toBe(true);
    expect(result.newRole).toBe("passenger");
    expect(ctx.db.patch).toHaveBeenCalled();
  });

  it("switches successfully to driver mode and inserts location if not exists", async () => {
    (ctx.db.query as any).mockReturnValueOnce({
      filter: jest.fn(() => ({
        first: jest.fn().mockResolvedValue({
          _id: "user1",
          accountType: "both",
          currentActiveRole: "passenger",
        }),
      })),
    });

    (ctx.db.query as any).mockReturnValueOnce({
      withIndex: jest.fn(() => ({
        filter: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(null),
        })),
      })),
    });

    // Check location existence
    (ctx.db.query as any).mockReturnValueOnce({
      withIndex: jest.fn(() => ({
        first: jest.fn().mockResolvedValue(null),
      })),
    });

    const result = await switchActiveRoleHandler(ctx, { userId: "user1" as any, newRole: "driver" });

    expect(result.success).toBe(true);
    expect(result.newRole).toBe("driver");
    expect(ctx.db.patch).toHaveBeenCalled();
    expect(ctx.db.insert).toHaveBeenCalled(); // for locations
  });
});