import { startWorkSessionHandlerFunc } from "../../convex/functions/work_sessions/startWorkSessionHandler";
import { Id } from "../../convex/_generated/dataModel";

describe("startWorkSessionHandlerFunc (integration)", () => {
  it("should create a new work session and end existing ones", async () => {
    const driverId = "driver123" as Id<"taxiTap_users">;
    const mockId = "session_123" as Id<"work_sessions">;
    const existingSessions = [
      { _id: "existing1", driverId, startTime: 1000 },
      { _id: "existing2", driverId, startTime: 2000 }
    ];

    const ctx = {
      db: {
        query: jest.fn(() => ({
          filter: jest.fn(() => ({
            collect: jest.fn(() => Promise.resolve(existingSessions))
          }))
        })),
        patch: jest.fn(),
        insert: jest.fn(() => Promise.resolve(mockId))
      }
    };

    const result = await startWorkSessionHandlerFunc(ctx as any, driverId);

    // Should query for existing sessions
    expect(ctx.db.query).toHaveBeenCalledWith("work_sessions");

    // Should end existing sessions
    expect(ctx.db.patch).toHaveBeenCalledTimes(2);
    expect(ctx.db.patch).toHaveBeenCalledWith("existing1", {
      endTime: expect.any(Number)
    });
    expect(ctx.db.patch).toHaveBeenCalledWith("existing2", {
      endTime: expect.any(Number)
    });

    // Should create new session
    expect(result).toBe(mockId);
    expect(ctx.db.insert).toHaveBeenCalledWith("work_sessions", {
      driverId,
      startTime: expect.any(Number)
    });
  });

  it("should handle case with no existing sessions", async () => {
    const driverId = "driver456" as Id<"taxiTap_users">;
    const mockId = "session_456" as Id<"work_sessions">;

    const ctx = {
      db: {
        query: jest.fn(() => ({
          filter: jest.fn(() => ({
            collect: jest.fn(() => Promise.resolve([]))
          }))
        })),
        patch: jest.fn(),
        insert: jest.fn(() => Promise.resolve(mockId))
      }
    };

    const result = await startWorkSessionHandlerFunc(ctx as any, driverId);

    // Should query for existing sessions
    expect(ctx.db.query).toHaveBeenCalledWith("work_sessions");

    // Should not patch anything if no existing sessions
    expect(ctx.db.patch).not.toHaveBeenCalled();

    // Should create new session
    expect(result).toBe(mockId);
    expect(ctx.db.insert).toHaveBeenCalledWith("work_sessions", {
      driverId,
      startTime: expect.any(Number)
    });
  });
});