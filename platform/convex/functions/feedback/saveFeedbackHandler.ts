export async function saveFeedbackHandler(ctx: any, args: any) {
  const existing = await ctx.db
    .query("feedback")
    .withIndex("by_ride", (q: any) => q.eq("rideId", args.rideId))
    .first();

  if (existing) {
    throw new Error("Feedback already submitted for this ride.");
  }

  const id = await ctx.db.insert("feedback", {
    rideId: args.rideId,
    passengerId: args.passengerId,
    driverId: args.driverId,
    rating: args.rating,
    comment: args.comment,
    startLocation: args.startLocation,
    endLocation: args.endLocation,
    createdAt: Date.now(),
  });

  return { id };
}