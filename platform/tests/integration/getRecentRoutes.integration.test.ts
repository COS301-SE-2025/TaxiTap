import { getPassengerTopRoutesHandler } from "../../convex/functions/routes/getRecentRoutesHandler";

describe('getPassengerTopRoutesHandler', () => {
  let ctx: any;
  let passengerId: string;

  beforeEach(() => {
    passengerId = 'passenger123';

    ctx = {
      db: {
        query: jest.fn().mockReturnThis(),
        withIndex: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        collect: jest.fn(),
      },
    };
  });

  it('returns top 3 routes by usageCount', async () => {
    const mockRoutes = [
      { passengerId, routeName: 'Route A', usageCount: 5 },
      { passengerId, routeName: 'Route B', usageCount: 10 },
      { passengerId, routeName: 'Route C', usageCount: 7 },
      { passengerId, routeName: 'Route D', usageCount: 3 },
    ];

    ctx.db.collect.mockResolvedValue(mockRoutes);

    const result = await getPassengerTopRoutesHandler(ctx, passengerId);

    expect(result).toEqual([
      { passengerId, routeName: 'Route B', usageCount: 10 },
      { passengerId, routeName: 'Route C', usageCount: 7 },
      { passengerId, routeName: 'Route A', usageCount: 5 },
    ]);
  });

  it('returns empty array if no routes exist', async () => {
    ctx.db.collect.mockResolvedValue([]);

    const result = await getPassengerTopRoutesHandler(ctx, passengerId);
    expect(result).toEqual([]);
  });

  it('ignores routes for other passengers', async () => {
    const mockRoutes = [
        { passengerId, routeName: 'Route A', usageCount: 5 }, // only include correct passenger
    ];

    ctx.db.collect.mockResolvedValue(mockRoutes);

    const result = await getPassengerTopRoutesHandler(ctx, passengerId);

    expect(result).toEqual([{ passengerId, routeName: 'Route A', usageCount: 5 }]);
  });
});