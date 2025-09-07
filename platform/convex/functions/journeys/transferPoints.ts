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
/**
 * Rate based on route connectivity and taxi availability
 */
export const scoreTransferPoints = internalQuery({
    args: {
      intersectionPoints: v.array(v.object({
        coordinates: v.object({
          latitude: v.number(),
          longitude: v.number(),
        }),
        fromRoute: v.object({
          id: v.string(),
          name: v.string(),
          distanceFromOrigin: v.number(),
        }),
        toRoute: v.object({
          id: v.string(),
          name: v.string(),
          distanceFromDestination: v.number(),
        }),
        transferDetails: v.object({
          walkingDistance: v.number(),
          estimatedTransferTime: v.number(),
        }),
        intersectionType: v.string(),
        confidence: v.number(),
      })),
      weights: v.optional(v.object({
        taxiAvailability: v.number(),
        walkingDistance: v.number(),
        routeReliability: v.number(),
        transferTime: v.number(),
        intersectionQuality: v.number(),
      })),
    },
    handler: async (ctx, args) => {
      const { intersectionPoints, weights = {
        taxiAvailability: 0.3,
        walkingDistance: 0.25,
        routeReliability: 0.2,
        transferTime: 0.15,
        intersectionQuality: 0.1,
      }} = args;
      
      try {
        const scoredPoints = [];
        
        for (const point of intersectionPoints) {
          // Taxi Availability (0-100)
          const fromRouteTaxis = await getTaxiAvailabilityScore(ctx, point.fromRoute.id);
          const toRouteTaxis = await getTaxiAvailabilityScore(ctx, point.toRoute.id);
          const taxiAvailabilityScore = (fromRouteTaxis + toRouteTaxis) / 2;
          
          // Walking Distance (0-100, lower distance = higher score)
          const walkingDistanceScore = Math.max(0, 100 - (point.transferDetails.walkingDistance / 10));
          
          // Route Reliability (0-100)
          const fromRouteReliability = await getRouteReliabilityScore(ctx, point.fromRoute.id);
          const toRouteReliability = await getRouteReliabilityScore(ctx, point.toRoute.id);
          const routeReliabilityScore = (fromRouteReliability + toRouteReliability) / 2;
          
          // Transfer Time (0-100, lower time = higher score)
          const transferTimeScore = Math.max(0, 100 - (point.transferDetails.estimatedTransferTime / 60)); // convert to minutes
          
          // Intersection Quality (based on confidence and type)
          const intersectionQualityScore = point.confidence * getIntersectionTypeMultiplier(point.intersectionType);
          
          // Calculate weighted total score
          const totalScore = 
            (taxiAvailabilityScore * weights.taxiAvailability) +
            (walkingDistanceScore * weights.walkingDistance) +
            (routeReliabilityScore * weights.routeReliability) +
            (transferTimeScore * weights.transferTime) +
            (intersectionQualityScore * weights.intersectionQuality);
          
          scoredPoints.push({
            ...point,
            scores: {
              taxiAvailability: Math.round(taxiAvailabilityScore),
              walkingDistance: Math.round(walkingDistanceScore),
              routeReliability: Math.round(routeReliabilityScore),
              transferTime: Math.round(transferTimeScore),
              intersectionQuality: Math.round(intersectionQualityScore),
              total: Math.round(totalScore),
            },
            ranking: 0, // Will be set after sorting
          });
        }
        
        // Sort by total score (highest first) and assign rankings
        scoredPoints.sort((a, b) => b.scores.total - a.scores.total);
        scoredPoints.forEach((point, index) => {
          point.ranking = index + 1;
        });
        
        return {
          success: true,
          scoredPoints,
          scoringWeights: weights,
          analysis: {
            totalPoints: scoredPoints.length,
            averageScore: Math.round(scoredPoints.reduce((sum, p) => sum + p.scores.total, 0) / scoredPoints.length),
            bestScore: scoredPoints[0]?.scores.total || 0,
            worstScore: scoredPoints[scoredPoints.length - 1]?.scores.total || 0,
          },
        };
        
      } catch (error) {
        console.error("Error scoring transfer points:", error);
        return {
          success: false,
          error: "Failed to score transfer points",
          scoredPoints: [],
        };
      }
    },
  });
  