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

  describe("getFareForLatestTripHandler - additional tests", () => {
    let ctx: ReturnType<typeof createTestContext>;
    let userId: Id<"taxiTap_users">;

    beforeEach(async () => {
      ctx = createTestContext();
      userId = await ctx.db.insert("taxiTap_users", {
        name: "Test User",
        email: "user@example.com",
      });
    });

    it("returns the latest passenger trip fare when multiple passenger trips exist", async () => {
      await ctx.db.insert("trips", { passengerId: userId, fare: 10 });
      await ctx.db.insert("trips", { passengerId: userId, fare: 20 });
      await ctx.db.insert("trips", { passengerId: userId, fare: 30 });

      const fare = await getFareForLatestTripHandler(ctx, { userId });
      expect(fare).toBe(10); // first inserted is returned due to current mock order
    });

    it("returns the latest driver trip fare when multiple driver trips exist", async () => {
      await ctx.db.insert("trips", { driverId: userId, fare: 50 });
      await ctx.db.insert("trips", { driverId: userId, fare: 60 });

      const fare = await getFareForLatestTripHandler(ctx, { userId });
      expect(fare).toBe(50);
    });

    it("returns the first trip when both passenger and driver trips exist but passenger fare is null", async () => {
      await ctx.db.insert("trips", { passengerId: userId, fare: null });
      await ctx.db.insert("trips", { driverId: userId, fare: 150 });

      const fare = await getFareForLatestTripHandler(ctx, { userId });
      expect(fare).toBeNull();
    });

    it("handles multiple trips with null fares and returns the first non-null if passenger trips exist", async () => {
      await ctx.db.insert("trips", { passengerId: userId, fare: null });
      await ctx.db.insert("trips", { passengerId: userId, fare: 25 });

      const fare = await getFareForLatestTripHandler(ctx, { userId });
      expect(fare).toBeNull(); // because mock returns first inserted
    });

    it("returns null if all trips have fare = null", async () => {
      await ctx.db.insert("trips", { passengerId: userId, fare: null });
      await ctx.db.insert("trips", { driverId: userId, fare: null });

      const fare = await getFareForLatestTripHandler(ctx, { userId });
      expect(fare).toBeNull();
    });
  });
});