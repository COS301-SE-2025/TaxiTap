import { startTripHandler } from "../../convex/functions/earnings/startTripHandler";
import { Id } from "../../convex/_generated/dataModel";

describe("startTripHandler (integration)", () => {
  let ctx: any;
  let passengerId: Id<"taxiTap_users">;
  let driverId: Id<"taxiTap_users">;

  beforeEach(async () => {
    ctx = await createTestContext();

    passengerId = await ctx.db.insert("taxiTap_users", {
      name: "Passenger",
      email: "passenger@example.com",
    });

    driverId = await ctx.db.insert("taxiTap_users", {
      name: "Driver",
      email: "driver@example.com",
    });
  });

  it("creates a trip when there is no matching ride", async () => {
    const tripId = await startTripHandler(ctx, {
      passengerId,
      driverId,
      reservation: false,
    });

    const trip = await ctx.db.get(tripId);
    expect(trip).toMatchObject({
      passengerId,
      driverId,
      fare: 0,
      reservation: false,
    });
  });

  it("patches a matching ride without a tripId", async () => {
    const rideId = await ctx.db.insert("rides", {
      passengerId,
      driverId,
    });

    const tripId = await startTripHandler(ctx, {
      passengerId,
      driverId,
      reservation: true,
    });

    const updatedRide = await ctx.db.get(rideId);
    expect(updatedRide?.tripId).toEqual(tripId);
  });

  it("does not patch rides that already have a tripId", async () => {
    const existingTripId = await ctx.db.insert("trips", {
      passengerId,
      driverId,
      startTime: Date.now(),
      endTime: 0,
      fare: 0,
      reservation: false,
    });

    const rideId = await ctx.db.insert("rides", {
      passengerId,
      driverId,
      tripId: existingTripId,
    });

    const newTripId = await startTripHandler(ctx, {
      passengerId,
      driverId,
      reservation: false,
    });

    const ride = await ctx.db.get(rideId);
    expect(ride?.tripId).toEqual(existingTripId);
    expect(ride?.tripId).not.toEqual(newTripId);
  });
});

export async function createTestContext() {
  const store: Record<string, Map<string, any>> = {
    taxiTap_users: new Map(),
    trips: new Map(),
    rides: new Map(),
  };

  let idCounter = 1;

  const db = {
    insert: async (table: keyof typeof store, value: any) => {
      const id = `id_${idCounter++}`;
      store[table].set(id, { _id: id, ...value });
      return id;
    },
    get: async (id: string) => {
      for (const table of Object.values(store)) {
        if (table.has(id)) return table.get(id);
      }
      return null;
    },
    patch: async (id: string, updates: any) => {
      for (const table of Object.values(store)) {
        if (table.has(id)) {
          const current = table.get(id);
          const updated = { ...current, ...updates };
          table.set(id, updated);
          return;
        }
      }
    },
    query: (table: keyof typeof store) => {
      let data = Array.from(store[table].values());
      return {
        withIndex: (_: string, __: any) => ({
          order: (_o: "desc" | "asc") => ({
            collect: async () => data,
          }),
        }),
      };
    },
  };

  return { db };
}