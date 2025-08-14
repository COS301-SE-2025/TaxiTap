import { tripPaidHandler } from "../../../convex/functions/payments/tripPaidHandler";

describe("tripPaidHandler", () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        first: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  it("updates tripPaid when ride exists and user is passenger", async () => {
    const ride = { _id: "ride123", passengerId: "user1", tripPaid: false };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await tripPaidHandler(mockCtx, "ride123", "user1", true);

    expect(mockCtx.db.patch).toHaveBeenCalledWith("ride123", { tripPaid: true });
  });

  it("throws an error if ride is not found", async () => {
    mockCtx.db.first.mockResolvedValueOnce(null);

    await expect(
      tripPaidHandler(mockCtx, "ride123", "user1", true)
    ).rejects.toThrow("Ride not found");
  });

  it("throws an error if user is not the passenger", async () => {
    const ride = { _id: "ride123", passengerId: "user2", tripPaid: false };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await expect(
      tripPaidHandler(mockCtx, "ride123", "user1", true)
    ).rejects.toThrow("Only the passenger can start the ride");
  });

  it("handles paying false correctly", async () => {
    const ride = { _id: "ride123", passengerId: "user1", tripPaid: true };
    mockCtx.db.first.mockResolvedValueOnce(ride);

    await tripPaidHandler(mockCtx, "ride123", "user1", false);

    expect(mockCtx.db.patch).toHaveBeenCalledWith("ride123", { tripPaid: false });
  });
});