import { tripPaidHandler } from "../../convex/functions/rides/tripPaidHandler";
import { Id } from "../../convex/_generated/dataModel";

// Mock the badge service
jest.mock("../../convex/functions/badges/badgeService", () => ({
  checkAndAwardTrustedPayerBadge: jest.fn().mockResolvedValue(false),
}));

describe("tripPaidHandler - integration style", () => {
  let dbData: any;
  let ctx: any;

  beforeEach(() => {
    dbData = {
      rides: [
        { _id: "r1" as Id<"rides">, rideId: "ride1", passengerId: "user1" as Id<"taxiTap_users">, tripPaid: false },
        { _id: "r2" as Id<"rides">, rideId: "ride2", passengerId: "user2" as Id<"taxiTap_users">, tripPaid: null },
      ],
    };

    ctx = {
      db: {
        get: async (id: Id<"rides">) => {
          return dbData.rides.find((r: any) => r._id === id) || null;
        },
        query: (table: string) => ({
          withIndex: (_indexName: string, fn: any) => {
            const q = { eq: (_field: string, value: string) => value };
            const targetValue = fn(q);
            return {
              first: async () => dbData[table].find((r: any) => r.rideId === targetValue) || null,
            };
          },
          filter: (filterFn: any) => {
            const q = { 
              eq: (field: any, value: any) => ({ field, value }),
              field: (fieldName: string) => fieldName
            };
            const filterResult = filterFn(q);
            return {
              first: async () => {
                if (filterResult.field === "rideId") {
                  return dbData[table].find((r: any) => r.rideId === filterResult.value) || null;
                }
                return null;
              }
            };
          },
          collect: async () => dbData[table],
        }),
        patch: async (id: Id<"rides">, patchObj: any) => {
          const ride = dbData.rides.find((r: any) => r._id === id);
          if (ride) Object.assign(ride, patchObj);
        },
      },
    };
  });

  it("updates tripPaid when user is passenger", async () => {
    await tripPaidHandler(ctx, "ride1", "user1" as Id<"taxiTap_users">, true, 100, "exact");
    expect(dbData.rides.find((r: any) => r.rideId === "ride1")!.tripPaid).toBe(true);
  });

  it("throws error when ride not found", async () => {
    await expect(
      tripPaidHandler(ctx, "rideX", "user1" as Id<"taxiTap_users">, true, 50, "underpaid")
    ).rejects.toThrow("Ride not found");
  });

  it("throws error when user is not passenger", async () => {
    await expect(
      tripPaidHandler(ctx, "ride2", "user1" as Id<"taxiTap_users">, true, 100, "exact")
    ).rejects.toThrow("Only the passenger can confirm payment for this ride");
  });

  it("can set tripPaid to false", async () => {
    await tripPaidHandler(ctx, "ride2", "user2" as Id<"taxiTap_users">, false, null, "underpaid");
    expect(dbData.rides.find((r: any) => r.rideId === "ride2")!.tripPaid).toBe(false);
  });
});