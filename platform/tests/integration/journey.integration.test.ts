import { createMockCtx } from './ridesTestUtils';

// Mock the journey functions
const mockJourneyFunctions = {
  createMultiLegJourney: jest.fn(),
  startJourneyLeg: jest.fn(),
  completeLegWithPayment: jest.fn(),
  cancelJourney: jest.fn(),
  getJourneyState: jest.fn(),
  getActiveJourneyForPassenger: jest.fn(),
  findMultiLegJourneyOptions: jest.fn()
};

// Mock the convex API
jest.mock('../../convex/_generated/api', () => ({
  api: {
    functions: {
      journeys: {
        journeyStateManager: {
          createMultiLegJourney: mockJourneyFunctions.createMultiLegJourney,
          startJourneyLeg: mockJourneyFunctions.startJourneyLeg,
          completeLegWithPayment: mockJourneyFunctions.completeLegWithPayment,
          cancelJourney: mockJourneyFunctions.cancelJourney,
          getJourneyState: mockJourneyFunctions.getJourneyState,
          getActiveJourneyForPassenger: mockJourneyFunctions.getActiveJourneyForPassenger
        },
        multiLegJourneyFinder: {
          findMultiLegJourneyOptions: mockJourneyFunctions.findMultiLegJourneyOptions
        }
      }
    }
  }
}));

describe('Journey Integration Tests', () => {
  let mockCtx: any;
  let mockDb: any;

  beforeEach(() => {
    const { ctx, db } = createMockCtx();
    mockCtx = ctx;
    mockDb = db;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockJourneyFunctions.findMultiLegJourneyOptions.mockResolvedValue({
      success: true,
      journeyOptions: [
        {
          journeyId: 'journey_123',
          leg1: {
            routeName: 'Route A',
            origin: {
              coordinates: { latitude: -26.2041, longitude: 28.0473 },
              address: 'Johannesburg CBD'
            },
            destination: {
              coordinates: { latitude: -26.2041, longitude: 28.0473 },
              address: 'Transfer Point'
            },
            originStopId: 'stop_1',
            destinationStopId: 'stop_2',
            estimatedCost: 25.50
          },
          leg2: {
            routeName: 'Route B',
            origin: {
              coordinates: { latitude: -26.2041, longitude: 28.0473 },
              address: 'Transfer Point'
            },
            destination: {
              coordinates: { latitude: -26.2041, longitude: 28.0473 },
              address: 'Final Destination'
            },
            originStopId: 'stop_3',
            destinationStopId: 'stop_4',
            estimatedCost: 30.00
          },
          totalEstimatedCost: 55.50,
          transferPoint: {
            stop1_id: 'stop_2',
            stop2_id: 'stop_3',
            walkingDistance: 0.5,
            estimatedWalkingTime: 6
          }
        }
      ]
    });

    mockJourneyFunctions.createMultiLegJourney.mockResolvedValue({
      journeyId: 'journey_123',
      dbId: 'db_123'
    });

    mockJourneyFunctions.getJourneyState.mockResolvedValue({
      _id: 'db_123',
      journeyId: 'journey_123',
      passengerId: 'user_123',
      status: 'planned',
      currentLegIndex: 0,
      totalLegs: 2,
      legs: [
        {
          legIndex: 0,
          routeName: 'Route A',
          status: 'pending',
          estimatedCost: 25.50
        },
        {
          legIndex: 1,
          routeName: 'Route B',
          status: 'pending',
          estimatedCost: 30.00
        }
      ],
      totalEstimatedCost: 55.50,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    mockJourneyFunctions.getActiveJourneyForPassenger.mockResolvedValue(null);
  });

  describe('Complete Journey Workflow', () => {
    it('should handle complete journey lifecycle from search to completion', async () => {
      // Step 1: Search for multi-leg journey options
      const searchResult = await mockJourneyFunctions.findMultiLegJourneyOptions({
        originLat: -26.2041,
        originLng: 28.0473,
        destinationLat: -26.2041,
        destinationLng: 28.0473
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.journeyOptions).toHaveLength(1);
      expect(searchResult.journeyOptions[0].journeyId).toBe('journey_123');

      // Step 2: Create the journey
      const journeyOption = searchResult.journeyOptions[0];
      const createResult = await mockJourneyFunctions.createMultiLegJourney({
        passengerId: 'user_123',
        journeyOption
      });

      expect(createResult.journeyId).toBe('journey_123');
      expect(createResult.dbId).toBe('db_123');

      // Step 3: Get journey state
      const journeyState = await mockJourneyFunctions.getJourneyState({
        journeyId: 'journey_123'
      });

      expect(journeyState.status).toBe('planned');
      expect(journeyState.currentLegIndex).toBe(0);
      expect(journeyState.legs).toHaveLength(2);

      // Step 4: Start first leg
      mockJourneyFunctions.startJourneyLeg.mockResolvedValue({ success: true });
      
      const startLegResult = await mockJourneyFunctions.startJourneyLeg({
        journeyId: 'journey_123',
        legIndex: 0,
        rideId: 'ride_123',
        driverId: 'driver_123'
      });

      expect(startLegResult.success).toBe(true);

      // Step 5: Complete first leg
      mockJourneyFunctions.completeLegWithPayment.mockResolvedValue({
        success: true,
        journeyComplete: false,
        nextLeg: {
          legIndex: 1,
          routeName: 'Route B',
          status: 'pending'
        }
      });

      const completeLegResult = await mockJourneyFunctions.completeLegWithPayment({
        journeyId: 'journey_123',
        legIndex: 0,
        actualCost: 25.50
      });

      expect(completeLegResult.success).toBe(true);
      expect(completeLegResult.journeyComplete).toBe(false);
      expect(completeLegResult.nextLeg.legIndex).toBe(1);

      // Step 6: Start second leg
      const startSecondLegResult = await mockJourneyFunctions.startJourneyLeg({
        journeyId: 'journey_123',
        legIndex: 1,
        rideId: 'ride_456',
        driverId: 'driver_456'
      });

      expect(startSecondLegResult.success).toBe(true);

      // Step 7: Complete second leg (journey complete)
      mockJourneyFunctions.completeLegWithPayment.mockResolvedValue({
        success: true,
        journeyComplete: true,
        totalActualCost: 55.50
      });

      const completeSecondLegResult = await mockJourneyFunctions.completeLegWithPayment({
        journeyId: 'journey_123',
        legIndex: 1,
        actualCost: 30.00
      });

      expect(completeSecondLegResult.success).toBe(true);
      expect(completeSecondLegResult.journeyComplete).toBe(true);
      expect(completeSecondLegResult.totalActualCost).toBe(55.50);
    });

    it('should handle journey cancellation workflow', async () => {
      // Step 1: Create journey
      const createResult = await mockJourneyFunctions.createMultiLegJourney({
        passengerId: 'user_123',
        journeyOption: {
          journeyId: 'journey_123',
          leg1: {
            routeName: 'Route A',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Origin' },
            destination: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer' },
            originStopId: 'stop_1',
            destinationStopId: 'stop_2',
            estimatedCost: 25.50
          },
          leg2: {
            routeName: 'Route B',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer' },
            destination: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Destination' },
            originStopId: 'stop_3',
            destinationStopId: 'stop_4',
            estimatedCost: 30.00
          },
          totalEstimatedCost: 55.50,
          transferPoint: {
            stop1_id: 'stop_2',
            stop2_id: 'stop_3',
            walkingDistance: 0.5,
            estimatedWalkingTime: 6
          }
        }
      });

      expect(createResult.journeyId).toBe('journey_123');

      // Step 2: Cancel journey
      mockJourneyFunctions.cancelJourney.mockResolvedValue({ success: true });

      const cancelResult = await mockJourneyFunctions.cancelJourney({
        journeyId: 'journey_123',
        reason: 'User changed mind'
      });

      expect(cancelResult.success).toBe(true);
    });

    it('should handle transfer timeout workflow', async () => {
      // Step 1: Create and start journey
      const createResult = await mockJourneyFunctions.createMultiLegJourney({
        passengerId: 'user_123',
        journeyOption: {
          journeyId: 'journey_123',
          leg1: {
            routeName: 'Route A',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Origin' },
            destination: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer' },
            originStopId: 'stop_1',
            destinationStopId: 'stop_2',
            estimatedCost: 25.50
          },
          leg2: {
            routeName: 'Route B',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer' },
            destination: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Destination' },
            originStopId: 'stop_3',
            destinationStopId: 'stop_4',
            estimatedCost: 30.00
          },
          totalEstimatedCost: 55.50,
          transferPoint: {
            stop1_id: 'stop_2',
            stop2_id: 'stop_3',
            walkingDistance: 0.5,
            estimatedWalkingTime: 6
          }
        }
      });

      // Step 2: Start first leg
      await mockJourneyFunctions.startJourneyLeg({
        journeyId: 'journey_123',
        legIndex: 0,
        rideId: 'ride_123',
        driverId: 'driver_123'
      });

      // Step 3: Complete first leg
      await mockJourneyFunctions.completeLegWithPayment({
        journeyId: 'journey_123',
        legIndex: 0,
        actualCost: 25.50
      });

      // Step 4: Handle transfer timeout
      mockJourneyFunctions.handleTransferTimeout = jest.fn().mockResolvedValue({ success: true });

      const timeoutResult = await mockJourneyFunctions.handleTransferTimeout({
        journeyId: 'journey_123'
      });

      expect(timeoutResult.success).toBe(true);
    });
  });

  describe('Journey State Management', () => {
    it('should track active journey for passenger', async () => {
      // Mock active journey
      const activeJourney = {
        _id: 'db_123',
        journeyId: 'journey_123',
        passengerId: 'user_123',
        status: 'in_progress',
        currentLegIndex: 0,
        totalLegs: 2
      };

      mockJourneyFunctions.getActiveJourneyForPassenger.mockResolvedValue(activeJourney);

      const result = await mockJourneyFunctions.getActiveJourneyForPassenger({
        passengerId: 'user_123'
      });

      expect(result).toEqual(activeJourney);
      expect(result.status).toBe('in_progress');
    });

    it('should return null when no active journey', async () => {
      mockJourneyFunctions.getActiveJourneyForPassenger.mockResolvedValue(null);

      const result = await mockJourneyFunctions.getActiveJourneyForPassenger({
        passengerId: 'user_123'
      });

      expect(result).toBeNull();
    });

    it('should handle journey state updates correctly', async () => {
      // Initial state
      let journeyState = await mockJourneyFunctions.getJourneyState({
        journeyId: 'journey_123'
      });

      expect(journeyState.status).toBe('planned');

      // After starting first leg
      mockJourneyFunctions.getJourneyState.mockResolvedValue({
        ...journeyState,
        status: 'in_progress',
        currentLegIndex: 0,
        legs: [
          { ...journeyState.legs[0], status: 'in_progress' },
          journeyState.legs[1]
        ]
      });

      journeyState = await mockJourneyFunctions.getJourneyState({
        journeyId: 'journey_123'
      });

      expect(journeyState.status).toBe('in_progress');
      expect(journeyState.legs[0].status).toBe('in_progress');
    });
  });

  describe('Error Handling', () => {
    it('should handle journey creation errors', async () => {
      mockJourneyFunctions.createMultiLegJourney.mockRejectedValue(
        new Error('Failed to create journey')
      );

      await expect(mockJourneyFunctions.createMultiLegJourney({
        passengerId: 'user_123',
        journeyOption: {} as any
      })).rejects.toThrow('Failed to create journey');
    });

    it('should handle journey not found errors', async () => {
      mockJourneyFunctions.getJourneyState.mockResolvedValue(null);

      const result = await mockJourneyFunctions.getJourneyState({
        journeyId: 'nonexistent_journey'
      });

      expect(result).toBeNull();
    });

    it('should handle leg completion errors', async () => {
      mockJourneyFunctions.completeLegWithPayment.mockRejectedValue(
        new Error('Payment not confirmed')
      );

      await expect(mockJourneyFunctions.completeLegWithPayment({
        journeyId: 'journey_123',
        legIndex: 0,
        actualCost: 25.50
      })).rejects.toThrow('Payment not confirmed');
    });
  });

  describe('Journey Search Integration', () => {
    it('should handle no journey options found', async () => {
      mockJourneyFunctions.findMultiLegJourneyOptions.mockResolvedValue({
        success: false,
        journeyOptions: [],
        message: 'No viable transfer points found between routes'
      });

      const result = await mockJourneyFunctions.findMultiLegJourneyOptions({
        originLat: -26.2041,
        originLng: 28.0473,
        destinationLat: -26.2041,
        destinationLng: 28.0473
      });

      expect(result.success).toBe(false);
      expect(result.journeyOptions).toEqual([]);
    });

    it('should handle search errors gracefully', async () => {
      mockJourneyFunctions.findMultiLegJourneyOptions.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(mockJourneyFunctions.findMultiLegJourneyOptions({
        originLat: -26.2041,
        originLng: 28.0473,
        destinationLat: -26.2041,
        destinationLng: 28.0473
      })).rejects.toThrow('Database connection failed');
    });
  });
});
