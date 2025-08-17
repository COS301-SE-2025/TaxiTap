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
      null: jest.fn(() => ({})),
    },
  }));
  
  const { createMutationCtx } = require('../../mocks/convex-server');
  const { updateWorkAddressHandler } = require('../../../convex/functions/users/UserManagement/updateWorkAddress');
  
  // Mock data for testing
  const mockUser = {
    _id: 'user1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    workAddress: {
      address: '456 Business Ave, Sandton',
      coordinates: {
        latitude: -26.1067,
        longitude: 28.0567
      },
      nickname: 'Office'
    },
    updatedAt: Date.now()
  };
  
  // Mock MutationCtx
  const createMockMutationCtx = (user = mockUser) => {
    const ctx = createMutationCtx();
    
    // Mock db.get for user lookups
    ctx.db.get = jest.fn().mockImplementation((userId) => {
      if (userId === user._id) {
        return Promise.resolve(user);
      }
      return Promise.resolve(null);
    });
    
    // Mock db.patch
    ctx.db.patch = jest.fn().mockImplementation((userId, updateData) => {
      Object.assign(user, updateData);
      return Promise.resolve();
    });
    
    return ctx;
  };
  
  describe('updateWorkAddressHandler', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should successfully update work address with all fields', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '789 New Office St, Pretoria',
          coordinates: {
            latitude: -25.7479,
            longitude: 28.2293
          },
          nickname: 'New Office'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        workAddress: {
          address: '789 New Office St, Pretoria',
          coordinates: {
            latitude: -25.7479,
            longitude: 28.2293
          },
          nickname: 'New Office'
        },
        updatedAt: expect.any(Number)
      });
  
      expect(result).toEqual({
        id: 'user1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        workAddress: {
          address: '789 New Office St, Pretoria',
          coordinates: {
            latitude: -25.7479,
            longitude: 28.2293
          },
          nickname: 'New Office'
        },
        updatedAt: expect.any(Number)
      });
    });
  
    it('should update work address without nickname', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '789 New Office St, Pretoria',
          coordinates: {
            latitude: -25.7479,
            longitude: 28.2293
          }
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        workAddress: {
          address: '789 New Office St, Pretoria',
          coordinates: {
            latitude: -25.7479,
            longitude: 28.2293
          }
        },
        updatedAt: expect.any(Number)
      });
  
      expect(result.workAddress).toEqual({
        address: '789 New Office St, Pretoria',
        coordinates: {
          latitude: -25.7479,
          longitude: 28.2293
        }
      });
    });
  
    it('should successfully set work address to null', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: null
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        workAddress: null,
        updatedAt: expect.any(Number)
      });
  
      expect(result.workAddress).toBeNull();
    });
  
    it('should throw error if user not found', async () => {
      const ctx = createMockMutationCtx();
      ctx.db.get = jest.fn().mockResolvedValue(null);
  
      const args = {
        userId: 'nonexistent',
        workAddress: {
          address: '789 New Office St, Pretoria',
          coordinates: {
            latitude: -25.7479,
            longitude: 28.2293
          }
        }
      };
  
      await expect(updateWorkAddressHandler(ctx, args)).rejects.toThrow('User not found');
    });
  
    it('should handle coordinates with different precision', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '100 Precise Location, Cape Town',
          coordinates: {
            latitude: -33.92490123,
            longitude: 18.42410987
          },
          nickname: 'Precise Office'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(result.workAddress.coordinates.latitude).toBe(-33.92490123);
      expect(result.workAddress.coordinates.longitude).toBe(18.42410987);
    });
  
    it('should handle edge case coordinates (equator and prime meridian)', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '1 Zero Point, Test Location',
          coordinates: {
            latitude: 0,
            longitude: 0
          },
          nickname: 'Origin Office'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(result.workAddress.coordinates.latitude).toBe(0);
      expect(result.workAddress.coordinates.longitude).toBe(0);
    });
  
    it('should handle negative coordinates correctly', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '555 Southern Office, Port Elizabeth',
          coordinates: {
            latitude: -33.958,
            longitude: 25.619
          },
          nickname: 'Southern Branch'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(result.workAddress.coordinates.latitude).toBe(-33.958);
      expect(result.workAddress.coordinates.longitude).toBe(25.619);
    });
  
    it('should return updated user data with correct structure', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '999 Test St, Durban',
          coordinates: {
            latitude: -29.8587,
            longitude: 31.0218
          },
          nickname: 'Test Office'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('workAddress');
      expect(result).toHaveProperty('updatedAt');
      expect(result.id).toBe('user1');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
    });
  
    it('should handle long address strings', async () => {
      const ctx = createMockMutationCtx();
      const longAddress = 'Suite 1205, Floor 12, Building A, Complex 3, 123 Very Long Street Name Avenue, Sandton City, Johannesburg, Gauteng Province, South Africa';
      
      const args = {
        userId: 'user1',
        workAddress: {
          address: longAddress,
          coordinates: {
            latitude: -26.1067,
            longitude: 28.0567
          },
          nickname: 'Long Address Office'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(result.workAddress.address).toBe(longAddress);
      expect(result.workAddress.nickname).toBe('Long Address Office');
    });
  
    it('should handle special characters in address and nickname', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        workAddress: {
          address: '123 O\'Connor St & Main Ave, Café District',
          coordinates: {
            latitude: -26.1067,
            longitude: 28.0567
          },
          nickname: 'Café & Co-working Space'
        }
      };
  
      const result = await updateWorkAddressHandler(ctx, args);
  
      expect(result.workAddress.address).toBe('123 O\'Connor St & Main Ave, Café District');
      expect(result.workAddress.nickname).toBe('Café & Co-working Space');
    });
  });