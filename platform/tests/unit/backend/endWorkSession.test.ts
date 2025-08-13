import { endWorkSessionHandler } from "../../../convex/functions/work_sessions/endWorkSessionHandler";

describe("endWorkSession mutation", () => {
  let ctx: any;
  const driverId = "driver123";

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        first: jest.fn(),
        patch: jest.fn(),
      },
    };
  });

  it("ends the latest active session", async () => {
    const mockSession = { _id: "session1", driverId, startTime: 1000, endTime: null };
    ctx.db.first.mockResolvedValue(mockSession);

    const result = await endWorkSessionHandler(ctx, { driverId });

    expect(ctx.db.patch).toHaveBeenCalledWith("session1", expect.objectContaining({
      endTime: expect.any(Number),
    }));

    expect(result).toEqual({ sessionId: "session1" });
  });

  it("throws error if no active session exists", async () => {
    ctx.db.first.mockResolvedValue(null);
    await expect(endWorkSessionHandler(ctx, { driverId })).rejects.toThrow(
      "No active work session found."
    );

    ctx.db.first.mockResolvedValue({ _id: "session2", endTime: 1234 });
    await expect(endWorkSessionHandler(ctx, { driverId })).rejects.toThrow(
      "No active work session found."
    );
  });

  it("calls database query with correct driverId", async () => {
    ctx.db.first.mockResolvedValue({ _id: "session3", endTime: null });

    await endWorkSessionHandler(ctx, { driverId });

    expect(ctx.db.query).toHaveBeenCalledWith("work_sessions");
    expect(ctx.db.withIndex).toHaveBeenCalledWith(
      "by_driver_and_start",
      expect.any(Function)
    );

    const queryFn = ctx.db.withIndex.mock.calls[0][1];
    const mockQ = { eq: jest.fn() };
    queryFn(mockQ);
    expect(mockQ.eq).toHaveBeenCalledWith("driverId", driverId);
  });
});