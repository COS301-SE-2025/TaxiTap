jest.mock('convex/values', () => ({
  v: {
    string: jest.fn(() => 'string'),
  },
}));

jest.mock('../../../convex/_generated/server', () => ({
  query: jest.fn(),
  QueryCtx: {},
}));

import { getAvailableTaxisHandler } from '../../../convex/functions/taxis/displayTaxis';

// Mock QueryCtx helper
const createMockQueryCtx = () => ({
  db: {
    query: jest.fn(),
    get: jest.fn(),
  },
});

describe('getAvailableTaxis', () => {
  let mockCtx: any;
  let mockQuery: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    mockGet = jest.fn();
    mockCtx = createMockQueryCtx();
    mockCtx.db.query = mockQuery;
    mockCtx.db.get = mockGet;
  });

  it('returns available taxis with driver and user info', async () => {
    const taxis = [
      {
        _id: 'taxi1',
        driverId: 'driver1',
        licensePlate: 'ABC123',
        image: 'http://image.url/taxi1.png',
        capacity: 4,
        model: 'Toyota Prius',
        isAvailable: true,
      },
      {
        _id: 'taxi2',
        driverId: 'driver2',
        licensePlate: 'XYZ789',
        image: null,
        capacity: 6,
        model: 'Honda Odyssey',
        isAvailable: true,
      },
    ];

    mockQuery.mockReturnValue({
      withIndex: (indexName: string, fn: Function) => ({
        collect: jest.fn().mockResolvedValue(taxis),
      }),
    });

    mockGet.mockImplementation((id: string) => {
      switch (id) {
        case 'driver1':
          return Promise.resolve({ userId: 'user1' });
        case 'driver2':
          return Promise.resolve({ userId: 'user2' });
        case 'user1':
          return Promise.resolve({ _id: 'user1', name: 'Alice' });
        case 'user2':
          return Promise.resolve({ _id: 'user2', name: 'Bob' });
        default:
          return Promise.resolve(null);
      }
    });

    const result = await getAvailableTaxisHandler(mockCtx);

    expect(result).toEqual([
      {
        licensePlate: 'ABC123',
        image: 'http://image.url/taxi1.png',
        seats: 4,
        model: 'Toyota Prius',
        driverName: 'Alice',
        userId: 'user1',
      },
      {
        licensePlate: 'XYZ789',
        image: null,
        seats: 6,
        model: 'Honda Odyssey',
        driverName: 'Bob',
        userId: 'user2',
      },
    ]);
  });

  it('skips taxis with missing driver or user', async () => {
    const taxis = [
      { _id: 'taxi1', driverId: 'driver1', licensePlate: 'AAA111', capacity: 4, model: 'Model A', isAvailable: true },
      { _id: 'taxi2', driverId: 'driverMissing', licensePlate: 'BBB222', capacity: 4, model: 'Model B', isAvailable: true },
      { _id: 'taxi3', driverId: 'driver3', licensePlate: 'CCC333', capacity: 4, model: 'Model C', isAvailable: true },
    ];

    mockQuery.mockReturnValue({
      withIndex: () => ({
        collect: jest.fn().mockResolvedValue(taxis),
      }),
    });

    mockGet.mockImplementation((id: string) => {
      switch (id) {
        case 'driver1':
          return Promise.resolve({ userId: 'user1' });
        case 'driverMissing':
          return Promise.resolve(null);
        case 'driver3':
          return Promise.resolve({ userId: 'userMissing' });
        case 'user1':
          return Promise.resolve({ _id: 'user1', name: 'Alice' });
        case 'userMissing':
          return Promise.resolve(null);
        default:
          return Promise.resolve(null);
      }
    });

    const result = await getAvailableTaxisHandler(mockCtx);

    expect(result).toEqual([
      {
        licensePlate: 'AAA111',
        image: null,
        seats: 4,
        model: 'Model A',
        driverName: 'Alice',
        userId: 'user1',
      },
    ]);
  });

  it('returns empty array if no taxis available', async () => {
    mockQuery.mockReturnValue({
      withIndex: () => ({
        collect: jest.fn().mockResolvedValue([]),
      }),
    });

    // For empty taxis, db.get is never called but we can just return null by default
    mockGet.mockImplementation(() => Promise.resolve(null));

    const result = await getAvailableTaxisHandler(mockCtx);

    expect(result).toEqual([]);
  });

  it('throws error if query fails', async () => {
    const error = new Error('DB failure');
    mockQuery.mockImplementation(() => {
      throw error;
    });

    // No need to mock get here as query throws immediately

    await expect(getAvailableTaxisHandler(mockCtx)).rejects.toThrow('DB failure');
  });
});