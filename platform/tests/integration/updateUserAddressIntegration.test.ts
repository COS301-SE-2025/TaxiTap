import { updateHomeAddressHandler } from '../mocks/convex-functions/users/UserManagement/updateHomeAddress';
import { MutationCtx } from '../../convex/_generated/server';
import { Id } from '../../convex/_generated/dataModel';

// === In-memory simulated database ===
const createMockDatabase = () => {
  const collections: Record<string, Record<string, any>> = {
    taxiTap_users: {},
  };

  return {
    insert: (collection: string, id: string, doc: any) => {
      collections[collection][id] = { _id: id, ...doc };
    },

    get: async (id: string) => {
      const allUsers = Object.values(collections.taxiTap_users);
      return allUsers.find((user: any) => user._id === id) ?? null;
    },

    patch: async (id: string, updates: any) => {
      const user = collections.taxiTap_users[id];
      if (user) {
        // Handle undefined values explicitly
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) {
            delete user[key];
          } else {
            user[key] = value;
          }
        }
      }
    },

    _collections: collections,
  };
};

// MutationCtx Mock ===
const createMockCtx = () => {
  const db = createMockDatabase();
  const ctx: any = {
    db: db as any,
    auth: {} as any,
    storage: {} as any,
    runMutation: async () => undefined,
    runQuery: async () => undefined,
  };
  return { ctx, db };
};

describe('Integration tests for updateHomeAddressHandler', () => {
  let ctx: any;
  let db: any;
  let userId: Id<'taxiTap_users'>;

  beforeEach(() => {
    const mock = createMockCtx();
    ctx = mock.ctx;
    db = mock.db;
    userId = 'user123' as Id<'taxiTap_users'>;
  });

  describe('Successful updates', () => {
    it('should add home address successfully when user has no existing home address', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'Home',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result).toEqual({
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        homeAddress,
        updatedAt: expect.any(Number),
      });

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress).toEqual(homeAddress);
      expect(updatedUser.updatedAt).toBeGreaterThan(1640995200000);
    });

    it('should update existing home address successfully', async () => {
      // Setup: Insert user with existing home address
      const existingHomeAddress = {
        address: '456 Oak Ave, Springfield, IL 62702',
        coordinates: {
          latitude: 39.7900,
          longitude: -89.6600,
        },
        nickname: 'Old Home',
      };

      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        homeAddress: existingHomeAddress,
        updatedAt: 1640995200000,
      });

      const newHomeAddress = {
        address: '789 Pine St, Springfield, IL 62703',
        coordinates: {
          latitude: 39.8000,
          longitude: -89.6700,
        },
        nickname: 'New Home',
      };

      const updateArgs = {
        userId,
        homeAddress: newHomeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result).toEqual({
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        homeAddress: newHomeAddress,
        updatedAt: expect.any(Number),
      });

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress).toEqual(newHomeAddress);
      expect(updatedUser.homeAddress).not.toEqual(existingHomeAddress);
    });

    it('should add home address without nickname (optional field)', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        // nickname is optional and not provided
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.homeAddress).toEqual(homeAddress);
      expect(result.homeAddress!.nickname).toBeUndefined();

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress).toEqual(homeAddress);
      expect(updatedUser.homeAddress.nickname).toBeUndefined();
    });

    it('should delete home address when null is provided', async () => {
      // Setup: Insert user with existing home address
      const existingHomeAddress = {
        address: '456 Oak Ave, Springfield, IL 62702',
        coordinates: {
          latitude: 39.7900,
          longitude: -89.6600,
        },
        nickname: 'Home',
      };

      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        homeAddress: existingHomeAddress,
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        homeAddress: null,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result).toEqual({
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        homeAddress: null,
        updatedAt: expect.any(Number),
      });

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress).toBeNull();
    });

    it('should handle coordinates with high precision', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.781700123456,
          longitude: -89.650100987654,
        },
        nickname: 'Home',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.homeAddress!.coordinates.latitude).toBe(39.781700123456);
      expect(result.homeAddress!.coordinates.longitude).toBe(-89.650100987654);

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress.coordinates).toEqual(homeAddress.coordinates);
    });

    it('should handle address with special characters and long text', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: '123 Main St, Apt #4B, Springfield, IL 62701, USA - Near the shopping center & park',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'My Cozy Home 🏠',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.homeAddress).toEqual(homeAddress);

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress).toEqual(homeAddress);
    });

    it('should update timestamp correctly', async () => {
      const originalTimestamp = 1640995200000;
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: originalTimestamp,
      });

      // Mock Date.now to return a specific timestamp
      const mockedNow = 1640995300000;
      jest.spyOn(Date, 'now').mockReturnValue(mockedNow);

      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'Home',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.updatedAt).toBe(mockedNow);
      expect(result.updatedAt).toBeGreaterThan(originalTimestamp);
      
      const updatedUser = await db.get(userId);
      expect(updatedUser.updatedAt).toBe(mockedNow);

      // Restore Date.now
      jest.restoreAllMocks();
    });
  });

  describe('Error handling', () => {
    it('should throw error when user not found', async () => {
      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'Home',
      };

      const updateArgs = {
        userId: 'nonexistent' as Id<'taxiTap_users'>,
        homeAddress,
      };

      await expect(updateHomeAddressHandler(ctx, updateArgs))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error when user ID is invalid', async () => {
      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'Home',
      };

      const updateArgs = {
        userId: '' as Id<'taxiTap_users'>,
        homeAddress,
      };

      await expect(updateHomeAddressHandler(ctx, updateArgs))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero coordinates (equator/prime meridian)', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: 'Null Island, Atlantic Ocean',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
        nickname: 'Null Island',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.homeAddress!.coordinates.latitude).toBe(0);
      expect(result.homeAddress!.coordinates.longitude).toBe(0);

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress.coordinates).toEqual(homeAddress.coordinates);
    });

    it('should handle negative coordinates', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: 'Southern Hemisphere Location',
        coordinates: {
          latitude: -34.6037,
          longitude: -58.3816,
        },
        nickname: 'Buenos Aires',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.homeAddress!.coordinates.latitude).toBe(-34.6037);
      expect(result.homeAddress!.coordinates.longitude).toBe(-58.3816);

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress.coordinates).toEqual(homeAddress.coordinates);
    });

    it('should handle empty string nickname', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: '',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      expect(result.homeAddress!.nickname).toBe('');

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress.nickname).toBe('');
    });

    it('should preserve other user fields when updating home address', async () => {
      // Setup: Insert user with various fields
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        profilePicture: 'https://example.com/profile.jpg',
        emergencyContact: {
          name: 'Jane Doe',
          phoneNumber: '+1111111111',
          relationship: 'Spouse',
        },
        updatedAt: 1640995200000,
      });

      const homeAddress = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'Home',
      };

      const updateArgs = {
        userId,
        homeAddress,
      };

      const result = await updateHomeAddressHandler(ctx, updateArgs);

      // Verify that only homeAddress and updatedAt were changed
      const updatedUser = await db.get(userId);
      expect(updatedUser.name).toBe('John Doe');
      expect(updatedUser.email).toBe('john@example.com');
      expect(updatedUser.phoneNumber).toBe('+1234567890');
      expect(updatedUser.profilePicture).toBe('https://example.com/profile.jpg');
      expect(updatedUser.emergencyContact).toEqual({
        name: 'Jane Doe',
        phoneNumber: '+1111111111',
        relationship: 'Spouse',
      });
      expect(updatedUser.homeAddress).toEqual(homeAddress);
      expect(updatedUser.updatedAt).toBeGreaterThan(1640995200000);
    });

    it('should handle multiple rapid updates correctly', async () => {
      // Setup: Insert user without home address
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const homeAddress1 = {
        address: '123 Main St, Springfield, IL 62701',
        coordinates: {
          latitude: 39.7817,
          longitude: -89.6501,
        },
        nickname: 'Home 1',
      };

      const homeAddress2 = {
        address: '456 Oak Ave, Springfield, IL 62702',
        coordinates: {
          latitude: 39.7900,
          longitude: -89.6600,
        },
        nickname: 'Home 2',
      };

      // First update
      await updateHomeAddressHandler(ctx, { userId, homeAddress: homeAddress1 });
      
      // Second update immediately after
      const result = await updateHomeAddressHandler(ctx, { userId, homeAddress: homeAddress2 });

      expect(result.homeAddress).toEqual(homeAddress2);

      // Verify database has the latest update
      const updatedUser = await db.get(userId);
      expect(updatedUser.homeAddress).toEqual(homeAddress2);
    });
  });
});