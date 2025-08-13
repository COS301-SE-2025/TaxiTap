import { endTripHandler } from "../../convex/functions/earnings/endTripHandler";
import { Id } from "@/convex/_generated/dataModel";

describe("endTripHandler", () => {
  let ctx: any;
  let passengerId: Id<"taxiTap_users">;

  beforeEach(async () => {
    ctx = await createTestContext();

    passengerId = await ctx.db.insert("taxiTap_users", {
      name: "Test Passenger",
      email: "passenger@example.com",
    });
  });

  it("ends an ongoing trip and returns fare", async () => {
    const tripId = await ctx.db.insert("trips", {
      passengerId,
      startTime: Date.now() - 10000,
      endTime: 0,
      fare: null,
    });

    await ctx.db.insert("rides", {
      tripId,
      driverId: await ctx.db.insert("taxiTap_users", {
        name: "Driver",
        email: "driver@example.com",
      }),
      estimatedFare: 50,
    });

    const result = await endTripHandler(ctx, { passengerId });

    expect(result.fare).toBe(50);
    expect(result.endTime).toBeGreaterThan(0);

    const updatedTrip = await ctx.db.get(tripId);
    expect(updatedTrip?.fare).toBe(50);
    expect(updatedTrip?.endTime).toBe(result.endTime);
  });

  it("throws error if no ongoing trip is found", async () => {
    await expect(endTripHandler(ctx, { passengerId })).rejects.toThrow(
      "No ongoing trip found."
    );
  });

  it("throws error if ride has no estimated fare", async () => {
    const tripId = await ctx.db.insert("trips", {
      passengerId,
      startTime: Date.now() - 10000,
      endTime: 0,
      fare: null,
    });

    await ctx.db.insert("rides", {
      tripId,
      driverId: await ctx.db.insert("taxiTap_users", {
        name: "Driver",
        email: "driver@example.com",
      }),
      estimatedFare: null,
    });

    await expect(endTripHandler(ctx, { passengerId })).rejects.toThrow(
      "Estimated fare not found for this trip."
    );
  });
});

function createTestContext() {
  type TableName = "taxiTap_users" | "trips" | "rides";

  const data: Record<TableName, Map<string, any>> = {
    taxiTap_users: new Map(),
    trips: new Map(),
    rides: new Map(),
  };

  let idCounter = 1;
  const genId = () => `id_${idCounter++}`;

  return {
    db: {
      insert: async (table: TableName, record: any) => {
        const id = genId();
        data[table].set(id, { _id: id, ...record });
        return id;
      },
      get: async (id: string) => {
        for (const table of Object.keys(data) as TableName[]) {
          if (data[table].has(id)) {
            return data[table].get(id);
          }
        }
        return null;
      },
      query: (table: TableName) => {
        return {
          withIndex: (indexName: string, queryFn: any) => ({
            order: () => ({
              collect: async () => {
                let allRecords = Array.from(data[table].values());
                // Apply simple filtering if queryFn calls eq(field, val)
                let filterField: string | undefined;
                let filterVal: any;
                const mockQ = {
                  eq: (field: string, val: any) => {
                    filterField = field;
                    filterVal = val;
                    return mockQ;
                  },
                };
                queryFn(mockQ);
                if (filterField !== undefined) {
                  allRecords = allRecords.filter((rec) => rec[filterField!] === filterVal);
                }
                return allRecords;
              },
            }),
            unique: async () => {
              let allRecords = Array.from(data[table].values());
              let filterField: string | undefined;
              let filterVal: any;
              const mockQ = {
                eq: (field: string, val: any) => {
                  filterField = field;
                  filterVal = val;
                  return mockQ;
                },
              };
              queryFn(mockQ);
              if (filterField !== undefined) {
                allRecords = allRecords.filter((rec) => rec[filterField!] === filterVal);
              }
              return allRecords.length > 0 ? allRecords[0] : null;
            },
          }),
        };
      },
      patch: async (id: string, patchData: any) => {
        for (const table of Object.keys(data) as TableName[]) {
          if (data[table].has(id)) {
            const existing = data[table].get(id);
            data[table].set(id, { ...existing, ...patchData });
            return;
          }
        }
        throw new Error(`Patch failed: id ${id} not found`);
      },
    },
  };
}