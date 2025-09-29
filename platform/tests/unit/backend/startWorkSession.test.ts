import { startWorkSessionHandlerFunc } from "../../../convex/functions/work_sessions/startWorkSessionHandler";
import { Id } from "../../../convex/_generated/dataModel";

describe("startWorkSessionHandlerFunc", () => {
  let ctx: any;
  let driverId = "driver123" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(() => ({
          filter: jest.fn(() => ({
            collect: jest.fn(async () => [
              { _id: "existingSession1", driverId, startTime: 1000 },
              { _id: "existingSession2", driverId, startTime: 2000 }
            ])
          }))
        })),
        patch: jest.fn(),
        insert: jest.fn(async () => "mockSessionId" as Id<"work_sessions">),
      },
    };
  });

  it("should end existing sessions and create new work session", async () => {
    const result = await startWorkSessionHandlerFunc(ctx, driverId);

    // Should query for existing active sessions
    expect(ctx.db.query).toHaveBeenCalledWith("work_sessions");

    // Should end existing sessions
    expect(ctx.db.patch).toHaveBeenCalledTimes(2);
    expect(ctx.db.patch).toHaveBeenCalledWith("existingSession1", {
      endTime: expect.any(Number)
    });
    expect(ctx.db.patch).toHaveBeenCalledWith("existingSession2", {
      endTime: expect.any(Number)
    });

    // Should insert new work session
    expect(ctx.db.insert).toHaveBeenCalledWith("work_sessions", expect.objectContaining({
      driverId,
      startTime: expect.any(Number),
    }));

    // Should return the new session ID
    expect(result).toBe("mockSessionId");
  });

  it("should handle case with no existing sessions", async () => {
    // Mock no existing sessions
    ctx.db.query = jest.fn(() => ({
      filter: jest.fn(() => ({
        collect: jest.fn(async () => [])
      }))
    }));

    const result = await startWorkSessionHandlerFunc(ctx, driverId);

    // Should not call patch if no existing sessions
    expect(ctx.db.patch).not.toHaveBeenCalled();

    // Should still insert new session
    expect(ctx.db.insert).toHaveBeenCalledWith("work_sessions", expect.objectContaining({
      driverId,
      startTime: expect.any(Number),
    }));

    expect(result).toBe("mockSessionId");
  });
});