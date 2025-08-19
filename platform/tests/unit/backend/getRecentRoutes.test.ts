import { getPassengerTopRoutesHandler } from "../../../convex/functions/routes/getRecentRoutesHandler";

describe('getPassengerTopRoutesHandler', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        collect: jest.fn(),
      },
    };
  });

  it('returns top 3 routes sorted by usageCount', async () => {
    const mockRoutes = [
      { id: 'r1', usageCount: 5 },
      { id: 'r2', usageCount: 10 },
      { id: 'r3', usageCount: 7 },
      { id: 'r4', usageCount: 3 },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRoutes);

    const result = await getPassengerTopRoutesHandler(mockCtx, 'passenger123');

    expect(result).toEqual([
      { id: 'r2', usageCount: 10 },
      { id: 'r3', usageCount: 7 },
      { id: 'r1', usageCount: 5 },
    ]);
  });

  it('returns fewer than 3 routes if not enough exist', async () => {
    const mockRoutes = [
      { id: 'r1', usageCount: 4 },
      { id: 'r2', usageCount: 2 },
    ];

    mockCtx.db.collect.mockResolvedValue(mockRoutes);

    const result = await getPassengerTopRoutesHandler(mockCtx, 'passenger123');

    expect(result).toEqual([
      { id: 'r1', usageCount: 4 },
      { id: 'r2', usageCount: 2 },
    ]);
  });

  it('returns empty array if no routes found', async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    const result = await getPassengerTopRoutesHandler(mockCtx, 'passenger123');

    expect(result).toEqual([]);
  });

  it('queries with the correct passengerId', async () => {
    mockCtx.db.collect.mockResolvedValue([]);

    await getPassengerTopRoutesHandler(mockCtx, 'passenger123');

    expect(mockCtx.db.query).toHaveBeenCalledWith('passengerRoutes');
    expect(mockCtx.db.withIndex).toHaveBeenCalledWith(
      'by_passenger_last_used',
      expect.any(Function)
    );
    // Test that the query function passed the correct passengerId
    const queryFn = mockCtx.db.withIndex.mock.calls[0][1];
    const mockQ = { eq: jest.fn() };
    queryFn(mockQ);
    expect(mockQ.eq).toHaveBeenCalledWith('passengerId', 'passenger123');
  });
});