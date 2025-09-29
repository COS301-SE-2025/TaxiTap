import {
  getPassengerChangeHandler,
  getChangeDueRidesHandler,
  markChangeReceivedHandler,
} from "../../convex/functions/rides/getChange";

describe("rides change handlers - integration style", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        get: jest.fn(),
        query: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  describe("getPassengerChangeHandler", () => {
    it("returns passenger change info when overpaid", async () => {
      const ride = {
        _id: "r1",
        rideId: "ride123",
        passengerId: "u1",
        amountPaid: 120,
        finalFare: 100,
        paymentType: "overpaid",
      };
      const passenger = {
        _id: "u1",
        name: "Alice",
        email: "alice@test.com",
        phoneNumber: "555-1234",
      };

      ctx.db.get.mockImplementation((id: string) => {
        if (id === "r1") return ride;
        if (id === "u1") return passenger;
        return null;
      });

      ctx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue([ride]),
        }),
      });

      const result = await getPassengerChangeHandler(ctx, "r1");

      expect(result.changeDue).toBe(20);
      expect(result.passenger.name).toBe("Alice");
      expect(result.ride.fare).toBe(100);
      expect(result.stats.needChangeCount).toBe(1);
    });

    it("throws if ride not found", async () => {
      ctx.db.get.mockResolvedValueOnce(null);
      await expect(getPassengerChangeHandler(ctx, "missing")).rejects.toThrow(
        "Ride not found"
      );
    });

    it("throws if passenger not found", async () => {
      const ride = { _id: "r1", rideId: "ride123", passengerId: "uX" };
      ctx.db.get.mockImplementation((id: string) => (id === "r1" ? ride : null));

      await expect(getPassengerChangeHandler(ctx, "r1")).rejects.toThrow(
        "Passenger not found"
      );
    });
  });

  describe("getChangeDueRidesHandler", () => {
    it("returns rides that need change", async () => {
      const ride = {
        _id: "r1",
        passengerId: "u1",
        finalFare: 100,
        amountPaid: 120,
        paymentType: "overpaid",
        changeReceived: false,
      };
      const passenger = { _id: "u1", name: "Bob", phoneNumber: "999" };

      ctx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue([ride]),
        }),
      });
      ctx.db.get.mockResolvedValue(passenger);

      const result = await getChangeDueRidesHandler(ctx);

      expect(result).toHaveLength(1);
      expect(result[0].changeDue).toBe(20);
      expect(result[0].passengerName).toBe("Bob");
    });

    it("filters out rides with exact or underpaid payment", async () => {
      const rides = [
        {
          _id: "r1",
          passengerId: "u1",
          finalFare: 100,
          amountPaid: 100,
          paymentType: "exact",
          changeReceived: false,
        },
        {
          _id: "r2",
          passengerId: "u2",
          finalFare: 100,
          amountPaid: 90,
          paymentType: "underpaid",
          changeReceived: false,
        },
      ];

      ctx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue(rides),
        }),
      });

      const result = await getChangeDueRidesHandler(ctx);
      expect(result).toEqual([]);
    });

    it("skips rides where change has already been received", async () => {
      const ride = {
        _id: "r1",
        passengerId: "u1",
        finalFare: 100,
        amountPaid: 120,
        paymentType: "overpaid",
        changeReceived: true,
      };

      ctx.db.query.mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue([ride]),
        }),
      });

      const result = await getChangeDueRidesHandler(ctx);
      expect(result).toEqual([]);
    });
  });

  describe("markChangeReceivedHandler", () => {
    it("marks change as received", async () => {
      const ride = { _id: "r1" };
      ctx.db.get.mockResolvedValue(ride);
      ctx.db.patch.mockResolvedValue(undefined);

      const result = await markChangeReceivedHandler(ctx, "r1");

      expect(ctx.db.patch).toHaveBeenCalledWith("r1", { changeReceived: true });
      expect(result).toEqual({ success: true });
    });

    it("throws if ride not found", async () => {
      ctx.db.get.mockResolvedValue(null);
      await expect(markChangeReceivedHandler(ctx, "rX")).rejects.toThrow(
        "Ride not found"
      );
    });
  });
});