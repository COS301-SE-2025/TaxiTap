import { startWorkSessionHandlerFunc } from "../../../convex/functions/work_sessions/startWorkSessionHandler";

describe("startWorkSessionHandlerFunc", () => {
  let ctx: any;
  let driverId = "driver123";

  beforeEach(() => {
    ctx = {
      db: {
        insert: jest.fn(async (table: string, data: any) => ({
          _id: "mockSessionId",
          ...data,
        })),
      },
    };
  });

  it("should insert a new work session with correct driverId and startTime", async () => {
    const result = await startWorkSessionHandlerFunc(ctx, driverId);

    expect(ctx.db.insert).toHaveBeenCalledWith("work_sessions", expect.objectContaining({
      driverId,
      startTime: expect.any(Number),
    }));

    expect(result).toHaveProperty("_id", "mockSessionId");
    expect(result.driverId).toBe(driverId);
    expect(result.startTime).toBeDefined();
  });

  it("should return the inserted session object", async () => {
    const session = await startWorkSessionHandlerFunc(ctx, driverId);

    expect(session).toEqual({
      _id: "mockSessionId",
      driverId,
      startTime: expect.any(Number),
    });
  });
});