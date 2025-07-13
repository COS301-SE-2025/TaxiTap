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
  const { updateHomeAddressHandler } = require('../../../convex/functions/users/UserManagement/updateHomeAddress');
  
  // Mock data for testing
  const mockUser = {
    _id: 'user1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    homeAddress: {
      address: '123 Main St, Johannesburg',
      coordinates: {
        latitude: -26.2041,
        longitude: 28.0473
      },
      nickname: 'Home'
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
  
  describe('updateHomeAddressHandler', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should successfully update home address with all fields', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '456 New Home St, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          },
          nickname: 'New Home'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        homeAddress: {
          address: '456 New Home St, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          },
          nickname: 'New Home'
        },
        updatedAt: expect.any(Number)
      });
  
      expect(result).toEqual({
        id: 'user1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        homeAddress: {
          address: '456 New Home St, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          },
          nickname: 'New Home'
        },
        updatedAt: expect.any(Number)
      });
    });
  
    it('should update home address without nickname', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '456 New Home St, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          }
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        homeAddress: {
          address: '456 New Home St, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          }
        },
        updatedAt: expect.any(Number)
      });
  
      expect(result.homeAddress).toEqual({
        address: '456 New Home St, Cape Town',
        coordinates: {
          latitude: -33.9249,
          longitude: 18.4241
        }
      });
    });
  
    it('should successfully set home address to null', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: null
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        homeAddress: null,
        updatedAt: expect.any(Number)
      });
  
      expect(result.homeAddress).toBeNull();
    });
  
    it('should throw error if user not found', async () => {
      const ctx = createMockMutationCtx();
      ctx.db.get = jest.fn().mockResolvedValue(null);
  
      const args = {
        userId: 'nonexistent',
        homeAddress: {
          address: '456 New Home St, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          }
        }
      };
  
      await expect(updateHomeAddressHandler(ctx, args)).rejects.toThrow('User not found');
    });
  
    it('should handle coordinates with different precision', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '789 Precise Location, Pretoria',
          coordinates: {
            latitude: -25.74790123,
            longitude: 28.22930987
          },
          nickname: 'Precise Home'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.coordinates.latitude).toBe(-25.74790123);
      expect(result.homeAddress.coordinates.longitude).toBe(28.22930987);
    });
  
    it('should handle edge case coordinates (equator and prime meridian)', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '1 Zero Point, Test Location',
          coordinates: {
            latitude: 0,
            longitude: 0
          },
          nickname: 'Origin Home'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.coordinates.latitude).toBe(0);
      expect(result.homeAddress.coordinates.longitude).toBe(0);
    });
  
    it('should handle negative coordinates correctly', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '555 Southern Home, Port Elizabeth',
          coordinates: {
            latitude: -33.958,
            longitude: 25.619
          },
          nickname: 'Southern House'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.coordinates.latitude).toBe(-33.958);
      expect(result.homeAddress.coordinates.longitude).toBe(25.619);
    });
  
    it('should return updated user data with correct structure', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '999 Test St, Durban',
          coordinates: {
            latitude: -29.8587,
            longitude: 31.0218
          },
          nickname: 'Test Home'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('homeAddress');
      expect(result).toHaveProperty('updatedAt');
      expect(result.id).toBe('user1');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
    });
  
    it('should handle address updates for different South African cities', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '321 Freedom Ave, Bloemfontein',
          coordinates: {
            latitude: -29.1217,
            longitude: 26.2044
          },
          nickname: 'Family Home'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.address).toBe('321 Freedom Ave, Bloemfontein');
      expect(result.homeAddress.coordinates.latitude).toBe(-29.1217);
      expect(result.homeAddress.coordinates.longitude).toBe(26.2044);
      expect(result.homeAddress.nickname).toBe('Family Home');
    });
  
    it('should handle long address strings', async () => {
      const ctx = createMockMutationCtx();
      const longAddress = 'Unit 15, Block B, Residential Complex, 456 Very Long Residential Street Name, Suburb Area, Cape Town, Western Cape Province, South Africa';
      
      const args = {
        userId: 'user1',
        homeAddress: {
          address: longAddress,
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          },
          nickname: 'Long Address Home'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.address).toBe(longAddress);
      expect(result.homeAddress.nickname).toBe('Long Address Home');
    });
  
    it('should handle special characters in address and nickname', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: '789 O\'Malley St & Rose Ave, Claremont',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          },
          nickname: 'Mom & Dad\'s Place'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.address).toBe('789 O\'Malley St & Rose Ave, Claremont');
      expect(result.homeAddress.nickname).toBe('Mom & Dad\'s Place');
    });
  
    it('should handle apartment/flat addresses', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        homeAddress: {
          address: 'Flat 3B, 15 Hillside Towers, Sea Point, Cape Town',
          coordinates: {
            latitude: -33.9249,
            longitude: 18.4241
          },
          nickname: 'Apartment'
        }
      };
  
      const result = await updateHomeAddressHandler(ctx, args);
  
      expect(result.homeAddress.address).toBe('Flat 3B, 15 Hillside Towers, Sea Point, Cape Town');
      expect(result.homeAddress.nickname).toBe('Apartment');
    });
  
  });