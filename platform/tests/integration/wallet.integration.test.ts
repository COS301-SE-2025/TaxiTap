import {
  getWalletSummaryHandler,
  getTransactionHistoryHandler,
  getSpendingAnalyticsHandler,
  getOutstandingPaymentsHandler,
  markPaymentCompletedHandler,
  getWalletBalanceHandler,
  Ride,
} from "../../convex/functions/users/wallet";

describe("Integration tests for wallet and ride handlers", () => {
  let ctx: any;
  const passengerId = "user-1";

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        collect: jest.fn(),
        get: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  const mockRides: Ride[] = [
    {
      _id: "ride-1",
      rideId: "ride-1",
      passengerId,
      status: "completed",
      startLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "Start A" },
      endLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "End A" },
      requestedAt: Date.now() - 100000,
      completedAt: Date.now() - 50000,
      finalFare: 100,
      amountPaid: 120,
      amountOwed: 0,
      changeDue: 20,
      paymentType: "overpaid",
      tripPaid: true,
      driverId: "driver-1",
    },
    {
      _id: "ride-2",
      rideId: "ride-2",
      passengerId,
      status: "completed",
      startLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "Start B" },
      endLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "End B" },
      requestedAt: Date.now() - 200000,
      completedAt: Date.now() - 150000,
      finalFare: 50,
      amountPaid: 0,
      amountOwed: 50,
      changeDue: 0,
      paymentType: "not_paid",
      tripPaid: false,
      driverId: "driver-1",
    },
  ];

  test("getWalletSummaryHandler calculates totals correctly", async () => {
    ctx.collect = ctx.db.collect.mockResolvedValue(mockRides);

    const result = await getWalletSummaryHandler(ctx, passengerId);

    expect(result.totalSpent).toBe(150);
    expect(result.totalTrips).toBe(2);
    expect(result.averageTrip).toBe(75);
    expect(result.paymentTypes).toEqual({ overpaid: 1, not_paid: 1 });
    expect(result.timeframe).toBe("Last 30 days");
  });

  test("getTransactionHistoryHandler returns transaction details", async () => {
    ctx.db.collect.mockResolvedValue(mockRides);
    ctx.db.get.mockResolvedValue({ name: "Driver 1", profilePicture: "driver.png" });

    const result = await getTransactionHistoryHandler(ctx, passengerId);

    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("id", "ride-1");
    expect(result[0].driver).toEqual({ name: "Driver 1", profilePicture: "driver.png" });
    expect(result[1].fare).toBe(50);
    expect(result[1].paymentType).toBe("not_paid");
  });

  test("getSpendingAnalyticsHandler returns analytics for 7 and 30 days", async () => {
    ctx.db.collect.mockResolvedValue(mockRides);

    const result = await getSpendingAnalyticsHandler(ctx, passengerId);

    expect(result).toHaveProperty("last7Days");
    expect(result).toHaveProperty("last30Days");
    expect(result.last30Days.totalSpent).toBe(150);
    expect(result.last30Days.totalTrips).toBe(2);
    expect(result.last30Days.dailySpending.length).toBeGreaterThan(0);
  });

  test("getTransactionHistoryHandler returns transaction details", async () => {
    ctx.db.collect.mockResolvedValue(mockRides);
    ctx.db.get.mockResolvedValue({ name: "Driver 1", profilePicture: "driver.png" });

    const result = await getTransactionHistoryHandler(ctx, passengerId);

    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("id", "ride-1");
    expect(result[0].driver).toEqual({ name: "Driver 1", profilePicture: "driver.png" });
    expect(result[1].fare).toBe(50);
    expect(result[1].paymentType).toBe("not_paid");
  });

  test("getOutstandingPaymentsHandler calculates total owed correctly", async () => {
    ctx.db.collect.mockResolvedValue(mockRides);

    const result = await getOutstandingPaymentsHandler(ctx, passengerId);

    expect(result.totalOwed).toBe(150);
    expect(result.rides.length).toBe(2);
  });

  test("markPaymentCompletedHandler updates ride correctly", async () => {
    const ride = mockRides[1];
    ctx.db.get.mockResolvedValue(ride);
    ctx.db.patch.mockResolvedValue({});

    const result = await markPaymentCompletedHandler(ctx, "ride-2", 50);

    expect(result.amountOwed).toBe(0);
    expect(result.changeDue).toBe(0);
    expect(result.paymentType).toBe("exact");
    expect(ctx.db.patch).toHaveBeenCalledWith("ride-2", expect.objectContaining({
      amountPaid: 50,
      amountOwed: 0,
      changeDue: 0,
      paymentType: "exact",
      tripPaid: true,
    }));
  });

  test("getWalletBalanceHandler calculates correct totals", async () => {
    ctx.db.collect.mockResolvedValue(mockRides);

    const result = await getWalletBalanceHandler(ctx, passengerId);

    expect(result.totalSpent).toBe(150);
    expect(result.totalPaid).toBe(120);
    expect(result.totalOwed).toBe(50);
    expect(result.totalChangeDue).toBe(20);
    expect(result.balance).toBe(-30);
    expect(result.totalTrips).toBe(2);
  });
});