import { Id } from "../../_generated/dataModel";

export async function startTripHandler(
  ctx: any,
  args: {
    passengerId: Id<"taxiTap_users">;
    driverId: Id<"taxiTap_users">;
    reservation: boolean;
  }
): Promise<Id<"trips">> {
  const { passengerId, driverId, reservation } = args;
  const startTime = Date.now();

  const tripId = await ctx.db.insert("trips", {
    driverId,
    passengerId,
    startTime,
    endTime: 0,
    fare: 0,
    reservation,
  });

  const matchingRide = await ctx.db
    .query("rides")
    .withIndex("by_passenger_and_driver", (q: any) =>
      q.eq("passengerId", passengerId).eq("driverId", driverId)
    )
    .order("desc")
    .collect();

  const rideToPatch = matchingRide.find((r: any) => !r.tripId);

  if (rideToPatch) {
    await ctx.db.patch(rideToPatch._id, { tripId });
  }

  return tripId;
}