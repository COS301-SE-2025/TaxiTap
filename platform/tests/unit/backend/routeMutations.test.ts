import { assignRandomRouteToDriver } from '../../../convex/functions/routes/mutations';
import { Id } from '../../../convex/_generated/dataModel';

describe('Route Mutations', () => {
  let mockCtx: any;
  let mockDb: any;
  let mockQuery: any;

  beforeEach(() => {
    // Create a mock that can handle multiple calls with different return values
    mockQuery = jest.fn();
    
    mockDb = {
      query: mockQuery,
      patch: jest.fn()
    };

    mockCtx = {
      db: mockDb
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignRandomRouteToDriver', () => {
    it('should assign a random route to driver successfully', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          isActive: true
        },
        {
          _id: 'route_2' as Id<'routes'>,
          routeId: 'route_b',
          name: 'Cape Town to Stellenbosch',
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      // Set up mock to return different values for different calls
      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRoutes)
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDriver)
          })
        });

      mockDb.patch.mockResolvedValue('driver_1');

      const result = await (assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association A'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Route assigned successfully');
      expect(result.assignedRoute).toBeDefined();
      expect(mockDb.patch).toHaveBeenCalledWith('driver_1', {
        assignedRoute: expect.any(String),
        taxiAssociation: 'Association A',
        routeAssignedAt: expect.any(Number)
      });
    });

    it('should throw error when no routes found for taxi association', async () => {
      // Mock returns empty array for routes query
      mockQuery.mockReturnValueOnce({
        filter: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue([])
        })
      });

      await expect((assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Nonexistent Association'
      })).rejects.toThrow('No active routes found for taxi association: Nonexistent Association');
    });

    it('should throw error when driver record not found', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      // Mock returns routes but no driver
      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRoutes)
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(null)
          })
        });

      await expect((assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association A'
      })).rejects.toThrow('Driver record not found');
    });

    it('should only consider active routes for assignment', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          isActive: true
        },
        {
          _id: 'route_2' as Id<'routes'>,
          routeId: 'route_b',
          name: 'Cape Town to Stellenbosch',
          taxiAssociation: 'Association A',
          isActive: false // Inactive route
        }
      ];

      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      // Mock returns only active routes (filtered by the function logic)
      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue([mockRoutes[0]]) // Only active route returned
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDriver)
          })
        });

      mockDb.patch.mockResolvedValue('driver_1');

      const result = await (assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association A'
      });

      expect(result.success).toBe(true);
      expect(result.assignedRoute._id).toBe('route_1');
    });

    it('should handle single available route', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRoutes)
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDriver)
          })
        });

      mockDb.patch.mockResolvedValue('driver_1');

      const result = await (assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association A'
      });

      expect(result.success).toBe(true);
      expect(result.assignedRoute._id).toBe('route_1');
    });

    it('should update driver record with correct fields', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRoutes)
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDriver)
          })
        });

      mockDb.patch.mockResolvedValue('driver_1');

      await (assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association A'
      });

      expect(mockDb.patch).toHaveBeenCalledWith('driver_1', {
        assignedRoute: 'route_1',
        taxiAssociation: 'Association A',
        routeAssignedAt: expect.any(Number)
      });
    });

    it('should handle database errors during assignment', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association A',
          isActive: true
        }
      ];

      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRoutes)
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDriver)
          })
        });

      mockDb.patch.mockRejectedValue(new Error('Database error'));

      await expect((assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association A'
      })).rejects.toThrow('Database error');
    });

    it('should handle different taxi associations correctly', async () => {
      const mockRoutes = [
        {
          _id: 'route_1' as Id<'routes'>,
          routeId: 'route_a',
          name: 'Johannesburg to Pretoria',
          taxiAssociation: 'Association B',
          isActive: true
        }
      ];

      const mockDriver = {
        _id: 'driver_1',
        userId: 'user_1' as Id<'taxiTap_users'>,
        assignedRoute: null
      };

      mockQuery
        .mockReturnValueOnce({
          filter: jest.fn().mockReturnValue({
            collect: jest.fn().mockResolvedValue(mockRoutes)
          })
        })
        .mockReturnValueOnce({
          withIndex: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(mockDriver)
          })
        });

      mockDb.patch.mockResolvedValue('driver_1');

      const result = await (assignRandomRouteToDriver as any)._handler(mockCtx, {
        userId: 'user_1' as Id<'taxiTap_users'>,
        taxiAssociation: 'Association B'
      });

      expect(result.success).toBe(true);
      expect(mockDb.patch).toHaveBeenCalledWith('driver_1', {
        assignedRoute: 'route_1',
        taxiAssociation: 'Association B',
        routeAssignedAt: expect.any(Number)
      });
    });
  });
});