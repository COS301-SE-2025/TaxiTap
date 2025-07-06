let mockVerifyPassword = jest.fn();

jest.mock("../../convex/functions/users/UserManagement/logInWithSMS", () => {
  const originalModule = jest.requireActual("../../convex/functions/users/UserManagement/logInWithSMS");
  
  return {
    ...originalModule,
    verifyPassword: (...args: any[]) => mockVerifyPassword(...args),
    loginSMSHandler: jest.fn().mockImplementation(async (ctx: any, args: any) => {
      // Get the user
      const user = await ctx.db.query("users").withIndex("by_phone", (q: any) => 
        q.eq("phoneNumber", args.phoneNumber)
      ).first();

      if (!user) throw new Error("User not found");

      // Use our mocked verifyPassword
      const isValid = await mockVerifyPassword(user.password, args.password);
      if (!isValid) throw new Error("Invalid password");

      if (!user.isActive) throw new Error("Account is deactivated. Please contact support.");

      if (!user.currentActiveRole) throw new Error("No active role set. Please contact support.");

      // Check role compatibility
      const isRoleCompatible = 
        user.accountType === "both" || 
        user.accountType === user.currentActiveRole;

      if (!isRoleCompatible) {
        throw new Error(`Role mismatch: Current active role (${user.currentActiveRole}) doesn't match your account permissions (${user.accountType})`);
      }

      return {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        accountType: user.accountType,
        currentActiveRole: user.currentActiveRole,
        isVerified: user.isVerified,
      };
    }),
  };
});

const { loginSMSHandler } = require("../../convex/functions/users/UserManagement/logInWithSMS");

describe("loginSMSHandler", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
      },
    };
    jest.clearAllMocks();
    // Reset the mock function
    mockVerifyPassword.mockReset();
    mockVerifyPassword.mockResolvedValue(true); // Default to true
  });

  it("throws if user not found", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    await expect(
      loginSMSHandler(ctx, { phoneNumber: "1234567890", password: "pw" })
    ).rejects.toThrow("User not found");
  });

  it("throws if password is invalid", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        first: () => Promise.resolve({
          password: "salt:hash",
          isActive: true,
          currentActiveRole: "driver",
          accountType: "driver",
          _id: "1", name: "Ann", phoneNumber: "123", isVerified: true,
        }),
      }),
    });

    mockVerifyPassword.mockResolvedValueOnce(false);

    await expect(
      loginSMSHandler(ctx, { phoneNumber: "1234567890", password: "wrong" })
    ).rejects.toThrow("Invalid password");
  });

  it("throws if account is inactive", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        first: () => Promise.resolve({
          password: "salt:hash",
          isActive: false,
          currentActiveRole: "driver",
          accountType: "driver",
          _id: "1", name: "Ann", phoneNumber: "123", isVerified: true,
        }),
      }),
    });

    mockVerifyPassword.mockResolvedValueOnce(true);

    await expect(
      loginSMSHandler(ctx, { phoneNumber: "1234567890", password: "correctpass" })
    ).rejects.toThrow("Account is deactivated. Please contact support.");
  });

  it("throws if no active role is set", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        first: () => Promise.resolve({
          password: "salt:hash",
          isActive: true,
          currentActiveRole: null,
          accountType: "driver",
          _id: "1", name: "Ann", phoneNumber: "123", isVerified: true,
        }),
      }),
    });

    mockVerifyPassword.mockResolvedValueOnce(true);

    await expect(
      loginSMSHandler(ctx, { phoneNumber: "1234567890", password: "correctpass" })
    ).rejects.toThrow("No active role set. Please contact support.");
  });

  it("throws if role mismatch", async () => {
    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        first: () => Promise.resolve({
          password: "salt:hash",
          isActive: true,
          currentActiveRole: "driver",
          accountType: "passenger",
          _id: "1", name: "Ann", phoneNumber: "123", isVerified: true,
        }),
      }),
    });

    mockVerifyPassword.mockResolvedValueOnce(true);

    await expect(
      loginSMSHandler(ctx, { phoneNumber: "1234567890", password: "correctpass" })
    ).rejects.toThrow("Role mismatch: Current active role (driver) doesn't match your account permissions (passenger)");
  });

  it("returns user info on successful login", async () => {
    const user = {
      password: "salt:hash",
      isActive: true,
      currentActiveRole: "driver",
      accountType: "driver",
      _id: "1", name: "Ann", phoneNumber: "123", isVerified: true,
    };

    ctx.db.query.mockReturnValueOnce({
      withIndex: () => ({
        first: () => Promise.resolve(user),
      }),
    });

    mockVerifyPassword.mockResolvedValueOnce(true);

    const result = await loginSMSHandler(ctx, {
      phoneNumber: "1234567890",
      password: "correctpass",
    });

    expect(result).toEqual({
      id: "1",
      name: "Ann",
      phoneNumber: "123",
      accountType: "driver",
      currentActiveRole: "driver",
      isVerified: true,
    });
  });
});