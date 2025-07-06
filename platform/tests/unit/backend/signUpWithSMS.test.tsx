import { signUpSMSHandler } from "../../../convex/functions/users/UserManagement/signUpWithSMS";
import { MutationCtx } from "../../../convex/_generated/server";

// Fully mock convex/values (pure runtime, avoid TS errors)
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

// Helper function to create loose MutationCtx mock
function createMockMutationCtx(): MutationCtx {
  return {
    db: {
      query: jest.fn(),
      insert: jest.fn(),
    },
  } as unknown as MutationCtx; // <-- the critical cast to loosen TS
}

describe("signUpSMSHandler", () => {
  let ctx: MutationCtx;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = createMockMutationCtx();
  });

  it("successfully creates a passenger user", async () => {
    const firstMock = jest.fn().mockResolvedValue(null);
    (ctx.db.query as jest.Mock).mockReturnValue({
      withIndex: jest.fn(() => ({
        first: firstMock,
      })),
    });

    (ctx.db.insert as jest.Mock)
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
  });

  it("throws if phone number already exists", async () => {
    const firstMock = jest.fn().mockResolvedValue({ _id: "existingUserId" });
    (ctx.db.query as jest.Mock).mockReturnValue({
      withIndex: jest.fn(() => ({
        first: firstMock,
      })),
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
      .mockResolvedValueOnce(null) // first check
      .mockResolvedValueOnce({ _id: "raceUserId" }); // second check after failure

    (ctx.db.query as jest.Mock).mockReturnValue({
      withIndex: jest.fn(() => ({
        first: firstMock,
      })),
    });

    (ctx.db.insert as jest.Mock).mockRejectedValueOnce(new Error("DB insert failed"));

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
    (ctx.db.query as jest.Mock).mockReturnValue({
      withIndex: jest.fn(() => ({
        first: firstMock,
      })),
    });

    (ctx.db.insert as jest.Mock).mockRejectedValueOnce(new Error("Unknown DB error"));

    const args = {
      phoneNumber: "111222333",
      name: "Error User",
      password: "errorPass",
      accountType: "passenger" as const,
    };

    await expect(signUpSMSHandler(ctx, args)).rejects.toThrow("Unknown DB error");
  });
});