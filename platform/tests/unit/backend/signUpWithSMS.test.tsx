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
  } as unknown as MutationCtx;
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
      .mockResolvedValueOnce("newUserId") // taxiTap_users
      .mockResolvedValueOnce("passengerProfileId") // passengers
      .mockResolvedValueOnce("locationId"); // locations

    const args = {
      phoneNumber: "123456789",
      name: "Test User",
      password: "Password123!",
      accountType: "passenger" as const,
      deviceId: "device1",
    };

    const result = await signUpSMSHandler(ctx, args);
    expect(result).toEqual({
      success: true,
      reason: null,
      userId: "newUserId",
    });
  });

  it("returns error if phone number already exists", async () => {
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
      deviceId: "device1",
    };

    const result = await signUpSMSHandler(ctx, args);
    expect(result).toEqual({
      success: false,
      reason: "Phone number already exists",
      userId: null,
    });
  });

  it("returns error if insert fails", async () => {
    const firstMock = jest.fn().mockResolvedValue(null);
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
      deviceId: "device1",
    };

    const result = await signUpSMSHandler(ctx, args);
    expect(result).toEqual({
      success: false,
      reason: "Signup failed",
      userId: null,
    });
  });

  it("returns error on unknown db error", async () => {
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
      deviceId: "device1",
    };

    const result = await signUpSMSHandler(ctx, args);
    expect(result).toEqual({
      success: false,
      reason: "Signup failed",
      userId: null,
    });
  });
});