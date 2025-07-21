import { showFeedbackPassengerHandler, showFeedbackDriverHandler } from "../../convex/functions/feedback/showFeedbackHandler";

describe("showFeedback integration-like tests", () => {
  let feedbacks: any[] = [];
  let users: any[] = [];

  beforeEach(() => {
    feedbacks = [];
    users = [];
    jest.clearAllMocks();
  });

  // Mock context that filters feedbacks properly by driverId or passengerId in collect()
  const mockCtx = {
    db: {
        query: jest.fn((collection: string, args: any) => ({
        withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
            collect: jest.fn(async () => {
                // Filter feedbacks based on args passed to query
                let filtered = feedbacks;

                if (args) {
                if ("driverId" in args) {
                    filtered = feedbacks.filter(fb => fb.driverId === args.driverId);
                } else if ("passengerId" in args) {
                    filtered = feedbacks.filter(fb => fb.passengerId === args.passengerId);
                }
                }

                filtered.sort((a, b) => b.createdAt - a.createdAt);
                return filtered;
            }),
            })),
        })),
        collect: jest.fn(async () => feedbacks),
        })),
        get: jest.fn(async (id: string) => users.find(u => u._id === id) || null),
    },
    };

  function addUser(id: string, name: string) {
    users.push({ _id: id, name });
  }

  function addFeedback(data: any) {
    feedbacks.push(data);
  }

  describe("showFeedbackPassengerHandler", () => {
    it("returns empty array if no feedback", async () => {
      const result = await showFeedbackPassengerHandler(mockCtx as any, { passengerId: "passenger1" });
      expect(result).toEqual([]);
    });

    it("returns feedbacks with driver names, sorted descending by createdAt", async () => {
      addUser("driver1", "Alice");
      addUser("driver2", "Bob");

      addFeedback({
        _id: "fb1",
        passengerId: "passenger1",
        driverId: "driver1",
        rating: 5,
        comment: "Great ride",
        createdAt: 1000,
      });

      addFeedback({
        _id: "fb2",
        passengerId: "passenger1",
        driverId: "driver2",
        rating: 4,
        comment: "Nice ride",
        createdAt: 2000,
      });

      const result = await showFeedbackPassengerHandler(mockCtx as any, { passengerId: "passenger1" });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ driverId: "driver2", driverName: "Bob" });   // Newest first
      expect(result[1]).toMatchObject({ driverId: "driver1", driverName: "Alice" });
    });

    it("returns driverName as Unknown if driver not found", async () => {
      addFeedback({
        _id: "fb3",
        passengerId: "passenger1",
        driverId: "missing_driver",
        rating: 3,
        comment: "Okay ride",
        createdAt: 1500,
      });

      const result = await showFeedbackPassengerHandler(mockCtx as any, { passengerId: "passenger1" });

      expect(result).toHaveLength(1);
      expect(result[0].driverName).toBe("Unknown");
    });
  });
});