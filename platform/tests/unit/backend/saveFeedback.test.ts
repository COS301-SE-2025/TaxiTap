import { saveFeedbackHandler } from "../../../convex/functions/feedback/saveFeedbackHandler";

describe("saveFeedbackHandler unit tests", () => {
  const mockFirst = jest.fn();
  const mockInsert = jest.fn();

  const mockCtx = {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          first: mockFirst,
        })),
      })),
      insert: mockInsert,
    },
  };

  const args = {
    rideId: "ride123",
    passengerId: "passenger123",
    driverId: "driver123",
    rating: 5,
    comment: "Great ride!",
    startLocation: "Cape Town",
    endLocation: "Stellenbosch",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws error if feedback already exists for the ride", async () => {
    mockFirst.mockResolvedValueOnce({ _id: "existingFeedbackId" });

    await expect(saveFeedbackHandler(mockCtx as any, args)).rejects.toThrow(
      "Feedback already submitted for this ride."
    );

    expect(mockFirst).toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("saves feedback if none exists for the ride", async () => {
    mockFirst.mockResolvedValueOnce(null);
    mockInsert.mockResolvedValueOnce("newFeedbackId");

    const result = await saveFeedbackHandler(mockCtx as any, args);

    expect(mockInsert).toHaveBeenCalledWith(
      "feedback",
      expect.objectContaining({
        rideId: "ride123",
        passengerId: "passenger123",
        driverId: "driver123",
        rating: 5,
        comment: "Great ride!",
        startLocation: "Cape Town",
        endLocation: "Stellenbosch",
        createdAt: expect.any(Number),
      })
    );

    expect(result).toEqual({ id: "newFeedbackId" });
  });

  it("allows empty comment if not provided", async () => {
    const noCommentArgs = { ...args, comment: undefined };
    mockFirst.mockResolvedValueOnce(null);
    mockInsert.mockResolvedValueOnce("feedbackNoComment");

    const result = await saveFeedbackHandler(mockCtx as any, noCommentArgs);

    expect(mockInsert).toHaveBeenCalledWith(
      "feedback",
      expect.objectContaining({
        comment: undefined,
      })
    );

    expect(result).toEqual({ id: "feedbackNoComment" });
  });

  it("inserts feedback with current timestamp", async () => {
    mockFirst.mockResolvedValueOnce(null);
    mockInsert.mockResolvedValueOnce("feedbackWithTimestamp");

    const result = await saveFeedbackHandler(mockCtx as any, args);

    const insertCall = mockInsert.mock.calls[0][1]; // second argument is the inserted document
    expect(typeof insertCall.createdAt).toBe("number");
    expect(insertCall.createdAt).toBeLessThanOrEqual(Date.now());

    expect(result).toEqual({ id: "feedbackWithTimestamp" });
  });
});