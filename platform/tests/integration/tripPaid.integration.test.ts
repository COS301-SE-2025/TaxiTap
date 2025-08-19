import { tripPaidHandler } from "../../convex/functions/rides/tripPaidHandler";

describe("tripPaidHandler - integration style", () => {
  let dbData: any;
  let ctx: any;

  beforeEach(() => {
    dbData = {
      rides: [
        { _id: "r1", rideId: "ride1", passengerId: "user1", tripPaid: false },
        { _id: "r2", rideId: "ride2", passengerId: "user2", tripPaid: null },
      ],
    };

    ctx = {
      db: {
        get: async (id: string) => {
          // Try to find by _id
          return dbData.rides.find((r: any) => r._id === id) || null;
        },
        query: (table: string) => ({
          withIndex: (_indexName: string, fn: any) => {
            const q = {
              eq: (_field: string, value: string) => value,
            };
            const targetValue = fn(q);
            return {
              first: async () => dbData[table].find((r: any) => r.rideId === targetValue) || null,
            };
          },
          filter: (fn: any) => {
            const q = {
              eq: (field: any, value: string) => {
                // Mock the field function to return the field name
                const fieldFunc = (fieldName: string) => fieldName;
                return { field: fieldFunc, value };
              },
              field: (fieldName: string) => fieldName,
            };
            
            const filterResult = fn(q);
            
            return {
              first: async () => {
                // Since this is a fallback method, find by rideId
                return dbData[table].find((r: any) => r.rideId === filterResult.value) || null;
              },
            };
          },
          collect: async () => dbData[table] || [],
        }),
        patch: async (id: string, patchObj: any) => {
          const ride = dbData.rides.find((r: any) => r._id === id);
          if (ride) Object.assign(ride, patchObj);
        },
      },
    };
  });

  it("updates tripPaid when user is passenger", async () => {
    await tripPaidHandler(ctx, "ride1", "user1", true);
    expect(dbData.rides.find((r: any) => r.rideId === "ride1")!.tripPaid).toBe(true);
  });

  it("throws error when ride not found", async () => {
    await expect(tripPaidHandler(ctx, "rideX", "user1", true)).rejects.toThrow("Ride not found");
  });

  it("throws error when user is not passenger", async () => {
    await expect(tripPaidHandler(ctx, "ride2", "user1", true)).rejects.toThrow(
      "Only the passenger can confirm payment for this ride"
    );
  });

  it("can set tripPaid to false", async () => {
    await tripPaidHandler(ctx, "ride2", "user2", false);
    expect(dbData.rides.find((r: any) => r.rideId === "ride2")!.tripPaid).toBe(false);
  });
});