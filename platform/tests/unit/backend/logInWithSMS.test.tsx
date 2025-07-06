import { signUpSMSHandler } from "../../../convex/functions/users/UserManagement/signUpWithSMS";
import { MutationCtx } from "../../../convex/_generated/server";

// FULL mock of convex/values
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

describe("signUpSMSHandler", () => {
  let ctx: MutationCtx;

  beforeEach(() => {
    jest.clearAllMocks();

    // Fully cast db as 'any' to suppress TS complaints
    ctx = {
      db: {
        query: jest.fn(),
        insert: jest.fn(),
      },
    } as unknown as MutationCtx;
  });

  it("successfully creates a passenger user", async () => {
    const firstMock = jest.fn().mockResolvedValue(null);
    (ctx.db.query as any).mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: firstMock,
      }),
    });

    ctx.db.insert = jest
      .fn()
      .mockResolvedValueOnce("newUserId")
      .mockResolvedValueOnce("locationId")
      .mockResolvedValueOnce("passengerProfileId");

    const args = {
      phoneNumber: "123456789",
      name: "Test User",
      password: "Password123!",
      accountType: "passenger" as const,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(result).toEqual({ success: true, userId: "newUserId" });
    expect(ctx.db.insert).toHaveBeenCalledTimes(3);
  });

  it("successfully creates a driver user", async () => {
    const firstMock = jest.fn().mockResolvedValue(null);
    (ctx.db.query as any).mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: firstMock,
      }),
    });

    ctx.db.insert = jest
      .fn()
      .mockResolvedValueOnce("driverUserId")
      .mockResolvedValueOnce("locationId")
      .mockResolvedValueOnce("driverProfileId");

    const args = {
      phoneNumber: "987654321",
      name: "Driver User",
      password: "DriverPass!23",
      accountType: "driver" as const,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(result).toEqual({ success: true, userId: "driverUserId" });
    expect(ctx.db.insert).toHaveBeenCalledTimes(3);
  });

  it("throws if phone number already exists", async () => {
    const firstMock = jest.fn().mockResolvedValue({ _id: "existingUserId" });
    (ctx.db.query as any).mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: firstMock,
      }),
    });

    const args = {
      phoneNumber: "123456789",
      name: "Someone",
      password: "pass123",
      accountType: "passenger" as const,
    };

    await expect(signUpSMSHandler(ctx, args)).rejects.toThrow("Phone number already exists");
  });

  it("handles race condition on insert", async () => {
    const firstMock = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: "raceUserId" });

    (ctx.db.query as any).mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: firstMock,
      }),
    });

    ctx.db.insert = jest.fn().mockRejectedValueOnce(new Error("DB insert failed"));

    const args = {
      phoneNumber: "999999999",
      name: "Race User",
      password: "racePass!",
      accountType: "passenger" as const,
    };

    await expect(signUpSMSHandler(ctx, args)).rejects.toThrow("Phone number already exists (race condition)");
  });

  it("throws on unknown error", async () => {
    const firstMock = jest.fn().mockResolvedValue(null);
    (ctx.db.query as any).mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        first: firstMock,
      }),
    });

    ctx.db.insert = jest.fn().mockRejectedValueOnce(new Error("Unknown DB error"));

    const args = {
      phoneNumber: "111222333",
      name: "Error User",
      password: "errorPass",
      accountType: "passenger" as const,
    };

    await expect(signUpSMSHandler(ctx, args)).rejects.toThrow("Unknown DB error");
  });
});