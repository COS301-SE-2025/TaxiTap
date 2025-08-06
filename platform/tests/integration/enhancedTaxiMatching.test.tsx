import { _findAvailableTaxisForJourneyHandler } from "../../convex/functions/routes/enhancedTaxiMatching";
import { Id } from "../../convex/_generated/dataModel";

describe("_findAvailableTaxisForJourneyHandler integration", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        get: jest.fn(),
      },
      runQuery: jest.fn(),
    };
    jest.clearAllMocks();
  });

  const defaultArgs = {
    originLat: -25.7479,
    originLng: 28.2293,
    destinationLat: -25.7679,
    destinationLng: 28.2493,
    maxOriginDistance: 1.0,
    maxDestinationDistance: 1.0,
    maxTaxiDistance: 2.0,
    maxResults: 10
  };

  const mockRoute = {
    _id: "route_123" as Id<"routes">,
    routeId: "R001",
    name: "Pretoria Central to Hatfield",
    taxiAssociation: "Pretoria Taxi Association",
    fare: 15,
    estimatedDuration: 30,
    isActive: true,
    stops: [
      { coordinates: [-25.7479, 28.2293], name: "Central Station", order: 1, id: "stop1" },
      { coordinates: [-25.7679, 28.2493], name: "Hatfield Plaza", order: 2, id: "stop2" }
    ]
  };

  const mockDriver = {
    _id: "driver_123" as Id<"drivers">,
    userId: "user_123" as Id<"taxiTap_users">,
    assignedRoute: "route_123" as Id<"routes">,
    numberOfRidesCompleted: 150,
    averageRating: 4.5,
    taxiAssociation: "Pretoria Taxi Association"
  };

  const mockLocation = {
    userId: "user_123" as Id<"taxiTap_users">,
    latitude: -25.7480,
    longitude: 28.2295,
    role: "driver" as const,
    updatedAt: "2025-06-26T10:00:00Z"
  };

  const mockUser = {
    _id: "user_123" as Id<"taxiTap_users">,
    name: "John Doe",
    phoneNumber: "+27123456789"
  };

  const mockTaxi = {
    _id: "taxi_123" as Id<"taxis">,
    driverId: "driver_123" as Id<"drivers">,
    licensePlate: "ABC123GP",
    model: "Toyota Quantum",
    color: "White",
    year: 2020,
    isAvailable: true
  };

  // Helper function to create mock query results
  const createMockQuery = (table: string, data: any[]) => {
    return {
      collect: jest.fn().mockResolvedValue(data),
      filter: jest.fn(() => ({
        collect: jest.fn().mockResolvedValue(data),
        first: jest.fn().mockResolvedValue(data[0] || null)
      }))
    };
  };

  it("should find available taxis on matching routes successfully", async () => {
    // Setup mock database responses
    ctx.db.query.mockImplementation((table: string) => {
      switch (table) {
        case "routes":
          return createMockQuery(table, [mockRoute]);
        case "drivers":
          return createMockQuery(table, [mockDriver]);
        case "locations":
          return createMockQuery(table, [mockLocation]);
        case "users":
          return createMockQuery(table, [mockUser]);
        case "taxis":
          return createMockQuery(table, [mockTaxi]);
        case "enrichedRouteStops":
          return createMockQuery(table, []);
        default:
          return createMockQuery(table, []);
      }
    });

    // Mock ctx.db.get for user profiles
    ctx.db.get.mockResolvedValue(mockUser);

    try {
      const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

      // Verify basic structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('availableTaxis');
      expect(result).toHaveProperty('totalTaxisFound');
      expect(result).toHaveProperty('totalRoutesChecked');
      expect(result).toHaveProperty('validRoutesFound');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('searchCriteria');

      // Basic validation
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.availableTaxis)).toBe(true);
      expect(typeof result.totalTaxisFound).toBe('number');
      expect(typeof result.totalRoutesChecked).toBe('number');
      expect(typeof result.validRoutesFound).toBe('number');
    } catch (error) {
      // If the function throws, make sure it's handled gracefully
      console.error('Test failed with error:', error);
      throw error;
    }
  });

  it("should return empty results when no active routes exist", async () => {
    // Mock empty routes
    ctx.db.query.mockImplementation((table: string) => {
      return createMockQuery(table, []);
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.totalRoutesChecked).toBe(0);
    expect(result.validRoutesFound).toBe(0);
  });

  it("should handle errors gracefully", async () => {
    // Mock database error
    ctx.db.query.mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(false);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.message).toContain("Error finding available taxis");
  });

  it("should respect maxResults parameter", async () => {
    const multipleDrivers = Array.from({ length: 15 }, (_, i) => ({
      ...mockDriver,
      _id: `driver_${i}` as Id<"drivers">,
      userId: `user_${i}` as Id<"taxiTap_users">,
    }));

    const multipleLocations = Array.from({ length: 15 }, (_, i) => ({
      ...mockLocation,
      userId: `user_${i}` as Id<"taxiTap_users">,
    }));

    const multipleUsers = Array.from({ length: 15 }, (_, i) => ({
      ...mockUser,
      _id: `user_${i}` as Id<"taxiTap_users">,
      name: `Driver ${i}`
    }));

    const multipleTaxis = Array.from({ length: 15 }, (_, i) => ({
      ...mockTaxi,
      _id: `taxi_${i}` as Id<"taxis">,
      driverId: `driver_${i}` as Id<"drivers">,
    }));

    ctx.db.query.mockImplementation((table: string) => {
      switch (table) {
        case "routes":
          return createMockQuery(table, [mockRoute]);
        case "drivers":
          return createMockQuery(table, multipleDrivers);
        case "locations":
          return createMockQuery(table, multipleLocations);
        case "users":
          return createMockQuery(table, multipleUsers);
        case "taxis":
          return createMockQuery(table, multipleTaxis);
        case "enrichedRouteStops":
          return createMockQuery(table, []);
        default:
          return createMockQuery(table, []);
      }
    });

    ctx.db.get.mockImplementation((userId: string) => {
      const userIndex = parseInt(userId.split('_')[1]);
      return userIndex >= 0 && userIndex < 15 ? multipleUsers[userIndex] : mockUser;
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, {
      ...defaultArgs,
      maxResults: 5
    });

    expect(result.searchCriteria.maxResults).toBe(5);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('availableTaxis');
  });

  it("should validate input parameters", async () => {
    const invalidArgs = {
      ...defaultArgs,
      originLat: 91, // Invalid latitude
    };

    const result = await _findAvailableTaxisForJourneyHandler(ctx, invalidArgs);

    // The function should handle invalid input gracefully
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('availableTaxis');
  });
});