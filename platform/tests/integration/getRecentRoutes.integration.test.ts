import { getPassengerTopRoutesHandler } from "../../convex/functions/routes/getRecentRoutesHandler";

describe('getPassengerTopRoutesHandler', () => {
  it('returns top 3 routes by usageCount', async () => {
    const passengerId = 'passenger123';
    const mockRoutes = [
      { passengerId, routeName: 'Route A', usageCount: 5 },
      { passengerId, routeName: 'Route B', usageCount: 10 },
      { passengerId, routeName: 'Route C', usageCount: 7 },
      { passengerId, routeName: 'Route D', usageCount: 3 },
    ];

    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              collect: jest.fn(() => Promise.resolve(mockRoutes))
            }))
          }))
        }))
      }
    };

    const result = await getPassengerTopRoutesHandler(ctx as any, passengerId);

    expect(result).toEqual([
      { passengerId, routeName: 'Route B', usageCount: 10 },
      { passengerId, routeName: 'Route C', usageCount: 7 },
      { passengerId, routeName: 'Route A', usageCount: 5 },
    ]);
  });

  it('returns empty array if no routes exist', async () => {
    const passengerId = 'passenger123';
    
    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              collect: jest.fn(() => Promise.resolve([]))
            }))
          }))
        }))
      }
    };

    const result = await getPassengerTopRoutesHandler(ctx as any, passengerId);
    expect(result).toEqual([]);
  });

  it('ignores routes for other passengers', async () => {
    const passengerId = 'passenger123';
    const mockRoutes = [
      { passengerId, routeName: 'Route A', usageCount: 5 },
    ];

    const ctx = {
      db: {
        query: jest.fn(() => ({
          withIndex: jest.fn(() => ({
            order: jest.fn(() => ({
              collect: jest.fn(() => Promise.resolve(mockRoutes))
            }))
          }))
        }))
      }
    };

    const result = await getPassengerTopRoutesHandler(ctx as any, passengerId);

    expect(result).toEqual([{ passengerId, routeName: 'Route A', usageCount: 5 }]);
  });
});