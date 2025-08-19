import { endWorkSessionHandler } from "../../convex/functions/work_sessions/endWorkSessionHandler";

describe("endWorkSessionHandler", () => {
  it("should successfully end an active work session", async () => {
    const driverId = "driver123";
    const activeSession = { 
      _id: "session1", 
      driverId, 
      startTime: Date.now() - 1000, 
      endTime: null 
    };

    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              first: jest.fn(() => Promise.resolve(activeSession))
            }))
          }))
        })),
        patch: jest.fn(() => Promise.resolve("session1"))
      }
    };

    const result = await endWorkSessionHandler(ctx as any, { driverId });
    
    expect(result).toBeDefined();
    expect(result).toEqual({ sessionId: "session1" });
    expect(ctx.db.patch).toHaveBeenCalledWith("session1", {
      endTime: expect.any(Number)
    });
  });

  it("should throw an error if no active work session exists", async () => {
    const driverId = "driver123";
    
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              first: jest.fn(() => Promise.resolve(null))
            }))
          }))
        }))
      }
    };

    await expect(endWorkSessionHandler(ctx as any, { driverId }))
      .rejects.toThrow("No active work session found.");
  });

  it("should throw an error if latest session already ended", async () => {
    const driverId = "driver123";
    const endedSession = { 
      _id: "session1", 
      driverId, 
      startTime: Date.now() - 1000, 
      endTime: Date.now() - 500 
    };
    
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              first: jest.fn(() => Promise.resolve(endedSession))
            }))
          }))
        }))
      }
    };

    await expect(endWorkSessionHandler(ctx as any, { driverId }))
      .rejects.toThrow("No active work session found.");
  });
});