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
  const { updateUserProfileHandler } = require('../../../convex/functions/users/UserManagement/updateUserProfile');
  
  // Mock data for testing
  const mockUser = {
    _id: 'user1',
    name: 'John Doe',
    phoneNumber: '+27123456789',
    email: 'john.doe@example.com',
    profilePicture: 'https://example.com/profile.jpg',
    emergencyContact: {
      name: 'Jane Doe',
      phoneNumber: '+27987654321',
      relationship: 'spouse'
    },
    updatedAt: Date.now()
  };
  
  // Mock MutationCtx
  const createMockMutationCtx = (user = mockUser, existingUsers: any[] = []) => {
    const ctx = createMutationCtx();
    
    // Capture the existingUsers in a closure variable to ensure it's accessible
    const capturedExistingUsers = existingUsers;
    
    // Mock db.get for user lookups
    ctx.db.get = jest.fn().mockImplementation((userId) => {
      if (userId === user._id) {
        return Promise.resolve(user);
      }
      return Promise.resolve(null);
    });
    
    // Mock db.query for checking existing users
    ctx.db.query = jest.fn().mockImplementation((table) => {
      if (table === "taxiTap_users") {
        return {
          withIndex: jest.fn().mockImplementation((index, filterFn) => {
            return {
              first: jest.fn().mockImplementation(() => {
                if (index === "by_phone") {
                  // Mock the query object with eq method
                  const mockQuery: any = {
                    eq: jest.fn().mockImplementation((field, value) => {
                      // Store the value for later use
                      mockQuery.lastValue = value;
                      return mockQuery;
                    })
                  };
                  filterFn(mockQuery);
                  // Find user with matching phone number, excluding the current user
                  const phoneUser = capturedExistingUsers.find(u => 
                    u.phoneNumber === mockQuery.lastValue && u._id !== user._id
                  );

                  return Promise.resolve(phoneUser || null);
                }
                if (index === "by_email") {
                  // Mock the query object with eq method
                  const mockQuery: any = {
                    eq: jest.fn().mockImplementation((field, value) => {
                      // Store the value for later use
                      mockQuery.lastValue = value;
                      return mockQuery;
                    })
                  };
                  filterFn(mockQuery);
                  // Find user with matching email, excluding the current user
                  const emailUser = capturedExistingUsers.find(u => 
                    u.email === mockQuery.lastValue && u._id !== user._id
                  );

                  return Promise.resolve(emailUser || null);
                }
                return Promise.resolve(null);
              })
            };
          })
        };
      }
      return {
        withIndex: jest.fn(() => ({
          first: jest.fn().mockResolvedValue(null)
        }))
      };
    });
    
    // Mock db.patch
    ctx.db.patch = jest.fn().mockImplementation((userId, updateData) => {
      Object.assign(user, updateData);
      return Promise.resolve();
    });
    
    return ctx;
  };
  
  describe('updateUserProfileHandler', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should successfully update user profile with all fields', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: 'john.smith@example.com',
        profilePicture: 'https://example.com/new-profile.jpg',
        emergencyContact: {
          name: 'Mary Smith',
          phoneNumber: '+27444555666',
          relationship: 'sister'
        }
      };
  
      const result = await updateUserProfileHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: 'john.smith@example.com',
        profilePicture: 'https://example.com/new-profile.jpg',
        emergencyContact: {
          name: 'Mary Smith',
          phoneNumber: '+27444555666',
          relationship: 'sister'
        },
        updatedAt: expect.any(Number)
      });
  
      expect(result).toEqual({
        id: 'user1',
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: 'john.smith@example.com',
        profilePicture: 'https://example.com/new-profile.jpg',
        emergencyContact: {
          name: 'Mary Smith',
          phoneNumber: '+27444555666',
          relationship: 'sister'
        },
        updatedAt: expect.any(Number)
      });
    });
  
    it('should update user profile with minimal fields', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: 'john.smith@example.com'
      };
  
      const result = await updateUserProfileHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: 'john.smith@example.com',
        updatedAt: expect.any(Number)
      });
  
      expect(result).toBeDefined();
      expect(result.name).toBe('John Smith');
      expect(result.phoneNumber).toBe('+27111222333');
      expect(result.email).toBe('john.smith@example.com');
    });
  
    it('should throw error if user not found', async () => {
      const ctx = createMockMutationCtx();
      ctx.db.get = jest.fn().mockResolvedValue(null);
  
      const args = {
        userId: 'nonexistent',
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: 'john.smith@example.com'
      };
  
      await expect(updateUserProfileHandler(ctx, args)).rejects.toThrow('User not found');
    });
  
    
  
    
  
    it('should allow updating to same phone number and email', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        name: 'John Smith',
        phoneNumber: '+27123456789', // Same as current
        email: 'john.doe@example.com' // Same as current
      };
  
      const result = await updateUserProfileHandler(ctx, args);
  
      expect(result).toBeDefined();
      expect(result.phoneNumber).toBe('+27123456789');
      expect(result.email).toBe('john.doe@example.com');
    });
  
    it('should handle empty email field', async () => {
      const ctx = createMockMutationCtx();
      const args = {
        userId: 'user1',
        name: 'John Smith',
        phoneNumber: '+27111222333',
        email: ''
      };
  
      const result = await updateUserProfileHandler(ctx, args);
  
      expect(ctx.db.patch).toHaveBeenCalledWith('user1', {
        name: 'John Smith',
        phoneNumber: '+27111222333',
        updatedAt: expect.any(Number)
      });
  
      expect(result).toBeDefined();
      expect(result.name).toBe('John Smith');
      expect(result.phoneNumber).toBe('+27111222333');
    });
  });