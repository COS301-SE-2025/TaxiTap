import { 
  createMultiLegJourney, 
  startJourneyLeg, 
  completeLegWithPayment, 
  cancelJourney, 
  handleTransferTimeout,
  getJourneyState,
  getActiveJourneyForPassenger,
  cleanupExpiredTransfers
} from '../../../convex/functions/journeys/journeyStateManager';
import { Id } from '../../../convex/_generated/dataModel';

describe('Journey State Manager', () => {
  let mockCtx: any;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn(),
      patch: jest.fn(),
      get: jest.fn(),
      query: jest.fn(() => ({
        withIndex: jest.fn(() => ({
          first: jest.fn(),
          unique: jest.fn(),
          collect: jest.fn()
        }))
      }))
    };

    mockCtx = {
      db: mockDb,
      runMutation: jest.fn(),
      runQuery: jest.fn()
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMultiLegJourney', () => {
    it('should create a new multi-leg journey successfully', async () => {
      const mockJourneyId = 'journey_123';
      const mockDbId = 'db_123';
      
      mockDb.insert.mockResolvedValue(mockDbId);

      const args = {
        passengerId: 'user_123' as Id<'taxiTap_users'>,
        journeyOption: {
          journeyId: mockJourneyId,
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
      };

      const result = await (createMultiLegJourney as any).handler(mockCtx, args);

      expect(mockDb.insert).toHaveBeenCalledWith('multiLegJourneys', expect.objectContaining({
        journeyId: mockJourneyId,
        passengerId: 'user_123',
        status: 'planned',
        currentLegIndex: 0,
        totalLegs: 2,
        totalEstimatedCost: 55.50,
        legs: expect.arrayContaining([
          expect.objectContaining({
            legIndex: 0,
            routeName: 'Route A',
            status: 'pending'
          }),
          expect.objectContaining({
            legIndex: 1,
            routeName: 'Route B',
            status: 'pending'
          })
        ])
      }));

      expect(result).toEqual({
        journeyId: mockJourneyId,
        dbId: mockDbId
      });
    });

    it('should handle database insertion errors', async () => {
      mockDb.insert.mockRejectedValue(new Error('Database error'));

      const args = {
        passengerId: 'user_123' as Id<'taxiTap_users'>,
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
      };

      await expect((createMultiLegJourney as any).handler(mockCtx, args)).rejects.toThrow('Database error');
    });
  });

  describe('startJourneyLeg', () => {
    it('should start a journey leg successfully', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        legs: [
          { legIndex: 0, status: 'pending' },
          { legIndex: 1, status: 'pending' }
        ],
        currentLegIndex: 0,
        status: 'planned'
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);
      mockDb.patch.mockResolvedValue('journey_db_123');

      const args = {
        journeyId: 'journey_123',
        legIndex: 0,
        rideId: 'ride_123' as Id<'rides'>,
        driverId: 'driver_123' as Id<'taxiTap_users'>
      };

      const result = await (startJourneyLeg as any).handler(mockCtx, args);

      expect(mockDb.patch).toHaveBeenCalledWith('journey_db_123', expect.objectContaining({
        status: 'in_progress',
        currentLegIndex: 0,
        legs: expect.arrayContaining([
          expect.objectContaining({
            legIndex: 0,
            status: 'in_progress',
            rideId: 'ride_123',
            driverId: 'driver_123',
            startedAt: expect.any(Number)
          })
        ]),
        startedAt: expect.any(Number)
      }));

      expect(result).toEqual({ success: true });
    });

    it('should throw error if journey not found', async () => {
      mockDb.query().withIndex().unique.mockResolvedValue(null);

      const args = {
        journeyId: 'nonexistent_journey',
        legIndex: 0,
        rideId: 'ride_123' as Id<'rides'>,
        driverId: 'driver_123' as Id<'taxiTap_users'>
      };

      await expect((startJourneyLeg as any).handler(mockCtx, args)).rejects.toThrow('Journey nonexistent_journey not found');
    });
  });

  describe('completeLegWithPayment', () => {
    it('should complete a journey leg successfully', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        legs: [
          { 
            legIndex: 0, 
            status: 'in_progress', 
            rideId: 'ride_123',
            actualCost: undefined
          },
          { legIndex: 1, status: 'pending' }
        ],
        totalLegs: 2,
        totalActualCost: 0
      };

      const mockRide = {
        _id: 'ride_123',
        tripPaid: true,
        amountPaid: 25.50,
        tripId: 'trip_123'
      };

      const mockTrip = {
        _id: 'trip_123',
        fare: 0,
        endTime: 0
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);
      mockDb.get
        .mockResolvedValueOnce(mockRide)
        .mockResolvedValueOnce(mockTrip);
      mockDb.patch.mockResolvedValue('journey_db_123');

      const args = {
        journeyId: 'journey_123',
        legIndex: 0,
        actualCost: 25.50
      };

      const result = await (completeLegWithPayment as any).handler(mockCtx, args);

      // The function makes multiple patch calls - check that journey was updated
      expect(mockDb.patch).toHaveBeenCalledWith('journey_db_123', expect.objectContaining({
        legs: expect.arrayContaining([
          expect.objectContaining({
            legIndex: 0,
            status: 'completed',
            actualCost: 25.50,
            completedAt: expect.any(Number)
          })
        ]),
        totalActualCost: 25.50,
        updatedAt: expect.any(Number)
      }));

      expect(result).toEqual({
        success: true,
        journeyComplete: false,
        nextLeg: {
          legIndex: 1,
          status: "pending"
        }
      });
    });

    it('should handle payment verification and auto-confirm if needed', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        legs: [
          { 
            legIndex: 0, 
            status: 'in_progress', 
            rideId: 'ride_123',
            actualCost: undefined
          }
        ],
        totalLegs: 1,
        totalActualCost: 0
      };

      const mockRide = {
        _id: 'ride_123',
        tripPaid: false,
        amountPaid: 0,
        tripId: 'trip_123'
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);
      mockDb.get
        .mockResolvedValueOnce(mockRide)
        .mockResolvedValueOnce({ _id: 'trip_123', fare: 0, endTime: 0 });
      mockDb.patch.mockResolvedValue('journey_db_123');

      const args = {
        journeyId: 'journey_123',
        legIndex: 0,
        actualCost: 25.50
      };

      const result = await (completeLegWithPayment as any).handler(mockCtx, args);

      // Should auto-confirm payment
      expect(mockDb.patch).toHaveBeenCalledWith('ride_123', expect.objectContaining({
        tripPaid: true,
        amountPaid: 25.50,
        paymentType: 'exact',
        paymentConfirmedAt: expect.any(Number)
      }));

      expect(result.success).toBe(true);
    });

    it('should throw error if payment not confirmed and no actual cost provided', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        legs: [
          { 
            legIndex: 0, 
            status: 'in_progress', 
            rideId: 'ride_123',
            actualCost: undefined
          }
        ],
        totalLegs: 1,
        totalActualCost: 0
      };

      const mockRide = {
        _id: 'ride_123',
        tripPaid: false,
        amountPaid: 0
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);
      mockDb.get.mockResolvedValue(mockRide);

      const args = {
        journeyId: 'journey_123',
        legIndex: 0,
        actualCost: 0
      };

      await expect((completeLegWithPayment as any).handler(mockCtx, args)).rejects.toThrow(
        'Payment must be confirmed before completing this leg of the journey'
      );
    });
  });

  describe('cancelJourney', () => {
    it('should cancel a journey successfully', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        legs: [
          { legIndex: 0, status: 'pending' },
          { legIndex: 1, status: 'pending' }
        ]
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);
      mockDb.patch.mockResolvedValue('journey_db_123');

      const args = {
        journeyId: 'journey_123',
        reason: 'User cancelled'
      };

      const result = await (cancelJourney as any).handler(mockCtx, args);

      expect(mockDb.patch).toHaveBeenCalledWith('journey_db_123', expect.objectContaining({
        status: 'cancelled',
        legs: expect.arrayContaining([
          expect.objectContaining({ legIndex: 0, status: 'cancelled' }),
          expect.objectContaining({ legIndex: 1, status: 'cancelled' })
        ])
      }));

      expect(result).toEqual({ success: true });
    });

    it('should throw error if journey not found', async () => {
      mockDb.query().withIndex().unique.mockResolvedValue(null);

      const args = {
        journeyId: 'nonexistent_journey',
        reason: 'User cancelled'
      };

      await expect((cancelJourney as any).handler(mockCtx, args)).rejects.toThrow('Journey nonexistent_journey not found');
    });
  });

  describe('handleTransferTimeout', () => {
    it('should handle transfer timeout successfully', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        status: 'in_progress'
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);
      mockDb.patch.mockResolvedValue('journey_db_123');

      const args = {
        journeyId: 'journey_123'
      };

      const result = await (handleTransferTimeout as any).handler(mockCtx, args);

      expect(mockDb.patch).toHaveBeenCalledWith('journey_db_123', expect.objectContaining({
        status: 'timeout',
        transferWindowExpiredAt: expect.any(Number)
      }));

      expect(result).toEqual({ success: true });
    });
  });

  describe('getJourneyState', () => {
    it('should return journey state if found', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        status: 'in_progress'
      };

      // Set up the mock chain properly
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);

      const args = {
        journeyId: 'journey_123'
      };

      const result = await (getJourneyState as any).handler(mockCtx, args);

      expect(result).toEqual(mockJourney);
    });

    it('should return null if journey not found', async () => {
      mockDb.query().withIndex().unique.mockResolvedValue(null);

      const args = {
        journeyId: 'nonexistent_journey'
      };

      const result = await (getJourneyState as any).handler(mockCtx, args);

      expect(result).toBeNull();
    });
  });

  describe('getActiveJourneyForPassenger', () => {
    it('should return active journey if found', async () => {
      const mockActiveJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        status: 'in_progress'
      };

      // Set up the mock chain properly for multiple calls
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          first: jest.fn()
            .mockResolvedValueOnce(mockActiveJourney) // in_progress journey
            .mockResolvedValueOnce(null) // planned journey
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);

      const args = {
        passengerId: 'user_123' as Id<'taxiTap_users'>
      };

      const result = await (getActiveJourneyForPassenger as any).handler(mockCtx, args);

      expect(result).toEqual(mockActiveJourney);
    });

    it('should return planned journey if no active journey', async () => {
      const mockPlannedJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        status: 'planned'
      };

      // Set up the mock chain properly for multiple calls
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          first: jest.fn()
            .mockResolvedValueOnce(null) // in_progress journey
            .mockResolvedValueOnce(mockPlannedJourney) // planned journey
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);

      const args = {
        passengerId: 'user_123' as Id<'taxiTap_users'>
      };

      const result = await (getActiveJourneyForPassenger as any).handler(mockCtx, args);

      expect(result).toEqual(mockPlannedJourney);
    });

    it('should return null if no active or planned journey', async () => {
      // Set up the mock chain properly for multiple calls
      const mockQueryChain = {
        withIndex: jest.fn().mockReturnValue({
          first: jest.fn()
            .mockResolvedValueOnce(null) // in_progress journey
            .mockResolvedValueOnce(null) // planned journey
        })
      };
      mockDb.query.mockReturnValue(mockQueryChain);

      const args = {
        passengerId: 'user_123' as Id<'taxiTap_users'>
      };

      const result = await (getActiveJourneyForPassenger as any).handler(mockCtx, args);

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredTransfers', () => {
    it('should return disabled status for manual flow', async () => {
      const result = await (cleanupExpiredTransfers as any).handler(mockCtx, {});

      expect(result).toEqual({
        cleanedCount: 0,
        disabled: true,
        reason: 'Manual multi-leg flow active'
      });
    });
  });
});
