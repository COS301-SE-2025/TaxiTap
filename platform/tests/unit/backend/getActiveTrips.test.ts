import { getActiveTripsHandler } from "../../../convex/functions/rides/getActiveTripsHandler";

describe("getActiveTripsHandler", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        collect: jest.fn(),
        get: jest.fn(),
      },
    };
  });

  it("returns correct counts and passengers when there are active and unpaid rides", async () => {
    const activeRides = [
      {
        passengerId: "p1",
        tripPaid: true,
        finalFare: 100,
        estimatedFare: 90,
      },
      {
        passengerId: "p2",
        tripPaid: null,
        estimatedFare: 50,
      },
    ];

    // Mock unpaid rides data
    const unpaidRides = [
      {
        passengerId: "p3",
        tripPaid: false,
        finalFare: 60,
        requestedAt: "2025-08-13T10:00:00Z",
      },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(activeRides)
      .mockResolvedValueOnce(unpaidRides);

    mockCtx.db.get
      .mockImplementation(async (id: string) => {
        const passengers: Record<string, any> = {
          p1: { name: "Alice", phoneNumber: "123" },
          p2: { name: "Bob", phoneNumber: "456" },
          p3: { name: "Charlie", phoneNumber: "789" },
        };
        return passengers[id];
      });

    const result = await getActiveTripsHandler(mockCtx, "driver123");

    expect(result.activeCount).toBe(2);
    expect(result.paidCount).toBe(1);
    expect(result.noResponseCount).toBe(1);
    expect(result.unpaidCount).toBe(1);

    expect(result.passengers).toEqual([
      {
        name: "Alice",
        phoneNumber: "123",
        fare: 100,
        tripPaid: true,
      },
      {
        name: "Bob",
        phoneNumber: "456",
        fare: 50,
        tripPaid: null,
      },
    ]);

    expect(result.passengersUnpaid).toEqual([
      {
        name: "Charlie",
        phoneNumber: "789",
        fare: 60,
        tripPaid: false,
        requestedAt: "2025-08-13T10:00:00Z",
      },
    ]);
  });

  it("handles empty rides arrays gracefully", async () => {
    mockCtx.db.collect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockCtx.db.get.mockResolvedValue(null);

    const result = await getActiveTripsHandler(mockCtx, "driver123");

    expect(result.activeCount).toBe(0);
    expect(result.paidCount).toBe(0);
    expect(result.noResponseCount).toBe(0);
    expect(result.unpaidCount).toBe(0);
    expect(result.passengers).toEqual([]);
    expect(result.passengersUnpaid).toEqual([]);
  });

  it("ignores rides with missing passengers", async () => {
    const activeRides = [
      { passengerId: "p1", tripPaid: true, finalFare: 100 },
    ];
    const unpaidRides = [
      { passengerId: "p2", tripPaid: false, estimatedFare: 40, requestedAt: "now" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(activeRides)
      .mockResolvedValueOnce(unpaidRides);

    mockCtx.db.get.mockResolvedValue(null);

    const result = await getActiveTripsHandler(mockCtx, "driver123");

    expect(result.passengers).toEqual([]);
    expect(result.passengersUnpaid).toEqual([]);
  });
});