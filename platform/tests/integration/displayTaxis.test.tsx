import { getAvailableTaxisHandler } from "../../convex/functions/taxis/displayTaxis";

describe("getAvailableTaxisHandler", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        get: jest.fn(),
      },
    };
  });

  it("returns an empty array if no available taxis", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        collect: () => Promise.resolve([]),
      }),
    });

    const result = await getAvailableTaxisHandler(ctx);
    expect(result).toEqual([]);
  });

  it("filters out taxis without drivers or users", async () => {
    const taxis = [
      { driverId: "driver1", licensePlate: "ABC123", image: "img1", capacity: 4, model: "Toyota" },
      { driverId: "driver2", licensePlate: "DEF456", image: null, capacity: 5, model: "Honda" },
    ];

    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        collect: () => Promise.resolve(taxis),
      }),
    });

    // First taxi has a driver, second taxi's driver is missing
    ctx.db.get.mockImplementation(async (id: string) => {
      if (id === "driver1") return { _id: "driver1", userId: "user1" };
      if (id === "user1") return { _id: "user1", name: "Alice" };
      // driver2 or user missing
      return null;
    });

    const result = await getAvailableTaxisHandler(ctx);

    expect(result).toEqual([
      {
        licensePlate: "ABC123",
        image: "img1",
        seats: 4,
        model: "Toyota",
        driverName: "Alice",
        userId: "user1",
        driverId: "driver1",
      },
    ]);
  });

  it("handles taxis with missing optional image field", async () => {
    const taxis = [
      { driverId: "driver1", licensePlate: "XYZ789", capacity: 3, model: "Ford" },
    ];

    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        collect: () => Promise.resolve(taxis),
      }),
    });

    ctx.db.get.mockImplementation(async (id: string) => {
      if (id === "driver1") return { _id: "driver1", userId: "user2" };
      if (id === "user2") return { _id: "user2", name: "Bob" };
      return null;
    });

    const result = await getAvailableTaxisHandler(ctx);

    expect(result[0].image).toBeNull();
  });
});