import {
  createMultiLegJourneyHandler,
  progressJourneyToNextLegHandler,
  requestNextLegTaxiHandlerExported as requestNextLegTaxiHandler,
  getJourneyStatusHandler,
  associateRideWithLegHandler,
  cancelMultiLegJourneyHandler,
  getPassengerJourneysHandler,
  calculateJourneyTotalCostHandler,
} from '../../convex/functions/journeys/journeyManagement';

describe('journeyManagement Integration Tests', () => {
  let journeyId: string;
  let passengerId: string = 'passenger_integration_test';

  // Mock taxi search results
  const mockTaxiSearchResult = {
    success: true,
    availableTaxis: [
      {
        userId: 'driver_123',
        routeInfo: {
          routeName: 'Test Route',
          calculatedFare: 25.0,
          estimatedDuration: 1800
        }
      }
    ],
    matchingRoutes: [
      {
        routeId: 'route_123',
        routeName: 'Test Route',
        fare: 25.0
      }
    ]
  };

  const mockJourneyPlan = {
    originAddress: "University of Pretoria, Pretoria",
    destinationAddress: "OR Tambo International Airport, Johannesburg",
    originCoordinates: {
      latitude: -25.7479,
      longitude: 28.2293
    },
    destinationCoordinates: {
      latitude: -26.1392,
      longitude: 28.2460
    },
    legs: [
      {
        legIndex: 0,
        fromAddress: "University of Pretoria, Pretoria",
        toAddress: "Hatfield Plaza, Pretoria",
        fromCoordinates: {
          latitude: -25.7479,
          longitude: 28.2293
        },
        toCoordinates: {
          latitude: -25.7500,
          longitude: 28.2380
        },
        routeId: "route_123",
        estimatedDuration: 1800,
        estimatedFare: 25.0
      },
      {
        legIndex: 1,
        fromAddress: "Hatfield Plaza, Pretoria",
        toAddress: "OR Tambo International Airport, Johannesburg",
        fromCoordinates: {
          latitude: -25.7500,
          longitude: 28.2380
        },
        toCoordinates: {
          latitude: -26.1392,
          longitude: 28.2460
        },
        routeId: "route_456",
        estimatedDuration: 3600,
        estimatedFare: 45.0
      }
    ],
    optimizationPreference: "shortest_time",
    estimatedTotalFare: 70.0,
    estimatedTotalDuration: 5400
  };

  // Helper function to create a more realistic mock context
  function createIntegrationMockCtx() {
    const journeys: any[] = [];
    const legs: any[] = [];
    const rides: any[] = [];
    let idCounter = 1;

    const generateId = (prefix: string) => `${prefix}_${Date.now()}_${idCounter++}`;

    return {
      db: {
        insert: jest.fn(async (table: string, obj: any) => {
          const newId = generateId(table);
          const insertedObj = { ...obj, _id: newId, _creationTime: Date.now() };

          if (table === "multiLegJourneys") {
            journeys.push(insertedObj);
          } else if (table === "journeyLegs") {
            legs.push(insertedObj);
          } else if (table === "rides") {
            rides.push(insertedObj);
          }

          return newId;
        }),
        get: jest.fn(async (id: string) => {
          // Mock passenger exists
          if (id === passengerId) {
            return { _id: passengerId, name: 'Test Passenger', accountType: 'passenger' };
          }

          const allRecords = [...journeys, ...legs, ...rides];
          return allRecords.find(r => r._id === id) || null;
        }),
        patch: jest.fn(async (id: string, updates: any) => {
          const allRecords = [...journeys, ...legs, ...rides];
          const record = allRecords.find(r => r._id === id);
          if (record) {
            Object.assign(record, updates, { _updatedTime: Date.now() });
          }
          return id;
        }),
        query: jest.fn((table: string) => ({
          withIndex: jest.fn((indexName: string, filterFn?: any) => {
            // Call the filter function to extract parameters if provided
            let filterValues: { [key: string]: any } = {};
            if (filterFn && typeof filterFn === 'function') {
              // Mock the query builder that's passed to the filter function
              const mockQueryBuilder = {
                eq: jest.fn((field: string, value: any) => {
                  filterValues[field] = value;
                  // Return an object that also has eq method for chaining
                  return mockQueryBuilder;
                })
              };
              filterFn(mockQueryBuilder);
            }

            return {
              unique: jest.fn(async () => {
                if (table === "multiLegJourneys") {
                  if (indexName === "by_journey_id") {
                    return journeys.find(j => j.journeyId === filterValues.journeyId) || null;
                  }
                  if (indexName === "by_passenger") {
                    return journeys.find(j => j.passengerId === filterValues.passengerId) || null;
                  }
                }
                if (table === "journeyLegs") {
                  if (indexName === "by_journey_and_leg") {
                    return legs.find(l => l.journeyId === filterValues.journeyId && l.legIndex === filterValues.legIndex) || null;
                  }
                  if (indexName === "by_journey_id") {
                    return legs.find(l => l.journeyId === filterValues.journeyId) || null;
                  }
                }
                return null;
              }),
              collect: jest.fn(async () => {
                if (table === "multiLegJourneys") {
                  if (indexName === "by_passenger") {
                    return journeys.filter(j => j.passengerId === filterValues.passengerId);
                  }
                  if (indexName === "by_journey_id") {
                    return journeys.filter(j => j.journeyId === filterValues.journeyId);
                  }
                  return journeys;
                }
                if (table === "journeyLegs") {
                  if (indexName === "by_journey_id") {
                    return legs.filter(l => l.journeyId === filterValues.journeyId);
                  }
                  if (indexName === "by_journey_and_leg") {
                    return legs.filter(l => l.journeyId === filterValues.journeyId && l.legIndex === filterValues.legIndex);
                  }
                  return legs;
                }
                return [];
              })
            };
          }),
          filter: jest.fn((filterFn: any) => {
            const mockQuery = {
              collect: jest.fn(async () => {
                if (table === "multiLegJourneys") {
                  // Simple implementation: just return journeys for now
                  // The real filtering logic is complex, but for tests we can simplify
                  return journeys;
                }
                return [];
              })
            };
            return mockQuery;
          }),
          collect: jest.fn(async () => {
            if (table === "multiLegJourneys") return journeys;
            if (table === "journeyLegs") return legs;
            if (table === "rides") return rides;
            return [];
          })
        }))
      },
      runQuery: jest.fn().mockResolvedValue(mockTaxiSearchResult),
      runMutation: jest.fn().mockResolvedValue(undefined),
      // Helper methods for testing
      _getJourneys: () => journeys,
      _getLegs: () => legs,
      _getRides: () => rides,
    };
  }

  describe('Complete Multi-Leg Journey Flow', () => {
    it('should create, progress through, and complete a 2-leg journey', async () => {
      const ctx = createIntegrationMockCtx();

      // Step 1: Create multi-leg journey
      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      expect(createResult.success).toBe(true);
      expect(createResult.journeyId).toBeDefined();
      expect(createResult.totalLegs).toBe(2);
      journeyId = createResult.journeyId;

      // Verify journey and legs were created
      const journeys = ctx._getJourneys();
      const legs = ctx._getLegs();
      expect(journeys).toHaveLength(1);
      expect(legs).toHaveLength(2);
      expect(journeys[0].status).toBe('planning');

      // Step 2: Associate ride with first leg
      const rideId = 'ride_leg_0';
      const associateResult = await associateRideWithLegHandler(ctx, {
        journeyId,
        legIndex: 0,
        rideId
      });

      expect(associateResult.success).toBe(true);

      // Step 3: Get journey status after association
      const statusResult1 = await getJourneyStatusHandler(ctx, { journeyId });
      expect(statusResult1.success).toBe(true);
      expect(statusResult1.journey.status).toBe('planning');
      expect(statusResult1.progress.currentLeg).toBe(0);
      expect(statusResult1.progress.percentComplete).toBe(0);

      // Step 4: Progress to next leg (complete first leg)
      const progressResult1 = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 0,
        passengerLocation: { latitude: -25.7500, longitude: 28.2380 },
        actualFare: 27.0
      });

      expect(progressResult1.success).toBe(true);
      expect(progressResult1.journeyCompleted).toBe(false);
      expect(progressResult1.nextLegIndex).toBe(1);
      expect(progressResult1.taxiRequestResult).toBeDefined();

      // Step 5: Associate ride with second leg
      const rideId2 = 'ride_leg_1';
      const associateResult2 = await associateRideWithLegHandler(ctx, {
        journeyId,
        legIndex: 1,
        rideId: rideId2
      });

      expect(associateResult2.success).toBe(true);

      // Step 6: Complete the journey (final leg)
      const progressResult2 = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 1,
        passengerLocation: { latitude: -26.1392, longitude: 28.2460 },
        actualFare: 42.0
      });

      expect(progressResult2.success).toBe(true);
      expect(progressResult2.journeyCompleted).toBe(true);
      expect(progressResult2.message).toBe('Journey completed successfully');

      // Step 7: Get final journey status
      const statusResult2 = await getJourneyStatusHandler(ctx, { journeyId });
      expect(statusResult2.success).toBe(true);
      expect(statusResult2.journey.status).toBe('completed');
      expect(statusResult2.progress.percentComplete).toBe(100);
      expect(statusResult2.progress.completedLegs).toBe(2);

      // Step 8: Calculate total journey cost
      const costResult = await calculateJourneyTotalCostHandler(ctx, { journeyId });
      expect(costResult.success).toBe(true);
      expect(costResult.totalEstimatedCost).toBe(70.0);
      expect(costResult.totalActualCost).toBe(69.0); // 27.0 + 42.0
      expect(costResult.costVariance).toBe(-1.0);

      // Step 9: Verify passenger journey history
      const passengerJourneysResult = await getPassengerJourneysHandler(ctx, {
        passengerId
      });
      expect(passengerJourneysResult.success).toBe(true);
      expect(passengerJourneysResult.journeys).toHaveLength(1);
      expect(passengerJourneysResult.journeys[0].status).toBe('completed');
    });

    it('should handle journey cancellation with active rides', async () => {
      const ctx = createIntegrationMockCtx();

      // Create journey
      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      expect(createResult.success).toBe(true);
      journeyId = createResult.journeyId;

      // Associate ride with first leg
      const rideId = 'active_ride_123';
      await associateRideWithLegHandler(ctx, {
        journeyId,
        legIndex: 0,
        rideId
      });

      // Mock active ride
      ctx.db.get = jest.fn().mockImplementation(async (id: string) => {
        if (id === rideId) {
          return { _id: rideId, status: 'in_progress' };
        }
        if (id === passengerId) {
          return { _id: passengerId, name: 'Test Passenger', accountType: 'passenger' };
        }
        return null;
      });

      // Cancel the journey
      const cancelResult = await cancelMultiLegJourneyHandler(ctx, {
        journeyId,
        reason: 'Passenger emergency'
      });

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.cancelledRides).toBe(1);
      expect(cancelResult.message).toContain('Journey cancelled successfully');

      // Verify journey status
      const statusResult = await getJourneyStatusHandler(ctx, { journeyId });
      expect(statusResult.success).toBe(true);
      expect(statusResult.journey.status).toBe('cancelled');
    });

    it('should handle failed leg scenario', async () => {
      const ctx = createIntegrationMockCtx();

      // Mock taxi search failure for next leg
      ctx.runQuery = jest.fn()
        .mockResolvedValue({ availableTaxis: [] }); // All calls return no taxis

      // Create journey
      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      journeyId = createResult.journeyId;

      // Complete first leg and try to progress (should fail to find taxi for next leg)
      const progressResult = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 0,
        passengerLocation: { latitude: -25.7500, longitude: 28.2380 },
        actualFare: 25.0
      });

      expect(progressResult.success).toBe(true);
      expect(progressResult.taxiRequestResult.success).toBe(false);
      expect(progressResult.taxiRequestResult.error).toBe('No taxis available for next leg');
      expect(progressResult.taxiRequestResult.suggestedActions).toContain('Expand search radius');
    });
  });

  describe('Multi-Journey Passenger History', () => {
    it('should maintain journey history for passenger', async () => {
      const ctx = createIntegrationMockCtx();

      // Create multiple journeys
      const journey1Result = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      const journey2Plan = {
        ...mockJourneyPlan,
        legs: [mockJourneyPlan.legs[0]] // Single leg journey
      };

      const journey2Result = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: journey2Plan
      });

      expect(journey1Result.success).toBe(true);
      expect(journey2Result.success).toBe(true);

      // Get passenger journey history
      const historyResult = await getPassengerJourneysHandler(ctx, {
        passengerId
      });

      expect(historyResult.success).toBe(true);
      expect(historyResult.journeys).toHaveLength(2);
      expect(historyResult.totalFound).toBe(2);

      // Verify journeys include legs
      expect(historyResult.journeys[0].legs).toBeDefined();
      expect(historyResult.journeys[1].legs).toBeDefined();

      // Test status filtering
      const activeJourneysResult = await getPassengerJourneysHandler(ctx, {
        passengerId,
        status: 'planning'
      });

      expect(activeJourneysResult.success).toBe(true);
      expect(activeJourneysResult.journeys).toHaveLength(2); // Both should be in planning state

      // Test limit
      const limitedResult = await getPassengerJourneysHandler(ctx, {
        passengerId,
        limit: 1
      });

      expect(limitedResult.success).toBe(true);
      expect(limitedResult.journeys).toHaveLength(1);
    });
  });

  describe('Complex Multi-Leg Scenarios', () => {
    it('should handle 3-leg journey with multiple transfers', async () => {
      const ctx = createIntegrationMockCtx();

      const threeLegPlan = {
        ...mockJourneyPlan,
        legs: [
          ...mockJourneyPlan.legs,
          {
            legIndex: 2,
            fromAddress: "OR Tambo International Airport, Johannesburg",
            toAddress: "Sandton City, Johannesburg",
            fromCoordinates: {
              latitude: -26.1392,
              longitude: 28.2460
            },
            toCoordinates: {
              latitude: -26.1076,
              longitude: 28.0567
            },
            routeId: "route_789",
            estimatedDuration: 1200,
            estimatedFare: 30.0
          }
        ],
        estimatedTotalFare: 100.0,
        estimatedTotalDuration: 6600
      };

      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: threeLegPlan
      });

      expect(createResult.success).toBe(true);
      expect(createResult.totalLegs).toBe(3);
      journeyId = createResult.journeyId;

      // Progress through first leg
      const progress1 = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 0,
        passengerLocation: { latitude: -25.7500, longitude: 28.2380 },
        actualFare: 25.0
      });

      expect(progress1.success).toBe(true);
      expect(progress1.nextLegIndex).toBe(1);

      // Progress through second leg
      const progress2 = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 1,
        passengerLocation: { latitude: -26.1392, longitude: 28.2460 },
        actualFare: 45.0
      });

      expect(progress2.success).toBe(true);
      expect(progress2.nextLegIndex).toBe(2);
      expect(progress2.journeyCompleted).toBe(false);

      // Complete final leg
      const progress3 = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 2,
        passengerLocation: { latitude: -26.1076, longitude: 28.0567 },
        actualFare: 28.0
      });

      expect(progress3.success).toBe(true);
      expect(progress3.journeyCompleted).toBe(true);

      // Verify final status
      const statusResult = await getJourneyStatusHandler(ctx, { journeyId });
      expect(statusResult.success).toBe(true);
      expect(statusResult.journey.status).toBe('completed');
      expect(statusResult.progress.percentComplete).toBe(100);
      expect(statusResult.progress.completedLegs).toBe(3);

      // Verify cost calculation
      const costResult = await calculateJourneyTotalCostHandler(ctx, { journeyId });
      expect(costResult.success).toBe(true);
      expect(costResult.totalActualCost).toBe(98.0); // 25 + 45 + 28
      expect(costResult.totalEstimatedCost).toBe(100.0);
      expect(costResult.costVariance).toBe(-2.0);
    });

    it('should handle taxi request with expanded radius', async () => {
      const ctx = createIntegrationMockCtx();

      // Create journey
      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      journeyId = createResult.journeyId;

      // Test expanded radius taxi request
      const taxiRequestResult = await requestNextLegTaxiHandler(ctx, {
        journeyId,
        legIndex: 1,
        transferLocation: { latitude: -25.7500, longitude: 28.2380 },
        destinationLocation: { latitude: -26.1392, longitude: 28.2460 },
        expandedRadius: 3.0
      });

      expect(taxiRequestResult.success).toBe(true);
      expect(taxiRequestResult.searchRadius).toBe(3.0);
      expect(taxiRequestResult.availableTaxis).toHaveLength(1);

      // Verify the enhanced taxi matching was called with correct radius
      expect(ctx.runQuery).toHaveBeenCalledWith(
        expect.any(Function), // The function reference
        expect.objectContaining({
          maxTaxiDistance: 3
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle journey with invalid leg references', async () => {
      const ctx = createIntegrationMockCtx();

      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      journeyId = createResult.journeyId;

      // Try to progress with invalid leg index
      const progressResult = await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 99, // Invalid leg index
        passengerLocation: { latitude: -25.7500, longitude: 28.2380 },
        actualFare: 25.0
      });

      expect(progressResult.success).toBe(false);
      expect(progressResult.error).toBe('Completed leg not found');
    });

    it('should handle non-existent journey operations', async () => {
      const ctx = createIntegrationMockCtx();

      // Try to get status of non-existent journey
      const statusResult = await getJourneyStatusHandler(ctx, {
        journeyId: 'non_existent_journey'
      });

      expect(statusResult.success).toBe(false);
      expect(statusResult.error).toBe('Journey not found');

      // Try to cancel non-existent journey
      const cancelResult = await cancelMultiLegJourneyHandler(ctx, {
        journeyId: 'non_existent_journey'
      });

      expect(cancelResult.success).toBe(false);
      expect(cancelResult.error).toBe('Journey not found');
    });

    it('should handle empty passenger journey history', async () => {
      const ctx = createIntegrationMockCtx();

      const historyResult = await getPassengerJourneysHandler(ctx, {
        passengerId: 'passenger_with_no_journeys'
      });

      expect(historyResult.success).toBe(true);
      expect(historyResult.journeys).toHaveLength(0);
      expect(historyResult.totalFound).toBe(0);
    });
  });

  describe('Real-time Updates and Monitoring', () => {
    it('should track journey progress in real-time', async () => {
      const ctx = createIntegrationMockCtx();

      // Create journey
      const createResult = await createMultiLegJourneyHandler(ctx, {
        passengerId,
        journeyPlan: mockJourneyPlan
      });

      journeyId = createResult.journeyId;

      // Check initial status
      const status1 = await getJourneyStatusHandler(ctx, { journeyId });
      expect(status1.progress.percentComplete).toBe(0);
      expect(status1.progress.currentLeg).toBe(0);

      // Progress first leg
      await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 0,
        passengerLocation: { latitude: -25.7500, longitude: 28.2380 },
        actualFare: 25.0
      });

      // Check mid-journey status
      const status2 = await getJourneyStatusHandler(ctx, { journeyId });
      expect(status2.progress.percentComplete).toBe(50); // 1 of 2 legs completed
      expect(status2.progress.currentLeg).toBe(1);
      expect(status2.progress.completedLegs).toBe(1);

      // Complete journey
      await progressJourneyToNextLegHandler(ctx, {
        journeyId,
        completedLegIndex: 1,
        passengerLocation: { latitude: -26.1392, longitude: 28.2460 },
        actualFare: 45.0
      });

      // Check final status
      const status3 = await getJourneyStatusHandler(ctx, { journeyId });
      expect(status3.progress.percentComplete).toBe(100);
      expect(status3.journey.status).toBe('completed');
      expect(status3.progress.completedLegs).toBe(2);
    });
  });
});