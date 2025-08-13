import { startWorkSessionHandlerFunc } from "../../convex/functions/work_sessions/startWorkSessionHandler";

describe("startWorkSessionHandlerFunc (integration)", () => {
  let ctx: any;
  let driverId = "driver123";
  let sessions: any[] = [];

  beforeEach(() => {
    sessions = [];
    ctx = {
      db: {
        insert: async (table: string, data: any) => {
          const newSession = { _id: `session_${sessions.length + 1}`, ...data };
          sessions.push(newSession);
          return newSession;
        },
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              collect: jest.fn(async () => [...sessions]),
            })),
          })),
        })),
      },
    };
  });

  it("should create a new work session", async () => {
    const result = await startWorkSessionHandlerFunc(ctx, driverId);

    expect(result).toHaveProperty("_id");
    expect(result.driverId).toBe(driverId);
    expect(result.startTime).toBeDefined();

    expect(sessions).toContainEqual(result);
  });

  it("should create multiple sessions independently", async () => {
    const session1 = await startWorkSessionHandlerFunc(ctx, driverId);
    const session2 = await startWorkSessionHandlerFunc(ctx, driverId);

    expect(sessions.length).toBe(2);
    expect(sessions).toContainEqual(session1);
    expect(sessions).toContainEqual(session2);
    expect(session1._id).not.toBe(session2._id);
  });
});