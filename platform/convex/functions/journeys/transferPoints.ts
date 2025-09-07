/**
 * transferPoints.ts
 * 
 * Convex functions for transfer point analysis and optimization.
 * Provides functions for finding route intersections, scoring transfer points,
 * and optimizing multi-leg journey sequences.
 * 
 * @author Moyahabo Hamese
 */

import { query, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

// ============================================================================
// TRANSFER POINT ANALYSIS
// ============================================================================
/**
 * Locate stops within 1km of multiple routes
 */
export const findNearbyRouteIntersections = internalQuery({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    destinationLat: v.number(),
    destinationLng: v.number(),
    maxTransferDistance: v.optional(v.number()), // Optional max walking distance to transfer point
  },
  handler: async (ctx, args) => {
    const { 
      originLat, 
      originLng, 
      destinationLat, 
      destinationLng, 
      maxTransferDistance = 1000 
    } = args;
    
    try {
      // Get all routes from the database
      const allRoutes = await ctx.db.query("routes").collect();
      
      // Find routes that can serve the origin
      const originAccessibleRoutes = [];
      for (const route of allRoutes) {
        const proximityToOrigin = calculateRouteProximity(
          route,
          { lat: originLat, lng: originLng }
        );
        
        if (proximityToOrigin.distance <= maxTransferDistance) {
          originAccessibleRoutes.push({
            route,
            distanceFromOrigin: proximityToOrigin.distance,
            nearestPoint: proximityToOrigin.nearestPoint,
          });
        }
      }
      
      // Find routes that can serve the destination
      const destinationAccessibleRoutes = [];
      for (const route of allRoutes) {
        const proximityToDestination = calculateRouteProximity(
          route,
          { lat: destinationLat, lng: destinationLng }
        );
        
        if (proximityToDestination.distance <= maxTransferDistance) {
          destinationAccessibleRoutes.push({
            route,
            distanceFromDestination: proximityToDestination.distance,
            nearestPoint: proximityToDestination.nearestPoint,
          });
        }
      }
      
      // Find intersection points between origin and destination routes
      const intersectionPoints = [];
      
      for (const originRoute of originAccessibleRoutes) {
        for (const destRoute of destinationAccessibleRoutes) {
          // Skip if same route (direct route case handled elsewhere)
          if (originRoute.route._id === destRoute.route._id) {
            continue;
          }
          
          // Find potential intersection points between these two routes
          const intersections = await findRouteToRouteIntersections(
            originRoute.route,
            destRoute.route
          );
          
          for (const intersection of intersections) {
            // Verify the intersection is accessible from both routes
            const accessibilityCheck = await verifyIntersectionAccessibility(
              ctx,
              intersection,
              originRoute.route,
              destRoute.route,
              maxTransferDistance
            );
            
            if (accessibilityCheck.accessible) {
              intersectionPoints.push({
                coordinates: intersection.coordinates,
                address: intersection.address,
                fromRoute: {
                  id: originRoute.route._id,
                  name: originRoute.route.name,
                  distanceFromOrigin: originRoute.distanceFromOrigin,
                },
                toRoute: {
                  id: destRoute.route._id,
                  name: destRoute.route.name,
                  distanceFromDestination: destRoute.distanceFromDestination,
                },
                transferDetails: {
                  walkingDistance: accessibilityCheck.walkingDistance,
                  estimatedTransferTime: accessibilityCheck.estimatedTransferTime,
                  accessibility: accessibilityCheck.accessibilityFeatures,
                },
                intersectionType: intersection.type,
                confidence: intersection.confidence,
              });
            }
          }
        }
      }
      
      return {
        success: true,
        intersectionPoints,
        analysis: {
          totalRoutes: allRoutes.length,
          originAccessibleRoutes: originAccessibleRoutes.length,
          destinationAccessibleRoutes: destinationAccessibleRoutes.length,
          foundIntersections: intersectionPoints.length,
          searchRadius: maxTransferDistance,
        },
      };
      
    } catch (error) {
      console.error("Error finding nearby route intersections:", error);
      return {
        success: false,
        error: "Failed to find route intersections",
        intersectionPoints: [],
      };
    }
  },
});