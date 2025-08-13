export const endWorkSessionHandler = async (ctx: any, { driverId }: { driverId: string }) => {
  const latest = await ctx.db
    .query("work_sessions")
    .withIndex("by_driver_and_start", (q: any) => q.eq("driverId", driverId))
    .order("desc")
    .first();

  if (!latest || latest.endTime)
    throw new Error("No active work session found.");

  await ctx.db.patch(latest._id, { endTime: Date.now() });
  return { sessionId: latest._id };
};