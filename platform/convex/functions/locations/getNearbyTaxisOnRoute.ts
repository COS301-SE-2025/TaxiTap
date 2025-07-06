import { query } from "../../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

type Args = {
  passengerLat: number;
  passengerLng: number;
  passengerEndLat: number;
  passengerEndLng: number;
};

export const getNearbyTaxisForRouteRequestHandler = async (
  ctx: QueryCtx, 
  args: Args
) => {
  const { passengerLat, passengerLng, passengerEndLat, passengerEndLng } = args;

  // Fetch all routes
  const allRoutes = await ctx.db.query("routes").collect();

  // Filter routes that have nearby start & end stops
  const matchingRoutes = allRoutes.filter((route) => {
    const stops = route.stops;

    const hasNearbyStart = stops.some((stop) => {
      const [stopLat, stopLng] = stop.coordinates;
      return getDistanceKm(passengerLat, passengerLng, stopLat, stopLng) <= 5;
    });

    const hasNearbyEnd = stops.some((stop) => {
      const [stopLat, stopLng] = stop.coordinates;
      return getDistanceKm(passengerEndLat, passengerEndLng, stopLat, stopLng) <= 5;
    });

    return hasNearbyStart && hasNearbyEnd;
  });

  if (matchingRoutes.length === 0) return [];

  const nearbyDrivers = [];

  for (const route of matchingRoutes) {
    const driversOnRoute = await ctx.db
      .query("drivers")
      .withIndex("by_assigned_route", (q) => q.eq("assignedRoute", route._id as Id<"routes">))
      .collect();

    if (driversOnRoute.length === 0) continue;

    const driverUserIds = driversOnRoute.map((d) => d.userId);

    const locations = await ctx.db.query("locations").collect();

    const driversNearby = locations.filter((loc) => 
      (loc.role === "driver" || loc.role === "both") &&
      driverUserIds.some((id) => id === loc.userId) &&
      getDistanceKm(passengerLat, passengerLng, loc.latitude, loc.longitude) <= 5
    );

    nearbyDrivers.push(...driversNearby);
  }

  return nearbyDrivers;
};

export const getNearbyTaxisForRouteRequest = query({
  args: {
    passengerLat: v.number(),
    passengerLng: v.number(),
    passengerEndLat: v.number(),
    passengerEndLng: v.number(),
  },
  handler: getNearbyTaxisForRouteRequestHandler,
});