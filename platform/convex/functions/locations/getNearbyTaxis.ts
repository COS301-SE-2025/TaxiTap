import { query } from "../../_generated/server";
import { v } from "convex/values";

function getDistance(latitude: number, longitude: number, latitude2: number, longitude2: number): number {
  const R = 6371;
  const toRadius = (angle: number) => (angle * Math.PI) / 180;

  const distanceLatitude = toRadius(latitude2 - latitude);
  const distanceLonLongitude = toRadius(longitude2 - longitude);
  const a = Math.sin(distanceLatitude / 2) ** 2 + Math.cos(toRadius(latitude)) * Math.cos(toRadius(latitude2)) * Math.sin(distanceLonLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getNearbyDrivers = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const { latitude, longitude } = args;
    const radiusKm = args.radiusKm ?? 5;

    const getAllDriverLocations = await ctx.db
      .query("locations")
      .withIndex("by_user")
      .collect();

    const getAllNearbyDrivers = getAllDriverLocations
      .filter((location) => location.role === "driver" || location.role === "both")
      .filter((location) => {
        const distance = getDistance(
          latitude,
          longitude,
          location.latitude,
          location.longitude
        );
        return distance <= radiusKm;
      });

    return getAllNearbyDrivers;
  },
});
