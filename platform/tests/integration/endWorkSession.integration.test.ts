import { endWorkSessionHandler } from "../../convex/functions/work_sessions/endWorkSessionHandler";

describe("endWorkSessionHandler", () => {
  let ctx: any;
  let driverId = "driver123";
  let activeSession: any;

  beforeEach(() => {
    activeSession = { _id: "session1", driverId, startTime: Date.now(), endTime: null };

    // Mock context
    ctx = {
      db: {
        query: jest.fn(() => ctx.db),
        withIndex: jest.fn(() => ctx.db),
        order: jest.fn(() => ctx.db),
        first: jest.fn(() => Promise.resolve(activeSession)),
        patch: jest.fn(() => Promise.resolve(true)),
      },
    };
  });

  it("should successfully end an active work session", async () => {
    try {
      const result = await endWorkSessionHandler(ctx, { driverId });
      expect(result).toBeDefined();
      expect(result).toEqual({ sessionId: "session1" });
      expect(ctx.db.patch).toHaveBeenCalledWith("session1", expect.objectContaining({ endTime: expect.any(Number) }));
    } catch (error) {
      console.error('Handler error:', error);
      throw error;
    }
  });

  it("should throw an error if no active work session exists", async () => {
    ctx.db.first = jest.fn(() => Promise.resolve(null));
    
    const promise = endWorkSessionHandler(ctx, { driverId });
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("No active work session found.");
  });

  it("should throw an error if latest session already ended", async () => {
    activeSession.endTime = Date.now();
    ctx.db.first = jest.fn(() => Promise.resolve(activeSession));
    
    const promise = endWorkSessionHandler(ctx, { driverId });
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).rejects.toThrow("No active work session found.");
  });
});