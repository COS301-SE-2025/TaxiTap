import {
  getUserByIdHandler,
  getUserByPhoneHandler,
  getUserWithProfilesHandler,
} from "../../convex/functions/users/UserManagement/getUserById";
import type { Doc, Id } from "../../convex/_generated/dataModel";

describe("User Queries Integration Tests", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        get: jest.fn(),
        query: jest.fn(),
      },
    };
  });

  describe("getUserByIdHandler", () => {
    it("returns user data when user exists", async () => {
      const user: Doc<"taxiTap_users"> = {
        _id: "user_1" as Id<"taxiTap_users">,
        _creationTime: Date.now(),
        password: "hashedPassword123",

        name: "Alice",
        email: "alice@example.com",
        age: 30,
        phoneNumber: "1234567890",
        isVerified: true,
        isActive: true,
        accountType: "passenger",
        currentActiveRole: "passenger",
        lastRoleSwitchAt: 1620000000000,
        profilePicture: "url",
        dateOfBirth: 694224000000,
        gender: "female",
        emergencyContact: {
            name: "Bob",
            phoneNumber: "0987654321",
            relationship: "brother",
        },
        createdAt: 1600000000000,
        updatedAt: 1620000000000,
        lastLoginAt: 1625000000000,
    };

      ctx.db.get.mockResolvedValue(user);

      const result = await getUserByIdHandler(ctx, { userId: "user_1" });

      expect(ctx.db.get).toHaveBeenCalledWith("user_1");
      expect(result).toEqual({
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isActive: user.isActive,
        accountType: user.accountType,
        currentActiveRole: user.currentActiveRole,
        lastRoleSwitchAt: user.lastRoleSwitchAt,
        profilePicture: user.profilePicture,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        emergencyContact: user.emergencyContact,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      });
    });

    it("throws error when user not found", async () => {
      ctx.db.get.mockResolvedValue(null);

      await expect(getUserByIdHandler(ctx, { userId: "nonexistent" })).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("getUserByPhoneHandler", () => {
    it("returns user data when user exists", async () => {
      const user = {
        _id: "user_2" as Id<"taxiTap_users">,
        name: "Bob",
        email: "bob@example.com",
        age: 40,
        phoneNumber: "0987654321",
        isVerified: false,
        isActive: true,
        accountType: "driver",
        currentActiveRole: "driver",
        lastRoleSwitchAt: 1621000000000,
        profilePicture: "url2",
        dateOfBirth: "1982-05-05",
        gender: "male",
        emergencyContact: "1234509876",
        createdAt: 1590000000000,
        updatedAt: 1621000000000,
        lastLoginAt: 1626000000000,
      };

      // Mock the chained query with withIndex and first
      const queryResult = {
        first: jest.fn().mockResolvedValue(user),
      };
      ctx.db.query.mockReturnValue({
        withIndex: () => queryResult,
      });

      const result = await getUserByPhoneHandler(ctx, { phoneNumber: "0987654321" });

      expect(ctx.db.query).toHaveBeenCalledWith("taxiTap_users");
      expect(result).toEqual({
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified,
        isActive: user.isActive,
        accountType: user.accountType,
        currentActiveRole: user.currentActiveRole,
        lastRoleSwitchAt: user.lastRoleSwitchAt,
        profilePicture: user.profilePicture,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        emergencyContact: user.emergencyContact,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      });
    });

    it("throws error when user not found", async () => {
      const queryResult = {
        first: jest.fn().mockResolvedValue(null),
      };
      ctx.db.query.mockReturnValue({
        withIndex: () => queryResult,
      });

      await expect(getUserByPhoneHandler(ctx, { phoneNumber: "0000000000" })).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("getUserWithProfilesHandler", () => {
    it("returns user with driver and passenger profiles when accountType is 'both'", async () => {
      const user: Doc<"taxiTap_users"> = {
        _id: "user_3" as Id<"taxiTap_users">,
        _creationTime: Date.now(),
        password: "hashedPassword123",
        name: "Charlie",
        email: "charlie@example.com",
        age: 28,
        phoneNumber: "1112223333",
        isVerified: true,
        isActive: true,
        accountType: "both",
        currentActiveRole: "driver",
        lastRoleSwitchAt: 1622000000000,
        profilePicture: "url3",
        dateOfBirth: 694224000000,
        gender: "other",
        emergencyContact: {
            name: "Bob",
            phoneNumber: "0987654321",
            relationship: "brother",
        },
        createdAt: 1610000000000,
        updatedAt: 1622000000000,
        lastLoginAt: 1627000000000,
      };

      const driverProfile = {
        id: "driver_1",
        userId: user._id,
        numberOfRidesCompleted: 100,
        totalDistance: 1000,
        totalFare: 500,
        averageRating: 4.9,
        activeRoute: "route_1",
        assignedRoute: "route_2",
        taxiAssociation: "TA",
        routeAssignedAt: 1621000000000,
      };

      const passengerProfile = {
        id: "passenger_1",
        userId: user._id,
        numberOfRidesTaken: 50,
        totalDistance: 500,
        totalFare: 250,
        averageRating: 4.8,
        createdAt: 1600000000000,
        updatedAt: 1622000000000,
      };

      ctx.db.get.mockResolvedValue(user);

      // Mock driver profile query
      const driverQueryResult = {
        withIndex: () => ({ first: jest.fn().mockResolvedValue(driverProfile) }),
      };

      // Mock passenger profile query
      const passengerQueryResult = {
        withIndex: () => ({ first: jest.fn().mockResolvedValue(passengerProfile) }),
      };

      // ctx.db.query will be called 2 times in order:
      // 1. for driver profile, 2. for passenger profile
      ctx.db.query
        .mockReturnValueOnce(driverQueryResult)
        .mockReturnValueOnce(passengerQueryResult);

      const result = await getUserWithProfilesHandler(ctx, { userId: "user_3" });

      expect(ctx.db.get).toHaveBeenCalledWith("user_3");

      expect(ctx.db.query).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          age: user.age,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          isActive: user.isActive,
          accountType: user.accountType,
          currentActiveRole: user.currentActiveRole,
          lastRoleSwitchAt: user.lastRoleSwitchAt,
          profilePicture: user.profilePicture,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          emergencyContact: user.emergencyContact,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
        },
        driverProfile,
        passengerProfile,
      });
    });

    it("returns user with null profiles when user is 'passenger' only and no driver profile found", async () => {
      const user: Doc<"taxiTap_users"> = {
        _id: "user_4" as Id<"taxiTap_users">,
        _creationTime: Date.now(),
        password: "hashedPassword123",
        accountType: "passenger",
        currentActiveRole: "passenger",
        name: "Dana",
        email: "dana@example.com",
        age: 25,
        phoneNumber: "2223334444",
        isVerified: true,
        isActive: true,
        lastRoleSwitchAt: 1623000000000,
        profilePicture: undefined,
        dateOfBirth: 694224000000,
        gender: "female",
        emergencyContact: {
            name: "Bob",
            phoneNumber: "0987654321",
            relationship: "brother",
        },
        createdAt: 1605000000000,
        updatedAt: 1623000000000,
        lastLoginAt: 1628000000000,
      };

      ctx.db.get.mockResolvedValue(user);

      const passengerQueryResult = {
        withIndex: () => ({ first: jest.fn().mockResolvedValue(null) }),
      };

      ctx.db.query.mockReturnValue(passengerQueryResult);

      const result = await getUserWithProfilesHandler(ctx, { userId: "user_4" });

      expect(result.user.accountType).toBe("passenger");
      expect(result.driverProfile).toBeNull();
      expect(result.passengerProfile).toBeNull();
    });

    it("throws error when user not found", async () => {
      ctx.db.get.mockResolvedValue(null);

      await expect(getUserWithProfilesHandler(ctx, { userId: "nonexistent" })).rejects.toThrow(
        "User not found"
      );
    });
  });
});