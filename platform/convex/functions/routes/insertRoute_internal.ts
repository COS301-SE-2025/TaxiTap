import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const insertRoutes = mutation({
  args: {
    routeData: v.object({
      routes: v.array(v.object({
        routeId: v.string(),
        name: v.string(),
        geometry: v.any(),
        stops: v.array(v.object({
          id: v.string(),
          name: v.string(),
          coordinates: v.array(v.number()),
          order: v.number()
        })),
        fare: v.number(),
        estimatedDuration: v.number(),
        isActive: v.boolean(),
        taxiAssociation: v.string(),
        taxiAssociationRegistrationNumber: v.string()
      }))
    })
  },
  handler: async (ctx, { routeData }) => {
    for (const route of routeData.routes) {
      await ctx.db.insert("routes", {
        routeId: route.routeId,
        name: route.name,
        geometry: route.geometry,
        stops: route.stops,
        fare: route.fare,
        estimatedDuration: route.estimatedDuration,
        isActive: route.isActive,
        taxiAssociation: route.taxiAssociation,
        taxiAssociationRegistrationNumber: route.taxiAssociationRegistrationNumber
      });
    }
  },
});