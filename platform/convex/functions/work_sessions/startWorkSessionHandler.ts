import { MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

export const startWorkSessionHandlerFunc = async (ctx: MutationCtx, driverId: Id<"taxiTap_users">) => {
  // First, find and end any existing active work sessions for this driver
  const existingActiveSessions = await ctx.db
    .query("work_sessions")
    .filter((q) => q.and(
      q.eq(q.field("driverId"), driverId),
      q.eq(q.field("endTime"), undefined) // Sessions without end time (still active)
    ))
    .collect();

  // End all existing active sessions by setting endTime
  const currentTime = Date.now();
  for (const session of existingActiveSessions) {
    await ctx.db.patch(session._id, {
      endTime: currentTime
    });
  }

  // Now create the new work session
  const newSessionId = await ctx.db.insert("work_sessions", {
    driverId,
    startTime: currentTime,
  });

  return newSessionId;
};