import { showFeedbackPassengerHandler, showFeedbackDriverHandler } from "../../../convex/functions/feedback/showFeedbackHandler";

describe("showFeedbackPassengerHandler", () => {
  const mockCollect = jest.fn();
  const mockGet = jest.fn();

  const mockCtx = {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          order: jest.fn(() => ({
            collect: mockCollect,
          })),
        })),
      })),
      get: mockGet,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array if no feedback", async () => {
    mockCollect.mockResolvedValueOnce([]);

    const result = await showFeedbackPassengerHandler(mockCtx as any, { passengerId: "passenger1" });
    expect(result).toEqual([]);
  });

  it("returns feedbacks enriched with driverName", async () => {
    const feedbacks = [
      { _id: "fb1", driverId: "driver1", rating: 5, comment: "Great" },
      { _id: "fb2", driverId: "driver2", rating: 3, comment: "Okay" },
      { _id: "fb3", driverId: null, rating: 4, comment: "No driver" },
    ];
    mockCollect.mockResolvedValueOnce(feedbacks);

    mockGet.mockImplementation(async (id: string) => {
      if (id === "driver1") return { name: "Alice" };
      if (id === "driver2") return { name: "Bob" };
      return null;
    });

    const result = await showFeedbackPassengerHandler(mockCtx as any, { passengerId: "passenger1" });

    expect(mockCollect).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { ...feedbacks[0], driverName: "Alice" },
      { ...feedbacks[1], driverName: "Bob" },
      { ...feedbacks[2], driverName: "Unknown" },
    ]);
  });
});

describe("showFeedbackDriverHandler", () => {
  const mockCollect = jest.fn();
  const mockGet = jest.fn();

  const mockCtx = {
    db: {
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          order: jest.fn(() => ({
            collect: mockCollect,
          })),
        })),
      })),
      get: mockGet,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array if no feedback", async () => {
    mockCollect.mockResolvedValueOnce([]);

    const result = await showFeedbackDriverHandler(mockCtx as any, { driverId: "driver1" });
    expect(result).toEqual([]);
  });

  it("returns feedbacks enriched with passengerName", async () => {
    const feedbacks = [
      { _id: "fb1", passengerId: "passenger1", rating: 5, comment: "Great" },
      { _id: "fb2", passengerId: "passenger2", rating: 3, comment: "Okay" },
      { _id: "fb3", passengerId: null, rating: 4, comment: "No passenger" },
    ];
    mockCollect.mockResolvedValueOnce(feedbacks);

    mockGet.mockImplementation(async (id: string) => {
      if (id === "passenger1") return { name: "Alice" };
      if (id === "passenger2") return { name: "Bob" };
      return null;
    });

    const result = await showFeedbackDriverHandler(mockCtx as any, { driverId: "driver1" });

    expect(mockCollect).toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { ...feedbacks[0], passengerName: "Alice" },
      { ...feedbacks[1], passengerName: "Bob" },
      { ...feedbacks[2], passengerName: "Unknown" },
    ]);
  });
});