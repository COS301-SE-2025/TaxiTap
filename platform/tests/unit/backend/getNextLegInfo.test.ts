import { getNextLegInfo } from '../../../convex/functions/journeys/getNextLegInfo';
import { Id } from '../../../convex/_generated/dataModel';


describe('Get Next Leg Info', () => {
  let mockCtx: any;
  let mockDb: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockDb = {
      query: mockQuery,
      get: jest.fn()
    };

    mockCtx = {
      db: mockDb
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNextLegInfo', () => {
    it('should throw error when journey not found', async () => {
      mockQuery.mockReturnValueOnce({
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(null)
        })
      });

      const args = {
        journeyId: 'nonexistent_journey',
        currentLegIndex: 0
      };

      await expect((getNextLegInfo as any)._handler(mockCtx, args)).rejects.toThrow('Journey nonexistent_journey not found');
    });

    it('should return no next leg when at final leg', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        totalLegs: 2,
        legs: [
          { legIndex: 0, status: 'completed' },
          { legIndex: 1, status: 'in_progress' }
        ],
        currentLegIndex: 1
      };

      mockQuery.mockReturnValueOnce({
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      });

      const args = {
        journeyId: 'journey_123',
        currentLegIndex: 1
      };

      const result = await (getNextLegInfo as any)._handler(mockCtx, args);

      expect(result.hasNextLeg).toBe(false);
      expect(result.message).toBe('This is the final leg of your journey');
    });

    it('should return no next leg when next leg not found', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        totalLegs: 2,
        legs: [
          { legIndex: 0, status: 'in_progress' }
          // Missing leg 1
        ],
        currentLegIndex: 0
      };

      mockQuery.mockReturnValueOnce({
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(mockJourney)
        })
      });

      const args = {
        journeyId: 'journey_123',
        currentLegIndex: 0
      };

      const result = await (getNextLegInfo as any)._handler(mockCtx, args);

      expect(result.hasNextLeg).toBe(false);
      expect(result.message).toBe('Next leg information not found');
    });

    it('should return next leg info with available drivers', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        totalLegs: 2,
        legs: [
          { 
            legIndex: 0, 
            status: 'completed',
            routeName: 'Route A'
          },
          { 
            legIndex: 1, 
            status: 'pending',
            routeName: 'Route B',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer Point' },
            destination: { coordinates: { latitude: -26.1076, longitude: 28.0567 }, address: 'Final Destination' },
            estimatedCost: 25.50,
            originStopId: 'stop_3',
            destinationStopId: 'stop_4'
          }
        ],
        currentLegIndex: 0,
        transferPoint: {
          stop1_id: 'stop_2',
          stop2_id: 'stop_3',
          walkingDistance: 0.5,
          estimatedWalkingTime: 6
        }
      };

      const mockLocations = [
        {
          userId: 'driver_1',
          role: 'driver',
          latitude: -26.2041,
          longitude: 28.0473
        }
      ];

      const mockTaxis = [
        {
          _id: 'taxi_1',
          driverId: 'driver_1',
          isAvailable: true,
          licensePlate: 'ABC123',
          model: 'Toyota Corolla'
        }
      ];

      const mockRoute = {
        _id: 'route_1',
        routeId: 'route_b',
        name: 'Route B'
      };

      const mockDriver = {
        _id: 'driver_1',
        userId: 'driver_1',
        assignedRoute: 'route_1',
        taxiAssociation: 'Association B'
      };

      const mockUser = {
        _id: 'driver_1',
        name: 'John Doe',
        phoneNumber: '1234567890'
      };

      // Set up multiple mock calls in sequence
      mockQuery
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            unique: jest.fn().mockResolvedValue(mockJourney)
          })
        })
        .mockReturnValueOnce({
          collect: jest.fn().mockResolvedValue(mockLocations)
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockTaxis)
          })
        })
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockRoute)
          })
        });

      mockDb.get
        .mockResolvedValueOnce(mockDriver)
        .mockResolvedValueOnce(mockUser);

      const args = {
        journeyId: 'journey_123',
        currentLegIndex: 0
      };

      const result = await (getNextLegInfo as any)._handler(mockCtx, args);

      expect(result.hasNextLeg).toBe(true);
      expect(result.nextLeg.legIndex).toBe(1);
      expect(result.nextLeg.routeName).toBe('Route B');
      expect(result.availableDrivers).toHaveLength(1);
      expect(result.availableDrivers[0].driverId).toBe('driver_1');
    });

    it('should return next leg info without drivers when route not found', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        totalLegs: 2,
        legs: [
          { 
            legIndex: 0, 
            status: 'completed',
            routeName: 'Route A'
          },
          { 
            legIndex: 1, 
            status: 'pending',
            routeName: 'Nonexistent Route',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer Point' },
            destination: { coordinates: { latitude: -26.1076, longitude: 28.0567 }, address: 'Final Destination' },
            estimatedCost: 25.50,
            originStopId: 'stop_3',
            destinationStopId: 'stop_4'
          }
        ],
        currentLegIndex: 0,
        transferPoint: {
          stop1_id: 'stop_2',
          stop2_id: 'stop_3',
          walkingDistance: 0.5,
          estimatedWalkingTime: 6
        }
      };

      // Set up mock query chain properly
      mockQuery
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            unique: jest.fn().mockResolvedValue(mockJourney)
          })
        })
        .mockReturnValueOnce({
          collect: jest.fn().mockResolvedValue([])
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue([])
          })
        })
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(null) // Route not found
          })
        });

      const args = {
        journeyId: 'journey_123',
        currentLegIndex: 0
      };

      const result = await (getNextLegInfo as any)._handler(mockCtx, args);

      expect(result.hasNextLeg).toBe(true);
      expect(result.nextLeg.legIndex).toBe(1);
      expect(result.nextLeg.routeName).toBe('Nonexistent Route');
      expect(result.availableDrivers).toHaveLength(0);
    });

    it('should filter drivers by route assignment', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        totalLegs: 2,
        legs: [
          { 
            legIndex: 0, 
            status: 'completed',
            routeName: 'Route A'
          },
          { 
            legIndex: 1, 
            status: 'pending',
            routeName: 'Route B',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer Point' },
            destination: { coordinates: { latitude: -26.1076, longitude: 28.0567 }, address: 'Final Destination' },
            estimatedCost: 25.50,
            originStopId: 'stop_3',
            destinationStopId: 'stop_4'
          }
        ],
        currentLegIndex: 0,
        transferPoint: {
          stop1_id: 'stop_2',
          stop2_id: 'stop_3',
          walkingDistance: 0.5,
          estimatedWalkingTime: 6
        }
      };

      const mockLocations = [
        {
          userId: 'driver_1',
          role: 'driver',
          latitude: -26.2041,
          longitude: 28.0473
        },
        {
          userId: 'driver_2',
          role: 'driver',
          latitude: -26.2041,
          longitude: 28.0473
        }
      ];

      const mockTaxis = [
        {
          _id: 'taxi_1',
          driverId: 'driver_1',
          isAvailable: true,
          licensePlate: 'ABC123',
          model: 'Toyota Corolla'
        },
        {
          _id: 'taxi_2',
          driverId: 'driver_2',
          isAvailable: true,
          licensePlate: 'XYZ789',
          model: 'Honda Civic'
        }
      ];

      const mockRoute = {
        _id: 'route_1',
        routeId: 'route_b',
        name: 'Route B'
      };

      const mockDriver1 = {
        _id: 'driver_1',
        userId: 'driver_1',
        assignedRoute: 'route_1', // Correct route
        taxiAssociation: 'Association B'
      };

      const mockDriver2 = {
        _id: 'driver_2',
        userId: 'driver_2',
        assignedRoute: 'route_2', // Wrong route
        taxiAssociation: 'Association B'
      };

      const mockUser1 = {
        _id: 'driver_1',
        name: 'John Doe',
        phoneNumber: '1234567890'
      };

      mockQuery
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            unique: jest.fn().mockResolvedValue(mockJourney)
          })
        })
        .mockReturnValueOnce({
          collect: jest.fn().mockResolvedValue(mockLocations)
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockTaxis)
          })
        })
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockRoute)
          })
        });

      mockDb.get
        .mockResolvedValueOnce(mockDriver1)
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockDriver2);

      const args = {
        journeyId: 'journey_123',
        currentLegIndex: 0
      };

      const result = await (getNextLegInfo as any)._handler(mockCtx, args);

      expect(result.hasNextLeg).toBe(true);
      expect(result.availableDrivers).toHaveLength(1); // Only driver_1 should be included
      expect(result.availableDrivers[0].driverId).toBe('driver_1');
    });

    it('should handle missing driver or user profiles gracefully', async () => {
      const mockJourney = {
        _id: 'journey_db_123',
        journeyId: 'journey_123',
        totalLegs: 2,
        legs: [
          { 
            legIndex: 0, 
            status: 'completed',
            routeName: 'Route A'
          },
          { 
            legIndex: 1, 
            status: 'pending',
            routeName: 'Route B',
            origin: { coordinates: { latitude: -26.2041, longitude: 28.0473 }, address: 'Transfer Point' },
            destination: { coordinates: { latitude: -26.1076, longitude: 28.0567 }, address: 'Final Destination' },
            estimatedCost: 25.50,
            originStopId: 'stop_3',
            destinationStopId: 'stop_4'
          }
        ],
        currentLegIndex: 0,
        transferPoint: {
          stop1_id: 'stop_2',
          stop2_id: 'stop_3',
          walkingDistance: 0.5,
          estimatedWalkingTime: 6
        }
      };

      const mockLocations = [
        {
          userId: 'driver_1',
          role: 'driver',
          latitude: -26.2041,
          longitude: 28.0473
        }
      ];

      const mockTaxis = [
        {
          _id: 'taxi_1',
          driverId: 'driver_1',
          isAvailable: true,
          licensePlate: 'ABC123',
          model: 'Toyota Corolla'
        }
      ];

      const mockRoute = {
        _id: 'route_1',
        routeId: 'route_b',
        name: 'Route B'
      };

      const mockDriver = {
        _id: 'driver_1',
        userId: 'driver_1',
        assignedRoute: 'route_1',
        taxiAssociation: 'Association B'
      };

      mockQuery
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            unique: jest.fn().mockResolvedValue(mockJourney)
          })
        })
        .mockReturnValueOnce({
          collect: jest.fn().mockResolvedValue(mockLocations)
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockTaxis)
          })
        })
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockRoute)
          })
        });

      mockDb.get
        .mockResolvedValueOnce(mockDriver)
        .mockResolvedValueOnce(null); // User profile not found

      const args = {
        journeyId: 'journey_123',
        currentLegIndex: 0
      };

      const result = await (getNextLegInfo as any)._handler(mockCtx, args);

      expect(result.hasNextLeg).toBe(true);
      expect(result.availableDrivers).toHaveLength(0); // No drivers should be included due to missing user profile
    });
  });
});