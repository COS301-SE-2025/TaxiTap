import { getFareForLatestTripHandler } from "../../../convex/functions/earnings/fareHandler";
import { Id } from "@/convex/_generated/dataModel";

function createTestContext() {
  const data = {
    taxiTap_users: new Map<string, any>(),
    trips: new Map<string, any>(),
  } as const;

  let idCounter = 1;
  const genId = () => `id_${idCounter++}`;

  return {
    db: {
      insert: async <T extends keyof typeof data>(
        table: T,
        record: any
      ): Promise<Id<T>> => {
        const id = genId();
        data[table].set(id, { _id: id, ...record });
        return id as Id<T>;
      },
      query: (table: keyof typeof data) => ({
        withIndex: (_indexName: string, _queryFn: any) => ({
          order: () => ({
            first: async () => {
              const allRecords = Array.from(data[table].values());
              return allRecords.length > 0 ? allRecords[0] : null;
            },
          }),
        }),
      }),
    },
    _data: data,
  };
}

describe("getFareForLatestTripHandler", () => {
  let ctx: ReturnType<typeof createTestContext>;
  let userId: Id<"taxiTap_users">;

  beforeEach(async () => {
    ctx = createTestContext();
    userId = await ctx.db.insert("taxiTap_users", {
      name: "Test User",
      email: "user@example.com",
    });
  });

  it("returns fare when user is passenger", async () => {
    await ctx.db.insert("trips", {
      passengerId: userId,
      fare: 42,
    });

    const fare = await getFareForLatestTripHandler(ctx, { userId });
    expect(fare).toBe(42);
  });

  it("returns fare when user is driver", async () => {
    await ctx.db.insert("trips", {
      driverId: userId,
      fare: 99,
    });

    const fare = await getFareForLatestTripHandler(ctx, { userId });
    expect(fare).toBe(99);
  });

  it("returns null when no trips found", async () => {
    const fare = await getFareForLatestTripHandler(ctx, { userId });
    expect(fare).toBeNull();
  });

  it("returns null when passenger trip found but fare is null and driver trip is missing", async () => {
    await ctx.db.insert("trips", {
      passengerId: userId,
      fare: null,
    });

    const fare = await getFareForLatestTripHandler(ctx, { userId });
    expect(fare).toBeNull();
  });

  it("returns null when driver trip found but fare is null", async () => {
    await ctx.db.insert("trips", {
      driverId: userId,
      fare: null,
    });

    const fare = await getFareForLatestTripHandler(ctx, { userId });
    expect(fare).toBeNull();
  });
});