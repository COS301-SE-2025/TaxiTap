import { tripPaidHandler } from "../../../convex/functions/rides/tripPaidHandler";
import { Id } from "../../../convex/_generated/dataModel";

describe("tripPaidHandler", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        first: jest.fn(),
        patch: jest.fn(),
        get: jest.fn(),
      },
    };
  });

  it("updates tripPaid when ride exists and user is passenger", async () => {
    const ride = { _id: "ride123", passengerId: "user1" as Id<"taxiTap_users">, tripPaid: false };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await tripPaidHandler(mockCtx, "ride123", "user1" as Id<"taxiTap_users">, true);

    expect(mockCtx.db.patch).toHaveBeenCalledWith("ride123", { 
      tripPaid: true,
      paymentConfirmedAt: expect.any(Number)
    });
  });

  it("throws an error if ride is not found", async () => {
    mockCtx.db.get.mockResolvedValueOnce(null);
    mockCtx.db.first.mockResolvedValueOnce(null);

    await expect(
      tripPaidHandler(mockCtx, "ride123", "user1" as Id<"taxiTap_users">, true)
    ).rejects.toThrow("Ride not found");
  });

  it("throws an error if user is not the passenger", async () => {
    const ride = { _id: "ride123", passengerId: "user2" as Id<"taxiTap_users">, tripPaid: false };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await expect(
      tripPaidHandler(mockCtx, "ride123", "user1" as Id<"taxiTap_users">, true)
    ).rejects.toThrow("Only the passenger can confirm payment for this ride");
  });

  it("handles paying false correctly", async () => {
    const ride = { _id: "ride123", passengerId: "user1" as Id<"taxiTap_users">, tripPaid: true };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await tripPaidHandler(mockCtx, "ride123", "user1" as Id<"taxiTap_users">, false);

    expect(mockCtx.db.patch).toHaveBeenCalledWith("ride123", { 
      tripPaid: false,
      paymentConfirmedAt: expect.any(Number)
    });
  });
});