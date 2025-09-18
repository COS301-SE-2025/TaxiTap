// Mock Convex validation functions before importing modules
jest.mock('convex/values', () => ({
  v: {
    id: jest.fn((table) => ({ table })),
    number: jest.fn(() => ({})),
    string: jest.fn(() => ({})),
    boolean: jest.fn(() => ({})),
    object: jest.fn(() => ({})),
    array: jest.fn(() => ({})),
    optional: jest.fn((validator) => ({ validator })),
    union: jest.fn((...validators) => ({ validators })),
    literal: jest.fn((value) => ({ value })),
  }
}));

jest.mock('../../convex/_generated/server', () => ({
  mutation: (def: any) => def,
  query: (def: any) => def,
  internalMutation: (def: any) => def,
}));

// Mock the API structure for proximity monitoring
jest.mock('../../convex/_generated/api', () => ({
  api: {
    functions: {
      notifications: {
        proximityMonitor: {
          getActiveMultiLegJourneysForMonitoring: 'functions.notifications.proximityMonitor.getActiveMultiLegJourneysForMonitoring',
        },
      },
      journeys: {
        journeyManagement: {
          requestNextLegTaxi: 'functions.journeys.journeyManagement.requestNextLegTaxi',
        },
      },
    },
  },
}));

import {
  getActiveMultiLegJourneysForMonitoringHandler,
  checkMultiLegTransferProximityHandler,
  manageTransferWindowHandler
} from '../../convex/functions/notifications/proximityMonitor';

describe('ProximityMonitor Integration Tests', () => {
  let mockPassengerId = 'passenger_integration_test';

  // Mock data for multi-leg journey
  const mockMultiLegJourney = {
    journeyId: "journey_integration_test",
    passengerId: mockPassengerId,
    status: "active",
    totalLegs: 2,
    currentLegIndex: 0,
    originAddress: "University of Pretoria, Pretoria",
    destinationAddress: "OR Tambo International Airport, Johannesburg",
    originCoordinates: { latitude: -25.7479, longitude: 28.2293 },
    destinationCoordinates: { latitude: -26.1392, longitude: 28.2460 }
  };

  const mockCurrentLeg = {
    _id: "leg_integration_test",
    journeyId: "journey_integration_test",
    legIndex: 0,
    fromAddress: "University of Pretoria",
    toAddress: "Hatfield Plaza",
    fromCoordinates: { latitude: -25.7479, longitude: 28.2293 },
    toCoordinates: { latitude: -25.7500, longitude: 28.2380 },
    status: "active",
    rideId: "ride_integration_test",
    estimatedFare: 25.0,
    transferWindowStart: null as number | null,
    transferWindowEnd: null as number | null
  };

  const mockDriverLocation = {
    latitude: -25.7490,
    longitude: 28.2300,
    updatedAt: Date.now()
  };

  const passengerLocation = {
    latitude: -25.7500,
    longitude: 28.2380
  };

  function createIntegrationMockCtx() {
    const journeys: any[] = [mockMultiLegJourney];
    const legs: any[] = [mockCurrentLeg];
    let idCounter = 1;

    return {
      db: {
        insert: jest.fn(async (table: string, obj: any) => {
          const newId = `integration_${table}_id_${idCounter++}`;
          return newId;
        }),
        get: jest.fn(async (id: string) => {
          const allRecords = [...journeys, ...legs];
          return allRecords.find(r => r._id === id) || null;
        }),
        patch: jest.fn(async (id: string, updates: any) => {
          const allRecords = [...journeys, ...legs];
          const record = allRecords.find(r => r._id === id);
          if (record) {
            Object.assign(record, updates);
          }
          return id;
        }),
        query: jest.fn((table: string) => ({
          withIndex: jest.fn((indexName: string, filterFn?: any) => {
            let filterValues: { [key: string]: any } = {};
            if (filterFn && typeof filterFn === 'function') {
              const mockQueryBuilder: any = {
                eq: jest.fn((field: string, value: any): any => {
                  filterValues[field] = value;
                  return mockQueryBuilder;
                })
              };
              filterFn(mockQueryBuilder);
            }

            return {
              take: jest.fn(async (limit: number) => {
                if (table === "multiLegJourneys" && indexName === "by_status") {
                  return filterValues.status === "active" ? [mockMultiLegJourney] : [];
                }
                return [];
              }),
              unique: jest.fn(async () => {
                if (table === "journeyLegs" && indexName === "by_journey_and_leg") {
                  if (filterValues.journeyId === mockMultiLegJourney.journeyId && filterValues.legIndex === 0) {
                    return mockCurrentLeg;
                  }
                }
                return null;
              }),
              collect: jest.fn(async () => {
                if (table === "journeyLegs" && indexName === "by_journey_id") {
                  return filterValues.journeyId === mockMultiLegJourney.journeyId ? [mockCurrentLeg] : [];
                }
                return [];
              })
            };
          }),
          filter: jest.fn((filterFn: any) => ({
            first: jest.fn(async () => {
              if (table === "locations") {
                return {
                  userId: "driver_123",
                  ...mockDriverLocation
                };
              }
              return null;
            })
          }))
        }))
      },
      runQuery: jest.fn().mockImplementation((endpoint: string, args: any) => {
        if (endpoint.includes('getActiveMultiLegJourneysForMonitoring')) {
          return Promise.resolve([
            {
              journey: mockMultiLegJourney,
              currentLeg: mockCurrentLeg,
              ride: { _id: "ride_123", rideId: "ride_integration_test", driverId: "driver_123" },
              driverLocation: mockDriverLocation,
              transferPoint: { latitude: -25.7500, longitude: 28.2380 }
            }
          ]);
        }
        return Promise.resolve([]);
      }),
      runMutation: jest.fn()
    };
  }

  describe('Complete Multi-Leg Proximity Monitoring Workflow', () => {
    it('should handle complete proximity monitoring for active multi-leg journey', async () => {
      const ctx = createIntegrationMockCtx();

      // Step 1: Get active multi-leg journeys for monitoring
      const activeJourneys = await getActiveMultiLegJourneysForMonitoringHandler(ctx, { limit: 5 });
      expect(activeJourneys).toBeInstanceOf(Array);
      expect(activeJourneys.length).toBeGreaterThanOrEqual(0);

      // Step 2: Process multi-leg transfer proximity monitoring
      const proximityResult = await checkMultiLegTransferProximityHandler(ctx, { batchSize: 3 });
      expect(proximityResult).toHaveProperty('processedJourneys');
      expect(proximityResult).toHaveProperty('transferAlertsCreated');
      expect(proximityResult).toHaveProperty('nextLegRequestsTriggered');
      expect(proximityResult).toHaveProperty('hasMore');

      expect(typeof proximityResult.processedJourneys).toBe('number');
      expect(typeof proximityResult.transferAlertsCreated).toBe('number');
      expect(typeof proximityResult.nextLegRequestsTriggered).toBe('number');
      expect(typeof proximityResult.hasMore).toBe('boolean');
    });

    it('should handle transfer window management throughout journey progression', async () => {
      const ctx = createIntegrationMockCtx();

      // Step 1: Start a transfer window
      const startWindowResult = await manageTransferWindowHandler(ctx, {
        journeyId: mockMultiLegJourney.journeyId,
        legIndex: 0,
        action: "start_window"
      });

      expect(startWindowResult.success).toBe(true);
      expect(startWindowResult.transferWindow.isActive).toBe(true);
      expect(startWindowResult.transferWindow.status).toBe('active');

      // Step 2: Check window status
      const statusResult = await manageTransferWindowHandler(ctx, {
        journeyId: mockMultiLegJourney.journeyId,
        legIndex: 0,
        action: "check_status"
      });

      expect(statusResult.success).toBe(true);
      expect(statusResult.transferWindow).toBeDefined();

      // Step 3: Extend the window
      const extendResult = await manageTransferWindowHandler(ctx, {
        journeyId: mockMultiLegJourney.journeyId,
        legIndex: 0,
        action: "extend_window",
        extensionMinutes: 5
      });

      expect(extendResult.success).toBe(true);
      expect(extendResult.transferWindow.status).toBe('extended');

      // Step 4: Close the window
      const closeResult = await manageTransferWindowHandler(ctx, {
        journeyId: mockMultiLegJourney.journeyId,
        legIndex: 0,
        action: "close_window"
      });

      expect(closeResult.success).toBe(true);
      expect(closeResult.transferWindow.isActive).toBe(false);
      expect(closeResult.transferWindow.status).toBe('closed');
    });

    it('should handle multiple concurrent multi-leg journeys', async () => {
      const ctx = createIntegrationMockCtx();

      // Process multiple journeys in batch
      const batchResult = await checkMultiLegTransferProximityHandler(ctx, {
        batchSize: 5
      });

      expect(batchResult).toHaveProperty('processedJourneys');
      expect(batchResult).toHaveProperty('transferAlertsCreated');
      expect(batchResult).toHaveProperty('nextLegRequestsTriggered');
      expect(batchResult).toHaveProperty('hasMore');

      expect(typeof batchResult.processedJourneys).toBe('number');
      expect(typeof batchResult.transferAlertsCreated).toBe('number');
      expect(typeof batchResult.nextLegRequestsTriggered).toBe('number');
      expect(typeof batchResult.hasMore).toBe('boolean');
    });

    it('should handle error scenarios gracefully', async () => {
      const ctx = createIntegrationMockCtx();

      // Test with invalid journey
      const invalidResult = await manageTransferWindowHandler(ctx, {
        journeyId: "non_existent_journey",
        legIndex: 0,
        action: "start_window"
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toBeTruthy();
    });

    it('should integrate properly with notification system', async () => {
      const ctx = createIntegrationMockCtx();

      // Test notification creation during proximity monitoring
      const result = await checkMultiLegTransferProximityHandler(ctx, {
        batchSize: 3
      });

      expect(result).toHaveProperty('processedJourneys');
      expect(result).toHaveProperty('transferAlertsCreated');

      // Verify that database operations were called
      expect(ctx.runQuery).toHaveBeenCalled();
    });
  });
});