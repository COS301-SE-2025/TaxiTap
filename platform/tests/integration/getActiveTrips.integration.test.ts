import { getActiveTripsHandler } from "../../convex/functions/rides/getActiveTripsHandler";
import { Id } from "../../convex/_generated/dataModel";

let dbData: any;

const createTestCtx = (): any => {
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
                  const or = (...conds: boolean[]) => conds.some(Boolean);
                  const and = (...conds: boolean[]) => conds.every(Boolean);
                  const gt = (a: number, b: number) => a > b;
                  const neq = (a: any, b: any) => a !== b;

                  return filterFn({ eq, neq, or, and, gt, field });
                });
              }
              return dbData[table] || [];
            },
          }),
        }),
      }),
      get: async (id: string) => dbData.passengers[id] || null,
    },
    auth: {},
    storage: {},
    runQuery: jest.fn(),
  };
};

describe("getActiveTripsHandler - integration style", () => {
  beforeEach(() => {
    dbData = {
      rides: [
        { rideId: "r1", passengerId: "p1", status: "in_progress", tripPaid: true, finalFare: 100 },
        { rideId: "r2", passengerId: "p2", status: "in_progress", tripPaid: null, estimatedFare: 50 },
        { rideId: "r3", passengerId: "p3", status: "completed", tripPaid: false, finalFare: 60 },
        { rideId: "r4", passengerId: "p4", status: "requested", tripPaid: false, finalFare: 70, requestedAt: "now" },
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
    const result = await getActiveTripsHandler(ctx, "driver123" as Id<"taxiTap_users">);

    expect(result.activeCount).toBe(2);
    expect(result.paidCount).toBe(1);
    expect(result.noResponseCount).toBe(1);
    expect(result.unpaidCount).toBe(2);

    expect(result.passengers).toEqual([
      {
        rideId: "r1",
        name: "Alice",
        phoneNumber: "123",
        fare: 100,
        tripPaid: true,
        amountPaid: 0,
        changeDue: 0,
        changeReceived: false,
        paymentType: "not_paid",
        isFrontPassenger: false,
        badges: [],
      },
      {
        rideId: "r2",
        name: "Bob",
        phoneNumber: "456",
        fare: 50,
        tripPaid: null,
        amountPaid: 0,
        changeDue: 0,
        changeReceived: false,
        paymentType: "not_paid",
        isFrontPassenger: false,
        badges: [],
      },
    ]);

    expect(result.passengersUnpaid).toEqual([
      {
        rideId: "r3",
        name: "Charlie",
        phoneNumber: "789",
        fare: 60,
        tripPaid: false,
        requestedAt: undefined,
        amountPaid: 0,
        changeDue: 0,
        changeReceived: false,
        paymentType: "not_paid",
        isFrontPassenger: false,
        badges: [],
      },
      {
        rideId: "r4",
        name: "Diana",
        phoneNumber: "012",
        fare: 70,
        tripPaid: false,
        requestedAt: "now",
        amountPaid: 0,
        changeDue: 0,
        changeReceived: false,
        paymentType: "not_paid",
        isFrontPassenger: false,
        badges: [],
      },
    ]);
  });

  it("handles empty database gracefully", async () => {
    dbData.rides = [];
    dbData.passengers = {};

    const ctx = createTestCtx();
    const result = await getActiveTripsHandler(ctx, "driver123" as Id<"taxiTap_users">);

    expect(result.activeCount).toBe(0);
    expect(result.paidCount).toBe(0);
    expect(result.noResponseCount).toBe(0);
    expect(result.unpaidCount).toBe(0);
    expect(result.passengers).toEqual([]);
    expect(result.passengersUnpaid).toEqual([]);
  });
});