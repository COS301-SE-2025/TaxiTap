import { getAverageRatingHandler } from "../../convex/functions/feedback/averageRating";

describe("getAverageRating integration-like", () => {
  let feedbacks: any[] = [];
  const mockCollect = jest.fn();

  const mockCtx = {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          collect: mockCollect,
        })),
      })),
    },
  };

  const insertFeedback = (driverId: string, rating: any) => {
    feedbacks.push({ driverId, rating });
  };

  beforeEach(() => {
    feedbacks = [];
    jest.clearAllMocks();

    mockCollect.mockImplementation(() => {
      return feedbacks.filter(f => f.driverId === "driver1");
    });
  });

  it("returns 0 if driver has no feedback", async () => {
    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(0);
  });

  it("computes average of multiple ratings", async () => {
    insertFeedback("driver1", 4);
    insertFeedback("driver1", 5);
    insertFeedback("driver1", "bad");
    insertFeedback("driver1", null);

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(4.5);
  });

  it("ignores feedbacks from other drivers", async () => {
    insertFeedback("driver2", 1);
    insertFeedback("driver1", 4);

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(4.0);
  });

    it("ignores zero and negative ratings", async () => {
    insertFeedback("driver1", 0);
    insertFeedback("driver1", -1);
    insertFeedback("driver1", 3);
    insertFeedback("driver1", 4);

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(3.5); // Only 3 and 4 are valid
  });

  it("returns average rounded to 1 decimal (repeating)", async () => {
    insertFeedback("driver1", 2);
    insertFeedback("driver1", 2);
    insertFeedback("driver1", 3); // avg = 2.33...

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(2.3); // Rounded
  });

  it("returns correct average with one valid and many invalid ratings", async () => {
    insertFeedback("driver1", "junk");
    insertFeedback("driver1", undefined);
    insertFeedback("driver1", {});
    insertFeedback("driver1", 5); // only valid

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(5.0);
  });

  it("returns 0 when all ratings are invalid", async () => {
    insertFeedback("driver1", "bad");
    insertFeedback("driver1", null);
    insertFeedback("driver1", {});
    insertFeedback("driver1", NaN);

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(0);
  });

  it("handles a large number of ratings efficiently", async () => {
    for (let i = 0; i < 1000; i++) {
      insertFeedback("driver1", 5);
    }
    insertFeedback("driver1", "bad"); // invalid one at the end

    const result = await getAverageRatingHandler(mockCtx, { driverId: "driver1" });
    expect(result).toBe(5.0);
  });
});