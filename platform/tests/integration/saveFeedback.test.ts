import { saveFeedbackHandler } from "../../convex/functions/feedback/saveFeedbackHandler";

describe("saveFeedbackHandler integration-like tests", () => {
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
    rating: 4,
    comment: "Smooth trip!",
    startLocation: "Cape Town",
    endLocation: "Stellenbosch",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully inserts feedback for a ride with no existing feedback", async () => {
    mockFirst.mockResolvedValueOnce(null);
    mockInsert.mockResolvedValueOnce("newFeedbackId");

    const before = Date.now();

    try {
      const result = await saveFeedbackHandler(mockCtx as any, args);

      const after = Date.now();

      expect(result).toBeDefined();
      expect(mockFirst).toHaveBeenCalled();

      // Expect insert called with collection name + document object
      expect(mockInsert).toHaveBeenCalledWith(
        "feedback",
        expect.objectContaining({
          rideId: "ride123",
          passengerId: "passenger123",
          driverId: "driver123",
          rating: 4,
          comment: "Smooth trip!",
          startLocation: "Cape Town",
          endLocation: "Stellenbosch",
          createdAt: expect.any(Number),
        })
      );

      // Check createdAt timestamp within reasonable range
      const insertCall = mockInsert.mock.calls[0][1]; // second argument is the document
      expect(insertCall.createdAt).toBeGreaterThanOrEqual(before);
      expect(insertCall.createdAt).toBeLessThanOrEqual(after);

      expect(result).toEqual({ id: "newFeedbackId" });
    } catch (error) {
      console.error('Handler error:', error);
      throw error;
    }
  });

  it("allows comment to be undefined", async () => {
    const argsWithoutComment = { ...args, comment: undefined };
    mockFirst.mockResolvedValueOnce(null);
    mockInsert.mockResolvedValueOnce("feedbackNoComment");

    try {
      const result = await saveFeedbackHandler(mockCtx as any, argsWithoutComment);

      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalledWith(
        "feedback",
        expect.objectContaining({
          comment: undefined,
        })
      );

      expect(result).toEqual({ id: "feedbackNoComment" });
    } catch (error) {
      console.error('Handler error:', error);
      throw error;
    }
  });

  it("throws error if feedback already exists", async () => {
    mockFirst.mockResolvedValueOnce({ _id: "existingId" });

    const promise = saveFeedbackHandler(mockCtx as any, args);
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("Feedback already submitted for this ride.");

    expect(mockInsert).not.toHaveBeenCalled();
  });
});