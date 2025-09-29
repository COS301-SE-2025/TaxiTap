import { tripPaidHandler } from "../../../convex/functions/rides/tripPaidHandler";
import { Id } from "../../../convex/_generated/dataModel";
import * as badgeService from "../../../convex/functions/badges/badgeService";

describe("tripPaidHandler", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        first: jest.fn(),
        patch: jest.fn(),
        get: jest.fn(),
        collect: jest.fn().mockResolvedValue([]),
      },
    };
  });

  it("updates tripPaid when ride exists and user is passenger", async () => {
    const ride = { _id: "ride123", passengerId: "user1" as Id<"taxiTap_users">, tripPaid: false };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await tripPaidHandler(mockCtx, "ride123" as Id<"rides">, "user1" as Id<"taxiTap_users">, true, null, "exact");

    expect(mockCtx.db.patch).toHaveBeenCalledWith("ride123", { 
      tripPaid: true,
      paymentConfirmedAt: expect.any(Number),
      amountPaid: undefined,
      paymentType: "exact"
    });
  });

  it("throws an error if ride is not found", async () => {
    mockCtx.db.first.mockResolvedValueOnce(null);

    await expect(
      tripPaidHandler(mockCtx, "ride123" as Id<"rides">, "user1" as Id<"taxiTap_users">, true, null, "exact")
    ).rejects.toThrow("Ride not found");
  });

  it("throws an error if user is not the passenger", async () => {
    const ride = { _id: "ride123", passengerId: "user2" as Id<"taxiTap_users">, tripPaid: false };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await expect(
      tripPaidHandler(mockCtx, "ride123" as Id<"rides">, "user1" as Id<"taxiTap_users">, true, null, "exact")
    ).rejects.toThrow("Only the passenger can confirm payment for this ride");
  });

  it("handles paying false correctly", async () => {
    const ride = { _id: "ride123", passengerId: "user1" as Id<"taxiTap_users">, tripPaid: true };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await tripPaidHandler(mockCtx, "ride123" as Id<"rides">, "user1" as Id<"taxiTap_users">, false, null, "exact");

    expect(mockCtx.db.patch).toHaveBeenCalledWith("ride123", { 
      tripPaid: false,
      paymentConfirmedAt: expect.any(Number),
      amountPaid: undefined,
      paymentType: "exact"
    });
  });

  describe("tripPaidHandler - extended tests", () => {
    let mockCtx: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockCtx = {
        db: {
          query: jest.fn().mockReturnThis(),
          filter: jest.fn().mockReturnThis(),
          first: jest.fn(),
          patch: jest.fn(),
          get: jest.fn(),
        },
      };

      // Mock badge awarding
      jest.spyOn(badgeService, "checkAndAwardTrustedPayerBadge").mockResolvedValue(true);
    });

    it("updates driver trip fare if ride has tripId and amountPaid specified", async () => {
      const ride = { _id: "ride1", passengerId: "user1" as Id<"taxiTap_users">, tripId: "trip1", finalFare: 50 };
      const trip = { _id: "trip1", fare: 0 };
      mockCtx.db.first.mockResolvedValueOnce(ride);
      mockCtx.db.get.mockResolvedValueOnce(trip);

      await tripPaidHandler(mockCtx, "ride1", "user1" as Id<"taxiTap_users">, true, 60, "overpaid");

      expect(mockCtx.db.patch).toHaveBeenCalledWith("ride1", expect.objectContaining({
        tripPaid: true,
        paymentType: "overpaid",
        amountPaid: 60,
      }));
      expect(mockCtx.db.patch).toHaveBeenCalledWith("trip1", expect.objectContaining({ fare: 60 }));
    });

    it("uses finalFare if amountPaid is undefined", async () => {
      const ride = { _id: "ride2", passengerId: "user1" as Id<"taxiTap_users">, tripId: "trip2", finalFare: 70 };
      const trip = { _id: "trip2", fare: 0 };
      mockCtx.db.first.mockResolvedValueOnce(ride);
      mockCtx.db.get.mockResolvedValueOnce(trip);

      await tripPaidHandler(mockCtx, "ride2", "user1" as Id<"taxiTap_users">, true, null, "exact");

      expect(mockCtx.db.patch).toHaveBeenCalledWith("trip2", expect.objectContaining({ fare: 70 }));
    });

    it("uses estimatedFare if finalFare is missing", async () => {
      const ride = { _id: "ride3", passengerId: "user1" as Id<"taxiTap_users">, tripId: "trip3", estimatedFare: 80 };
      const trip = { _id: "trip3", fare: 0 };
      mockCtx.db.first.mockResolvedValueOnce(ride);
      mockCtx.db.get.mockResolvedValueOnce(trip);

      await tripPaidHandler(mockCtx, "ride3", "user1" as Id<"taxiTap_users">, true, null, "exact");

      expect(mockCtx.db.patch).toHaveBeenCalledWith("trip3", expect.objectContaining({ fare: 80 }));
    });

    it("sets trip fare to 0 if paid is false", async () => {
      const ride = { _id: "ride4", passengerId: "user1" as Id<"taxiTap_users">, tripId: "trip4", finalFare: 100 };
      const trip = { _id: "trip4", fare: 100 };
      mockCtx.db.first.mockResolvedValueOnce(ride);
      mockCtx.db.get.mockResolvedValueOnce(trip);

      await tripPaidHandler(mockCtx, "ride4", "user1" as Id<"taxiTap_users">, false, null, "exact");

      expect(mockCtx.db.patch).toHaveBeenCalledWith("trip4", expect.objectContaining({ fare: 0 }));
    });

    it("handles badge awarding errors gracefully", async () => {
      const ride = { _id: "ride5", passengerId: "user1" as Id<"taxiTap_users"> };
      mockCtx.db.first.mockResolvedValueOnce(ride);
      mockCtx.db.get.mockResolvedValueOnce(null);

      jest.spyOn(badgeService, "checkAndAwardTrustedPayerBadge").mockRejectedValueOnce(new Error("Badge error"));

      const result = await tripPaidHandler(mockCtx, "ride5", "user1" as Id<"taxiTap_users">, true, null, "exact");

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Payment exact \(confirmed\)/);
    });

    it("handles ride with no tripId", async () => {
      const ride = { _id: "ride6", passengerId: "user1" as Id<"taxiTap_users">, finalFare: 50 };
      mockCtx.db.first.mockResolvedValueOnce(ride);

      await tripPaidHandler(mockCtx, "ride6", "user1" as Id<"taxiTap_users">, true, 50, "exact");

      // Should not call db.get because no tripId
      expect(mockCtx.db.get).not.toHaveBeenCalled();
    });
  });
});