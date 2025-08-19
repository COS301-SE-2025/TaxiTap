// Mock Convex validation functions before importing modules
jest.mock('convex/values', () => ({
    v: {
      string: jest.fn(() => ({})),
      union: jest.fn((...validators) => ({ validators })),
      literal: jest.fn((value) => ({ value })),
    },
  }));
  
  const { createMutationCtx } = require('../../mocks/convex-server');
  const { updateTaxiSeatAvailabilityHandler } = require('../../../convex/functions/taxis/updateAvailableSeatsHandler');
  
  // Mock data for testing
  const mockRide = {
    _id: 'ride_123',
    rideId: 'ride_123',
    driverId: 'driver_456',
    status: 'active',
    createdAt: Date.now()
  };
  
  const mockDriverProfile = {
    _id: 'driver_profile_789',
    userId: 'driver_456',
    name: 'John Driver',
    isActive: true,
    createdAt: Date.now()
  };
  
  const mockTaxi = {
    _id: 'taxi_101',
    driverId: 'driver_profile_789',
    capacity: 4,
    licensePlate: 'ABC123GP',
    updatedAt: Date.now()
  };
  
  // Mock MutationCtx with different scenarios
  const createMockMutationCtx = (scenario = 'default') => {
    const ctx = createMutationCtx();
    
    // Mock console.log to avoid cluttering test output
    console.log = jest.fn();
    console.error = jest.fn();
  
    switch (scenario) {
      case 'ride_not_found':
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(null)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
  
      case 'ride_no_driver':
        const rideWithoutDriver = { ...mockRide, driverId: null };
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(rideWithoutDriver)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
  
      case 'driver_profile_not_found':
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockRide)
            };
          } else if (table === "drivers") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(null)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
  
      case 'taxi_not_found':
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockRide)
            };
          } else if (table === "drivers") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockDriverProfile)
            };
          } else if (table === "taxis") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(null)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
  
      case 'taxi_zero_capacity':
        const taxiZeroCapacity = { ...mockTaxi, capacity: 0 };
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockRide)
            };
          } else if (table === "drivers") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockDriverProfile)
            };
          } else if (table === "taxis") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(taxiZeroCapacity)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
  
      case 'taxi_null_capacity':
        const taxiNullCapacity = { ...mockTaxi, capacity: null };
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockRide)
            };
          } else if (table === "drivers") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockDriverProfile)
            };
          } else if (table === "taxis") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(taxiNullCapacity)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
  
      default: // 'default' scenario - everything works correctly
        ctx.db.query = jest.fn().mockImplementation((table) => {
          if (table === "rides") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockRide)
            };
          } else if (table === "drivers") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockDriverProfile)
            };
          } else if (table === "taxis") {
            return {
              withIndex: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockTaxi)
            };
          }
          return { withIndex: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null) };
        });
        break;
    }
  
    // Mock ctx.db.patch for all scenarios
    ctx.db.patch = jest.fn().mockResolvedValue(undefined);
    
    return ctx;
  };
  
  describe('updateTaxiSeatAvailability', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe('Successful scenarios', () => {
      it('should decrease taxi seat availability successfully', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        const result = await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.updatedSeats).toBe(3); // 4 - 1
        expect(result.previousSeats).toBe(4);
        
        // Verify database operations were called correctly
        expect(ctx.db.query).toHaveBeenCalledWith("rides");
        expect(ctx.db.query).toHaveBeenCalledWith("drivers");
        expect(ctx.db.query).toHaveBeenCalledWith("taxis");
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTaxi._id, {
          capacity: 3,
          updatedAt: expect.any(Number)
        });
      });
  
      it('should increase taxi seat availability successfully', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'increase' };
  
        const result = await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.updatedSeats).toBe(5); // 4 + 1
        expect(result.previousSeats).toBe(4);
        
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTaxi._id, {
          capacity: 5,
          updatedAt: expect.any(Number)
        });
      });
  
      it('should handle decrease action with zero capacity (should not go below 0)', async () => {
        const ctx = createMockMutationCtx('taxi_zero_capacity');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        const result = await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.updatedSeats).toBe(0); // Math.max(0, 0 - 1) = 0
        expect(result.previousSeats).toBe(0);
        
        expect(ctx.db.patch).toHaveBeenCalledWith(mockTaxi._id, {
          capacity: 0,
          updatedAt: expect.any(Number)
        });
      });
  
      it('should handle increase action with zero capacity', async () => {
        const ctx = createMockMutationCtx('taxi_zero_capacity');
        const args = { rideId: 'ride_123', action: 'increase' };
  
        const result = await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.updatedSeats).toBe(1); // 0 + 1
        expect(result.previousSeats).toBe(0);
      });
  
      it('should handle null capacity as 0', async () => {
        const ctx = createMockMutationCtx('taxi_null_capacity');
        const args = { rideId: 'ride_123', action: 'increase' };
  
        const result = await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.updatedSeats).toBe(1); // 0 + 1 (null ?? 0)
        expect(result.previousSeats).toBe(0);
      });
    });
  
    describe('Error scenarios', () => {
      it('should throw error when ride is not found', async () => {
        const ctx = createMockMutationCtx('ride_not_found');
        const args = { rideId: 'nonexistent_ride', action: 'decrease' };
  
        await expect(updateTaxiSeatAvailabilityHandler(ctx, args))
          .rejects
          .toThrow('Ride not found');
  
        expect(ctx.db.patch).not.toHaveBeenCalled();
      });
  
      it('should throw error when ride has no assigned driver', async () => {
        const ctx = createMockMutationCtx('ride_no_driver');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await expect(updateTaxiSeatAvailabilityHandler(ctx, args))
          .rejects
          .toThrow('Ride has no assigned driver');
  
        expect(ctx.db.patch).not.toHaveBeenCalled();
      });
  
      it('should throw error when driver profile is not found', async () => {
        const ctx = createMockMutationCtx('driver_profile_not_found');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await expect(updateTaxiSeatAvailabilityHandler(ctx, args))
          .rejects
          .toThrow('Driver profile not found.');
  
        expect(ctx.db.patch).not.toHaveBeenCalled();
      });
  
      it('should throw error when taxi is not found', async () => {
        const ctx = createMockMutationCtx('taxi_not_found');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await expect(updateTaxiSeatAvailabilityHandler(ctx, args))
          .rejects
          .toThrow('Taxi for driver not found.');
  
        expect(ctx.db.patch).not.toHaveBeenCalled();
      });
    });
  
    describe('Database interaction verification', () => {
      it('should query rides table with correct index and parameters', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(ctx.db.query).toHaveBeenCalledWith("rides");
        // Verify the chaining calls would work correctly
        const rideQuery = ctx.db.query("rides");
        expect(rideQuery.withIndex).toBeDefined();
        expect(rideQuery.first).toBeDefined();
      });
  
      it('should query drivers table with correct index', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(ctx.db.query).toHaveBeenCalledWith("drivers");
      });
  
      it('should query taxis table with correct index', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(ctx.db.query).toHaveBeenCalledWith("taxis");
      });
  
      it('should patch taxi with correct data structure', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'increase' };
  
        await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(ctx.db.patch).toHaveBeenCalledWith(
          mockTaxi._id,
          expect.objectContaining({
            capacity: expect.any(Number),
            updatedAt: expect.any(Number)
          })
        );
      });
    });
  
    describe('Logging verification', () => {
      it('should log the correct action and ride ID', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        await updateTaxiSeatAvailabilityHandler(ctx, args);
  
        expect(console.log).toHaveBeenCalledWith(
          'Updating taxi seats: decrease for ride ride_123'
        );
      });
  
      it('should log errors when they occur', async () => {
        const ctx = createMockMutationCtx('ride_not_found');
        const args = { rideId: 'nonexistent_ride', action: 'decrease' };
  
        try {
          await updateTaxiSeatAvailabilityHandler(ctx, args);
        } catch (error) {
          // Expected to throw
        }
  
        expect(console.error).toHaveBeenCalledWith(
          'Error updating taxi seat availability:',
          expect.any(Error)
        );
      });
    });
  
    describe('Edge cases', () => {
      it('should handle both action types correctly', async () => {
        const ctx = createMockMutationCtx('default');
        
        // Test decrease
        const decreaseResult = await updateTaxiSeatAvailabilityHandler(ctx, { 
          rideId: 'ride_123', 
          action: 'decrease' 
        });
        expect(decreaseResult.updatedSeats).toBe(3);
  
        // Reset mocks for second test
        jest.clearAllMocks();
        const ctx2 = createMockMutationCtx('default');
        
        // Test increase
        const increaseResult = await updateTaxiSeatAvailabilityHandler(ctx2, { 
          rideId: 'ride_123', 
          action: 'increase' 
        });
        expect(increaseResult.updatedSeats).toBe(5);
      });
  
      it('should handle updatedAt timestamp correctly', async () => {
        const ctx = createMockMutationCtx('default');
        const args = { rideId: 'ride_123', action: 'decrease' };
  
        const beforeTime = Date.now();
        await updateTaxiSeatAvailabilityHandler(ctx, args);
        const afterTime = Date.now();
  
        const patchCall = ctx.db.patch.mock.calls[0];
        const patchData = patchCall[1];
        
        expect(patchData.updatedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(patchData.updatedAt).toBeLessThanOrEqual(afterTime);
      });
    });
  });