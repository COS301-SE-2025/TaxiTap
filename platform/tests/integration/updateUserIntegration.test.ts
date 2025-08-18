import { updateUserProfileHandler } from '../mocks/convex-functions/users/UserManagement/updateUserProfile';
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

    query: (collection: string) => ({
      withIndex: (indexName: string, filterFn: (q: any) => any) => ({
        first: async () => {
          const users = Object.values(collections[collection]);
          if (indexName === 'by_phone') {
            return users.find((user: any) => 
              filterFn({ eq: (field: string, value: string) => user[field] === value })
            ) ?? null;
          }
          if (indexName === 'by_email') {
            return users.find((user: any) => 
              filterFn({ eq: (field: string, value: string) => user[field] === value })
            ) ?? null;
          }
          return null;
        },
      }),
    }),

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

describe('Integration tests for updateUserProfileHandler', () => {
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
    it('should update basic user information successfully', async () => {
      // Setup: Insert existing user
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        name: 'Jane Smith',
        phoneNumber: '+9876543210',
        email: 'jane@example.com',
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result).toEqual({
        id: userId,
        name: 'Jane Smith',
        phoneNumber: '+9876543210',
        email: 'jane@example.com',
        profilePicture: undefined,
        emergencyContact: undefined,
        updatedAt: expect.any(Number),
      });

      // Verify database was updated
      const updatedUser = await db.get(userId);
      expect(updatedUser.name).toBe('Jane Smith');
      expect(updatedUser.phoneNumber).toBe('+9876543210');
      expect(updatedUser.email).toBe('jane@example.com');
      expect(updatedUser.updatedAt).toBeGreaterThan(1640995200000);
    });

    it('should update profile picture when provided', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        profilePicture: 'https://example.com/profile.jpg',
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result.profilePicture).toBe('https://example.com/profile.jpg');
      
      const updatedUser = await db.get(userId);
      expect(updatedUser.profilePicture).toBe('https://example.com/profile.jpg');
    });

    it('should update emergency contact when provided', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const emergencyContact = {
        name: 'Jane Doe',
        phoneNumber: '+1111111111',
        relationship: 'Spouse',
      };

      const updateArgs = {
        userId,
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        emergencyContact,
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result.emergencyContact).toEqual(emergencyContact);
      
      const updatedUser = await db.get(userId);
      expect(updatedUser.emergencyContact).toEqual(emergencyContact);
    });

    it('should handle optional email correctly', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        name: 'John Doe',
        phoneNumber: '+1234567890',
        // email is optional, so we can omit it
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      // Email should remain unchanged when not provided
      expect(result.email).toBe('john@example.com');
      
      const updatedUser = await db.get(userId);
      expect(updatedUser.email).toBe('john@example.com');
    });

    it('should update all fields when all are provided', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const emergencyContact = {
        name: 'Emergency Contact',
        phoneNumber: '+9999999999',
        relationship: 'Friend',
      };

      const updateArgs = {
        userId,
        name: 'Updated Name',
        phoneNumber: '+5555555555',
        email: 'updated@example.com',
        profilePicture: 'https://example.com/new-profile.jpg',
        emergencyContact,
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result).toEqual({
        id: userId,
        name: 'Updated Name',
        phoneNumber: '+5555555555',
        email: 'updated@example.com',
        profilePicture: 'https://example.com/new-profile.jpg',
        emergencyContact,
        updatedAt: expect.any(Number),
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when user not found', async () => {
      const updateArgs = {
        userId: 'nonexistent' as Id<'taxiTap_users'>,
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
      };

      await expect(updateUserProfileHandler(ctx, updateArgs))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error when phone number is already taken by another user', async () => {
      // Insert two users
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const otherUserId = 'user456' as Id<'taxiTap_users'>;
      db.insert('taxiTap_users', otherUserId, {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phoneNumber: '+9876543210',
        updatedAt: 1640995200000,
      });

      // Try to update first user with second user's phone number
      const updateArgs = {
        userId,
        name: 'John Doe',
        phoneNumber: '+9876543210', // Jane's phone number
        email: 'john@example.com',
      };

      await expect(updateUserProfileHandler(ctx, updateArgs))
        .rejects
        .toThrow('Phone number is already registered to another account');
    });

    it('should throw error when email is already taken by another user', async () => {
      // Insert two users
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const otherUserId = 'user456' as Id<'taxiTap_users'>;
      db.insert('taxiTap_users', otherUserId, {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phoneNumber: '+9876543210',
        updatedAt: 1640995200000,
      });

      // Try to update first user with second user's email
      const updateArgs = {
        userId,
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'jane@example.com', // Jane's email
      };

      await expect(updateUserProfileHandler(ctx, updateArgs))
        .rejects
        .toThrow('Email is already registered to another account');
    });

    it('should allow updating to same phone number (no change)', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        name: 'Updated Name',
        phoneNumber: '+1234567890', // Same phone number
        email: 'john@example.com',
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result.phoneNumber).toBe('+1234567890');
      expect(result.name).toBe('Updated Name');
    });

    it('should allow updating to same email (no change)', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        name: 'Updated Name',
        phoneNumber: '+1234567890',
        email: 'john@example.com', // Same email
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result.email).toBe('john@example.com');
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string email correctly', async () => {
      db.insert('taxiTap_users', userId, {
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        updatedAt: 1640995200000,
      });

      const updateArgs = {
        userId,
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: '', // Empty string
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      // Empty string should not update email
      expect(result.email).toBe('john@example.com');
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

      const updateArgs = {
        userId,
        name: 'Updated Name',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
      };

      const result = await updateUserProfileHandler(ctx, updateArgs);

      expect(result.updatedAt).toBe(mockedNow);
      expect(result.updatedAt).toBeGreaterThan(originalTimestamp);
      
      const updatedUser = await db.get(userId);
      expect(updatedUser.updatedAt).toBe(mockedNow);

      // Restore Date.now
      jest.restoreAllMocks();
    });
  });
});