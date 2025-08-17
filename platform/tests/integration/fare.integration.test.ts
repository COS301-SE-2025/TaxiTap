import { getFareForLatestTripHandler } from "../../convex/functions/earnings/fareHandler";
import { Id } from "@/convex/_generated/dataModel";

describe("getFareForLatestTripHandler - integration", () => {
  let ctx: any;
  let passengerId: Id<"taxiTap_users">;
  let driverId: Id<"taxiTap_users">;

  beforeEach(async () => {
    ctx = createTestContext();

    passengerId = await ctx.db.insert("taxiTap_users", {
      name: "Passenger",
      email: "passenger@example.com",
    });

    driverId = await ctx.db.insert("taxiTap_users", {
      name: "Driver",
      email: "driver@example.com",
    });
  });

  it("returns fare when user is a passenger", async () => {
    await ctx.db.insert("trips", {
      passengerId,
      driverId,
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      fare: 42,
    });

    const fare = await getFareForLatestTripHandler(ctx, { userId: passengerId });
    expect(fare).toBe(42);
  });

  it("returns fare when user is a driver", async () => {
    await ctx.db.insert("trips", {
      passengerId,
      driverId,
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      fare: 55,
    });

    const fare = await getFareForLatestTripHandler(ctx, { userId: driverId });
    expect(fare).toBe(55);
  });

  it("returns null if no trips exist", async () => {
    const fare = await getFareForLatestTripHandler(ctx, { userId: passengerId });
    expect(fare).toBeNull();
  });
});

// ---- Test Context Helper ----
function createTestContext() {
  type Table = "taxiTap_users" | "trips";
  const data: Record<Table, Map<string, any>> = {
    taxiTap_users: new Map(),
    trips: new Map(),
  };

  let idCounter = 1;
  const genId = () => `id_${idCounter++}`;

  return {
    db: {
      insert: async (table: Table, record: any) => {
        const id = genId();
        data[table].set(id, { _id: id, ...record });
        return id;
      },
      query: (table: Table) => {
        let results = Array.from(data[table].values());

        return {
          withIndex: (indexName: string, queryFn: any) => {
            // For simplicity, only match eq filters from queryFn
            const eqWrapper = {
              eq: (field: string, value: any) => {
                results = results.filter((r) => r[field] === value);
                return eqWrapper;
              },
            };
            queryFn(eqWrapper);
            return {
              order: () => ({
                first: async () =>
                  results.sort((a, b) => b.startTime - a.startTime)[0] || null,
              }),
            };
          },
        };
      },
    },
  };
}