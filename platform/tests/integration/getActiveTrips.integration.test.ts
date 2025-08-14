import { getActiveTripsHandler } from "../../convex/functions/rides/getActiveTripsHandler";

let dbData: any;

const createTestCtx = () => {
  return {
    db: {
      query: (table: string) => ({
        withIndex: (_indexName: string, _fn: any) => ({
          filter: (filterFn: any) => ({
            collect: async () => {
              if (table === "rides") {
                return dbData[table].filter((ride: any) => {
                  const field = (name: string) => ride[name];
                  const eq = (a: any, b: any) => a === b;

                  return filterFn({ eq, field });
                });
              }
              return dbData[table] || [];
            },
          }),
        }),
      }),
      get: async (id: string) => dbData.passengers[id] || null,
    },
  };
};


describe("getActiveTripsHandler - integration style", () => {
  beforeEach(() => {
    dbData = {
      rides: [
        { passengerId: "p1", status: "in_progress", tripPaid: true, finalFare: 100 },
        { passengerId: "p2", status: "in_progress", tripPaid: null, estimatedFare: 50 },
        { passengerId: "p3", status: "completed", tripPaid: false, finalFare: 60 },
        { passengerId: "p4", status: "requested", tripPaid: false, finalFare: 70, requestedAt: "now" },
      ],
      passengers: {
        p1: { name: "Alice", phoneNumber: "123" },
        p2: { name: "Bob", phoneNumber: "456" },
        p3: { name: "Charlie", phoneNumber: "789" },
        p4: { name: "Diana", phoneNumber: "012" },
      },
    };
  });

  it("returns correct active and unpaid trips counts", async () => {
    const ctx = createTestCtx();
    const result = await getActiveTripsHandler(ctx, "driver123");

    expect(result.activeCount).toBe(2);
    expect(result.paidCount).toBe(1);
    expect(result.noResponseCount).toBe(1);
    expect(result.unpaidCount).toBe(2);

    expect(result.passengers).toEqual([
      { name: "Alice", phoneNumber: "123", fare: 100, tripPaid: true },
      { name: "Bob", phoneNumber: "456", fare: 50, tripPaid: null },
    ]);

    expect(result.passengersUnpaid).toEqual([
      { name: "Charlie", phoneNumber: "789", fare: 60, tripPaid: false, requestedAt: undefined },
      { name: "Diana", phoneNumber: "012", fare: 70, tripPaid: false, requestedAt: "now" },
    ]);
  });

  it("handles empty database gracefully", async () => {
    dbData.rides = [];
    dbData.passengers = {};

    const ctx = createTestCtx();
    const result = await getActiveTripsHandler(ctx, "driver123");

    expect(result.activeCount).toBe(0);
    expect(result.paidCount).toBe(0);
    expect(result.noResponseCount).toBe(0);
    expect(result.unpaidCount).toBe(0);
    expect(result.passengers).toEqual([]);
    expect(result.passengersUnpaid).toEqual([]);
  });
});