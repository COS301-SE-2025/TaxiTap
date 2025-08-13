import { startTripHandler } from "../../../convex/functions/earnings/startTripHandler";
import { Id } from "@/convex/_generated/dataModel";

describe("startTripHandler", () => {
  let ctx: any;
  let insertedRecords: Record<string, any[]>;

  beforeEach(() => {
    insertedRecords = {
      trips: [],
      rides: [],
    };

    ctx = {
      db: {
        insert: jest.fn(async (table: string, record: any) => {
          const id = `${table}_${insertedRecords[table].length + 1}`;
          insertedRecords[table].push({ _id: id, ...record });
          return id as Id<any>;
        }),
        query: jest.fn((table: string) => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              collect: jest.fn(async () => insertedRecords[table]),
            })),
          })),
        })),
        patch: jest.fn(async (id: string, patchData: any) => {
          for (const table in insertedRecords) {
            const index = insertedRecords[table].findIndex(r => r._id === id);
            if (index !== -1) {
              insertedRecords[table][index] = {
                ...insertedRecords[table][index],
                ...patchData,
              };
            }
          }
        }),
      },
    };
  });

  it("creates a trip when no rides match", async () => {
    const tripId = await startTripHandler(ctx, {
      passengerId: "user_1" as Id<"taxiTap_users">,
      driverId: "user_2" as Id<"taxiTap_users">,
      reservation: false,
    });

    expect(tripId).toBe("trips_1");
    expect(insertedRecords.trips).toHaveLength(1);
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("patches a matching ride without a tripId", async () => {
    insertedRecords.rides.push({
      _id: "rides_1",
      passengerId: "user_1",
      driverId: "user_2",
    });

    const tripId = await startTripHandler(ctx, {
      passengerId: "user_1" as Id<"taxiTap_users">,
      driverId: "user_2" as Id<"taxiTap_users">,
      reservation: true,
    });

    expect(tripId).toBe("trips_1");
    expect(ctx.db.patch).toHaveBeenCalledWith("rides_1", { tripId: "trips_1" });
  });

  it("does not patch rides that already have a tripId", async () => {
    insertedRecords.rides.push({
      _id: "rides_1",
      passengerId: "user_1",
      driverId: "user_2",
      tripId: "trips_old",
    });

    await startTripHandler(ctx, {
      passengerId: "user_1" as Id<"taxiTap_users">,
      driverId: "user_2" as Id<"taxiTap_users">,
      reservation: false,
    });

    expect(ctx.db.patch).not.toHaveBeenCalled();
  });
});