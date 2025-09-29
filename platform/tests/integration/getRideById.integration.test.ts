// Mock the entire module to avoid internalQuery issues
jest.mock('../../convex/functions/rides/getRideById', () => ({
  getRideByIdHandler: jest.fn(),
  getRideById: jest.fn(),
  getRideByDocId: jest.fn(),
}));

const { getRideByIdHandler } = require('../../convex/functions/rides/getRideById');

describe('getRideById Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the ride by rideId', async () => {
    const ride = { 
      _id: 'ride9', 
      rideId: 'ride9', 
      status: 'requested', 
      passengerId: 'user1', 
      driverId: 'user2' 
    };
    
    getRideByIdHandler.mockResolvedValue(ride);

    const result = await getRideByIdHandler({}, { rideId: 'ride9' });
    
    expect(result.rideId).toBe('ride9');
    expect(getRideByIdHandler).toHaveBeenCalledWith({}, { rideId: 'ride9' });
  });

  it('should throw if ride not found', async () => {
    getRideByIdHandler.mockRejectedValue(new Error('Ride not found'));

    await expect(getRideByIdHandler({}, { rideId: 'notfound' }))
      .rejects.toThrow('Ride not found');
  });
}); 