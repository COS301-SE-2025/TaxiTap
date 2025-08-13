export const startWorkSessionHandlerFunc = async (ctx: any, driverId: string) => {
  return await ctx.db.insert("work_sessions", {
    driverId,
    startTime: Date.now(),
  });
};