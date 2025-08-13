import { getAverageRating } from "../../../convex/functions/feedback/averageRating";

describe("getAverageRating", () => {
  const mockCollect = jest.fn();

  const mockCtx = {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          collect: mockCollect,
        })),
      })),
    },
    auth: {},
    storage: {},
    runQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 0 if there are no feedbacks", async () => {
    mockCollect.mockResolvedValueOnce([]);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(0);
  });

  it("filters out non-numeric and invalid ratings", async () => {
    mockCollect.mockResolvedValueOnce([
      { rating: 5 },
      { rating: "bad" },
      { rating: null },
      { rating: -1 },
      { rating: 4 },
    ]);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(4.5); // (5 + 4) / 2
  });

  it("returns correct average rounded to 1 decimal", async () => {
    mockCollect.mockResolvedValueOnce([
      { rating: 3 },
      { rating: 4 },
      { rating: 5 },
    ]);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(4.0); // (3 + 4 + 5) / 3
  });

  it("returns correct average with one rating", async () => {
    mockCollect.mockResolvedValueOnce([{ rating: 4 }]);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(4.0);
  });

  it("ignores ratings that are 0 or negative", async () => {
    mockCollect.mockResolvedValueOnce([
      { rating: 0 },
      { rating: -2 },
      { rating: -10 },
      { rating: 4 },
    ]);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(4.0);
  });

  it("handles a large number of ratings correctly", async () => {
    const ratings = Array(1000).fill({ rating: 4 });
    mockCollect.mockResolvedValueOnce(ratings);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(4.0);
  });

  it("returns a float with one decimal even for repeating decimals", async () => {
    mockCollect.mockResolvedValueOnce([
      { rating: 2 },
      { rating: 2 },
      { rating: 2 },
      { rating: 3 },
    ]); // avg = 2.25 → rounded to 2.3

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(2.3);
  });

  it("returns 0 if all ratings are invalid", async () => {
    mockCollect.mockResolvedValueOnce([
      { rating: "N/A" },
      { rating: null },
      { rating: undefined },
      { rating: {} },
    ]);

    const result = await getAverageRating.handler(mockCtx as any, { driverId: "driver1" });
    expect(result).toBe(0);
  });
});