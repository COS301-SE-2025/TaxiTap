/**
 * Unit tests for updateUserLocationHandler
 * 
 * These tests ensure that the updateUserLocationHandler:
 * - Deletes existing records when needed
 * - Inserts new location entries correctly
 * - Handles all valid role values
 * 
 * @author Moyahabo Hamese
 */

jest.mock('convex/values', () => ({
    v: {
      id: jest.fn(() => 'id'),
      number: jest.fn(() => 'number'),
      union: jest.fn(() => 'union'),
      literal: jest.fn((val) => val),
    },
  }));
  
  jest.mock('../../../convex/_generated/server', () => {
    const actual = jest.requireActual('../../../convex/_generated/server');
    return {
      ...actual,
      mutation: jest.fn((handlerDef) => handlerDef), // Mock mutation to allow test imports
    };
  });
  
  // Helper function to create a mocked Convex context
  const createMockCtx = () => ({
    db: {
      query: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
    },
  });
  
  // Import the handler function directly for testing
  const { updateUserLocationHandler } = require('../../../convex/functions/locations/updateUserLocationHandler');
  
  describe('updateUserLocationHandler', () => {
    let mockCtx: any;
  
    beforeEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
      mockCtx = createMockCtx();
    });
  
    it('deletes existing location before inserting new one', async () => {
      const userId = 'user123';
      const existingLocation = { _id: 'loc1', userId };
      const latitude = -26.2041;
      const longitude = 28.0473;
      const role = 'driver';
  
      // Simulate query result with existing location
      mockCtx.db.query.mockReturnValue({
        withIndex: (_: any, cb: any) => ({
          first: jest.fn().mockResolvedValue(existingLocation),
        }),
      });
  
      await updateUserLocationHandler(mockCtx, {
        userId,
        latitude,
        longitude,
        role,
      });
  
      // Expect old location to be deleted
      expect(mockCtx.db.delete).toHaveBeenCalledWith('loc1');
  
      // Expect new location to be inserted
      expect(mockCtx.db.insert).toHaveBeenCalledWith('locations', {
        userId,
        latitude,
        longitude,
        role,
        updatedAt: expect.any(Number),
      });
    });
  
    it('inserts new location if no existing location found', async () => {
      const userId = 'user456';
      const latitude = -25.7479;
      const longitude = 28.2293;
      const role = 'passenger';
  
      // Simulate no existing location
      mockCtx.db.query.mockReturnValue({
        withIndex: (_: any, cb: any) => ({
          first: jest.fn().mockResolvedValue(null),
        }),
      });
  
      await updateUserLocationHandler(mockCtx, {
        userId,
        latitude,
        longitude,
        role,
      });
  
      // Expect no deletion
      expect(mockCtx.db.delete).not.toHaveBeenCalled();
  
      // Expect insertion of new location
      expect(mockCtx.db.insert).toHaveBeenCalledWith('locations', {
        userId,
        latitude,
        longitude,
        role,
        updatedAt: expect.any(Number),
      });
    });
  
    it('handles multiple roles (e.g., "both")', async () => {
      const userId = 'user789';
      const latitude = -29.8587;
      const longitude = 31.0218;
      const role = 'both';
  
      mockCtx.db.query.mockReturnValue({
        withIndex: (_: any, cb: any) => ({
          first: jest.fn().mockResolvedValue(null),
        }),
      });
  
      await updateUserLocationHandler(mockCtx, {
        userId,
        latitude,
        longitude,
        role,
      });
  
      // Expect location to be inserted with "both" as role
      expect(mockCtx.db.insert).toHaveBeenCalledWith('locations', {
        userId,
        latitude,
        longitude,
        role: 'both',
        updatedAt: expect.any(Number),
      });
    });
  
    it('throws if insert fails', async () => {
      const userId = 'errorUser';
      const latitude = 0;
      const longitude = 0;
      const role = 'driver';
  
      mockCtx.db.query.mockReturnValue({
        withIndex: (_: any, cb: any) => ({
          first: jest.fn().mockResolvedValue(null),
        }),
      });
  
      // Simulate failure on insert
      mockCtx.db.insert.mockImplementation(() => {
        throw new Error('Insert failed');
      });
  
      // Expect the handler to propagate the insert error
      await expect(updateUserLocationHandler(mockCtx, {
        userId,
        latitude,
        longitude,
        role,
      })).rejects.toThrow('Insert failed');
    });
  });
  