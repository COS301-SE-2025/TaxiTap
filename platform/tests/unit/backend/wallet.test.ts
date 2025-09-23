import { 
  getWalletSummaryHandler,
  getTransactionHistoryHandler,
  getSpendingAnalyticsHandler,
  getOutstandingPaymentsHandler,
  markPaymentCompletedHandler,
  getWalletBalanceHandler,
  Ride
} from "../../../convex/functions/users/wallet";

describe("Wallet & Transaction Handlers", () => {
  let ctx: any;

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

  test("getWalletSummaryHandler returns correct totals", async () => {
    const passengerId = "user-1";

    const rides: Ride[] = [
      { _id: "1", rideId: "ride-1", passengerId, status: "completed", startLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "A" }, endLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "B" }, requestedAt: 1, completedAt: Date.now(), finalFare: 100, paymentType: "exact" },
      { _id: "2", rideId: "ride-2", passengerId, status: "completed", startLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "A" }, endLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "B" }, requestedAt: 2, completedAt: Date.now(), finalFare: 50, paymentType: "overpaid" },
    ];

    ctx.db.collect.mockResolvedValue(rides);

    const result = await getWalletSummaryHandler(ctx, passengerId);

    expect(result.totalSpent).toBe(150);
    expect(result.totalTrips).toBe(2);
    expect(result.averageTrip).toBe(75);
    expect(result.paymentTypes).toEqual({ exact: 1, overpaid: 1 });
    expect(result.timeframe).toBe("Last 30 days");
  });

  test("getTransactionHistoryHandler returns transactions", async () => {
    const passengerId = "user-1";
    const rides: Ride[] = [
      { 
        _id: "1", 
        rideId: "ride-1", 
        passengerId, 
        status: "completed", 
        startLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "A" }, 
        endLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "B" }, 
        requestedAt: 1, 
        completedAt: Date.now(), 
        finalFare: 100, 
        paymentType: "exact",
        driverId: "driver-1"
      },
    ];

    ctx.db.collect.mockResolvedValue(rides);
    ctx.db.get.mockResolvedValue({ name: "Driver 1", profilePicture: "pic.png" });

    const result = await getTransactionHistoryHandler(ctx, passengerId, 1);

    expect(result).toHaveLength(1);
    expect(result[0].fare).toBe(100);
    expect(result[0].driver).toEqual({ name: "Driver 1", profilePicture: "pic.png" });
  });

  test("markPaymentCompletedHandler updates ride correctly", async () => {
    const ride = { _id: "ride-1", finalFare: 100, estimatedFare: 0 };
    ctx.db.get.mockResolvedValue(ride);
    ctx.db.patch.mockResolvedValue({});

    const result = await markPaymentCompletedHandler(ctx, "ride-1", 120);

    expect(result.amountOwed).toBe(0);
    expect(result.changeDue).toBe(20);
    expect(result.paymentType).toBe("overpaid");
    expect(ctx.db.patch).toHaveBeenCalledWith("ride-1", expect.objectContaining({
      amountPaid: 120,
      changeDue: 20,
      amountOwed: 0,
      paymentType: "overpaid",
      tripPaid: true,
    }));
  });

  test("getWalletBalanceHandler calculates totals correctly", async () => {
    const passengerId = "user-1";
    const rides: Ride[] = [
      { _id: "1", rideId: "ride-1", passengerId, status: "completed", startLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "A" }, endLocation: { coordinates: { latitude: 0, longitude: 0 }, address: "B" }, requestedAt: 1, completedAt: Date.now(), finalFare: 100, amountPaid: 120, amountOwed: 0, changeDue: 20 },
    ];

    ctx.db.collect.mockResolvedValue(rides);

    const result = await getWalletBalanceHandler(ctx, passengerId);

    expect(result.totalSpent).toBe(100);
    expect(result.totalPaid).toBe(120);
    expect(result.totalOwed).toBe(0);
    expect(result.totalChangeDue).toBe(20);
    expect(result.balance).toBe(20);
  });
});