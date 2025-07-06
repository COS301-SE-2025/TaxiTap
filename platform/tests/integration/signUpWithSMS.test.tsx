import { signUpSMSHandler } from "../../convex/functions/users/UserManagement/signUpWithSMS";

describe("signUpSMSHandler", () => {
  let ctx: any;
  let insertedUsers: any[] = [];
  let insertedLocations: any[] = [];
  let insertedPassengers: any[] = [];
  let insertedDrivers: any[] = [];

  beforeEach(() => {
    insertedUsers = [];
    insertedLocations = [];
    insertedPassengers = [];
    insertedDrivers = [];

    ctx = {
      db: {
        query: jest.fn().mockReturnValue({
          withIndex: () => ({
            first: () => Promise.resolve(null),
          }),
        }),
        insert: jest.fn(async (table: string, data: any) => {
          if (table === "taxiTap_users") {
            const id = `user_${insertedUsers.length + 1}`;
            insertedUsers.push({ id, ...data });
            return id;
          } else if (table === "locations") {
            insertedLocations.push(data);
            return `location_${insertedLocations.length}`;
          } else if (table === "passengers") {
            insertedPassengers.push(data);
            return `passenger_${insertedPassengers.length}`;
          } else if (table === "drivers") {
            insertedDrivers.push(data);
            return `driver_${insertedDrivers.length}`;
          }
          return null;
        }),
      },
    };
  });

  it("creates a passenger user correctly", async () => {
    const args = {
      phoneNumber: "1234567890",
      name: "Alice",
      password: "password123",
      accountType: "passenger" as const,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId");

    // User record inserted
    expect(insertedUsers).toHaveLength(1);
    expect(insertedUsers[0]).toMatchObject({
      phoneNumber: args.phoneNumber,
      name: args.name,
      accountType: "passenger",
      currentActiveRole: "passenger",
      isVerified: false,
      isActive: true,
    });

    // Location inserted with role passenger
    expect(insertedLocations).toHaveLength(1);
    expect(insertedLocations[0]).toMatchObject({
      userId: result.userId,
      role: "passenger",
      latitude: 0,
      longitude: 0,
    });

    // Passenger record created
    expect(insertedPassengers).toHaveLength(1);
    expect(insertedPassengers[0]).toMatchObject({
      userId: result.userId,
      numberOfRidesTaken: 0,
      totalDistance: 0,
      totalFare: 0,
    });

    // No driver record
    expect(insertedDrivers).toHaveLength(0);
  });

  it("creates a driver user correctly", async () => {
    const args = {
      phoneNumber: "0987654321",
      name: "Bob",
      password: "driverpass",
      accountType: "driver" as const,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(result.success).toBe(true);
    expect(insertedUsers[0]).toMatchObject({
      accountType: "driver",
      currentActiveRole: "driver",
    });

    expect(insertedLocations[0]).toMatchObject({
      role: "driver",
      userId: result.userId,
    });

    expect(insertedDrivers).toHaveLength(1);
    expect(insertedDrivers[0]).toMatchObject({
      userId: result.userId,
      numberOfRidesCompleted: 0,
      totalDistance: 0,
      totalFare: 0,
      averageRating: undefined,
    });

    expect(insertedPassengers).toHaveLength(0);
  });

  it("creates a user with both roles correctly", async () => {
    const args = {
      phoneNumber: "5555555555",
      name: "Charlie",
      password: "bothpass",
      accountType: "both" as const,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(result.success).toBe(true);

    // Current active role should be passenger (default for both)
    expect(insertedUsers[0]).toMatchObject({
      accountType: "both",
      currentActiveRole: "passenger",
    });

    // Location role should be driver (per your logic)
    expect(insertedLocations[0]).toMatchObject({
      role: "driver",
    });

    expect(insertedPassengers).toHaveLength(1);
    expect(insertedDrivers).toHaveLength(1);
  });

  it("throws if phone number already exists", async () => {
    // Mock existing user found
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve({ _id: "user_existing" }),
      }),
    });

    await expect(
      signUpSMSHandler(ctx, {
        phoneNumber: "1111111111",
        name: "Existing User",
        password: "pass",
        accountType: "passenger",
      })
    ).rejects.toThrow("Phone number already exists");
  });

  it("uses default age when none provided", async () => {
    const args = {
      phoneNumber: "2222222222",
      name: "Default Age User",
      password: "password",
      accountType: "passenger" as const,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(insertedUsers[0].age).toBe(18);
  });

  it("accepts provided age", async () => {
    const args = {
      phoneNumber: "3333333333",
      name: "Age Provided",
      password: "password",
      accountType: "driver" as const,
      age: 25,
    };

    const result = await signUpSMSHandler(ctx, args);

    expect(insertedUsers[0].age).toBe(25);
  });
});