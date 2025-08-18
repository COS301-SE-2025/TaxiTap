import { startWorkSessionHandlerFunc } from "../../convex/functions/work_sessions/startWorkSessionHandler";

describe("startWorkSessionHandlerFunc (integration)", () => {
  it("should create a new work session", async () => {
    const driverId = "driver123";
    const mockId = "session_123";
    
    const ctx = {
      db: {
        insert: jest.fn(() => Promise.resolve(mockId))
      }
    };

    const result = await startWorkSessionHandlerFunc(ctx as any, driverId);

    expect(result).toBe(mockId);
    expect(ctx.db.insert).toHaveBeenCalledWith("work_sessions", {
      driverId,
      startTime: expect.any(Number)
    });
  });

  it("should create multiple sessions independently", async () => {
    const driverId = "driver123";
    const mockId1 = "session_1";
    const mockId2 = "session_2";
    
    const ctx = {
      db: {
        insert: jest.fn()
          .mockResolvedValueOnce(mockId1)
          .mockResolvedValueOnce(mockId2)
      }
    };

    const session1 = await startWorkSessionHandlerFunc(ctx as any, driverId);
    const session2 = await startWorkSessionHandlerFunc(ctx as any, driverId);

    expect(session1).toBe(mockId1);
    expect(session2).toBe(mockId2);
    expect(session1).not.toBe(session2);
    expect(ctx.db.insert).toHaveBeenCalledTimes(2);
  });
});