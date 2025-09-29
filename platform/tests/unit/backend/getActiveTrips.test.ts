import { getActiveTripsHandler, handlePassengerPayment, markChangeGiven, getPassengersNeedingChange } from "../../../convex/functions/rides/getActiveTripsHandler";
import { Id } from "../../../convex/_generated/dataModel";
import { getUserBadges } from "../../../convex/functions/badges/badgeService";

describe("getActiveTripsHandler", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        collect: jest.fn().mockResolvedValue([]), // Return empty array for badges
        get: jest.fn(),
      },
    };
  });

  it("returns correct counts and passengers when there are active and unpaid rides", async () => {
    const activeRides = [
      {
        rideId: "r1",
        passengerId: "p1",
        tripPaid: true,
        finalFare: 100,
      },
      {
        rideId: "r2",
        passengerId: "p2",
        tripPaid: null,
        estimatedFare: 50,
      },
    ];

    const unpaidRides = [
      {
        rideId: "r3",
        passengerId: "p3",
        tripPaid: false,
        finalFare: 60,
        requestedAt: "2025-08-13T10:00:00Z",
      },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(activeRides) // for active
      .mockResolvedValueOnce(unpaidRides); // for unpaid

    mockCtx.db.get.mockImplementation(async (id: string) => {
      const passengers: Record<string, any> = {
        p1: { name: "Alice", phoneNumber: "123" },
        p2: { name: "Bob", phoneNumber: "456" },
        p3: { name: "Charlie", phoneNumber: "789" },
      };
      return passengers[id];
    });

    const result = await getActiveTripsHandler(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result.activeCount).toBe(2);
    expect(result.paidCount).toBe(1);
    expect(result.noResponseCount).toBe(1);
    expect(result.unpaidCount).toBe(1);

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
        requestedAt: "2025-08-13T10:00:00Z",
        amountPaid: 0,
        changeDue: 0,
        changeReceived: false,
        paymentType: "not_paid",
        isFrontPassenger: false,
        badges: [],
      },
    ]);
  });

  it("handles empty rides arrays gracefully", async () => {
    mockCtx.db.collect.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockCtx.db.get.mockResolvedValue(null);

    const result = await getActiveTripsHandler(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result.activeCount).toBe(0);
    expect(result.paidCount).toBe(0);
    expect(result.noResponseCount).toBe(0);
    expect(result.unpaidCount).toBe(0);
    expect(result.passengers).toEqual([]);
    expect(result.passengersUnpaid).toEqual([]);
  });

  it("ignores rides with missing passengers", async () => {
    const activeRides = [
      { rideId: "r1", passengerId: "p1", tripPaid: true, finalFare: 100 },
    ];
    const unpaidRides = [
      { rideId: "r2", passengerId: "p2", tripPaid: false, estimatedFare: 40, requestedAt: "now" },
    ];

    mockCtx.db.collect
      .mockResolvedValueOnce(activeRides)
      .mockResolvedValueOnce(unpaidRides);

    mockCtx.db.get.mockResolvedValue(null); // passenger not found

    const result = await getActiveTripsHandler(mockCtx, "driver123" as Id<"taxiTap_users">);

    expect(result.passengers).toEqual([]);
    expect(result.passengersUnpaid).toEqual([]);
  });

  describe("getActiveTripsHandler & payment/change functions", () => {
    let mockCtx: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCtx = {
        db: {
          query: jest.fn().mockReturnThis(),
          withIndex: jest.fn().mockReturnThis(),
          filter: jest.fn().mockReturnThis(),
          collect: jest.fn(),
          first: jest.fn(),
          get: jest.fn(),
          patch: jest.fn(),
        },
      };

      // Mock badges
      jest.spyOn(require("../../../convex/functions/badges/badgeService"), "getUserBadges")
        .mockResolvedValue([]);
    });

    it("handles rides where passengers overpaid", async () => {
      const rides = [
        { rideId: "r1", passengerId: "p1", tripPaid: true, finalFare: 50, amountPaid: 60, changeDue: 10, changeReceived: false },
      ];

      mockCtx.db.collect.mockResolvedValueOnce(rides); // active rides
      mockCtx.db.collect.mockResolvedValueOnce([]); // unpaid rides
      mockCtx.db.get.mockResolvedValue({ name: "Alice", phoneNumber: "123" });

      const result = await getActiveTripsHandler(mockCtx, "driver1" as Id<"taxiTap_users">);

      expect(result.passengers[0].fare).toBe(50);
      expect(result.passengers[0].tripPaid).toBe(true);
      expect(result.passengers[0].changeDue).toBe(10);
      expect(result.needChangeCount).toBe(1);
    });

    it("handles rides where passengers underpaid", async () => {
      const rides = [
        { rideId: "r2", passengerId: "p2", tripPaid: true, finalFare: 100, amountPaid: 60, paymentType: "underpaid" },
      ];

      mockCtx.db.collect.mockResolvedValueOnce(rides);
      mockCtx.db.collect.mockResolvedValueOnce([]);
      mockCtx.db.get.mockResolvedValue({ name: "Bob", phoneNumber: "456" });

      const result = await getActiveTripsHandler(mockCtx, "driver1" as Id<"taxiTap_users">);

      expect(result.passengers[0].fare).toBe(100);
      expect(result.passengers[0].tripPaid).toBe(true);
    });

    it("handlePassengerPayment calculates correct payment types", async () => {
      const ride = { _id: "ride1", finalFare: 50, estimatedFare: 0, tripId: "trip1" };
      mockCtx.db.query().withIndex().first.mockResolvedValue(ride);
      mockCtx.db.get.mockResolvedValue({ fare: 0 });
      mockCtx.db.patch.mockResolvedValue(null);

      const resultExact = await handlePassengerPayment(mockCtx, "ride1", 50, true);
      expect(resultExact.paymentType).toBe("exact");

      const resultOver = await handlePassengerPayment(mockCtx, "ride1", 60, true);
      expect(resultOver.paymentType).toBe("overpaid");
      expect(resultOver.changeDue).toBe(10);

      const resultUnder = await handlePassengerPayment(mockCtx, "ride1", 40, true);
      expect(resultUnder.paymentType).toBe("underpaid");
      expect(resultUnder.changeDue).toBe(10);

      const resultNotPaid = await handlePassengerPayment(mockCtx, "ride1", 0, false);
      expect(resultNotPaid.paymentType).toBe("not_paid");
    });

    it("markChangeGiven updates rides correctly", async () => {
      const ride = { _id: "ride1", paymentType: "overpaid", changeReceived: false, finalFare: 50, estimatedFare: 0 };
      mockCtx.db.query().withIndex().first.mockResolvedValue(ride);
      mockCtx.db.patch.mockResolvedValue(null);

      const result = await markChangeGiven(mockCtx, "ride1");
      expect(result.success).toBe(true);
      expect(mockCtx.db.patch).toHaveBeenCalledWith("ride1", expect.objectContaining({ changeReceived: true }));
    });

    it("getPassengersNeedingChange returns passengers correctly", async () => {
      const rides = [
        { rideId: "r1", passengerId: "p1", changeDue: 10, changeReceived: false, paymentType: "overpaid", tripPaid: true },
        { rideId: "r2", passengerId: "p2", paymentType: "underpaid", tripPaid: true, amountOwed: 20 },
      ];

      mockCtx.db.collect.mockResolvedValue(rides);
      mockCtx.db.get.mockImplementation(async (id: string) => {
        if (id === "p1") return { name: "Alice", phoneNumber: "123" };
        if (id === "p2") return { name: "Bob", phoneNumber: "456" };
        return null;
      });

      const result = await getPassengersNeedingChange(mockCtx, "driver1");
      expect(result.count).toBe(2);
      expect(result.passengers.map(p => p.name)).toEqual(expect.arrayContaining(["Alice", "Bob"]));
    });
  });
});