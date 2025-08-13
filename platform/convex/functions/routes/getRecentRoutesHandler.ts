export const getPassengerTopRoutesHandler = async (ctx: any, passengerId: string) => {
  const routes = await ctx.db
    .query("passengerRoutes")
    .withIndex("by_passenger_last_used", (q: any) => q.eq("passengerId", passengerId))
    .order("desc")
    .collect();

  return routes
    .sort((a: any, b: any) => b.usageCount - a.usageCount)
    .slice(0, 3);
};