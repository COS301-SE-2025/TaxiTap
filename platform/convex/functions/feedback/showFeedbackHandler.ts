export async function showFeedbackPassengerHandler(ctx: any, args: any) {
  const feedbacks = await ctx.db
    .query("feedback")
    .withIndex("by_passenger", (q: any) => q.eq("passengerId", args.passengerId))
    .order("desc")
    .collect();

  const enrichedFeedbacks = await Promise.all(
    feedbacks.map(async (fb: any) => {
      const driver = fb.driverId ? await ctx.db.get(fb.driverId) : null;
      return { ...fb, driverName: driver?.name || "Unknown" };
    })
  );

  return enrichedFeedbacks;
}

export async function showFeedbackDriverHandler(ctx: any, args: any) {
  return await ctx.db
    .query("feedback")
    .withIndex("by_driver", (q: any) => q.eq("driverId", args.driverId))
    .order("desc")
    .collect();
}