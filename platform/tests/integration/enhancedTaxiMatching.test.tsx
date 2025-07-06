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

  it("should find available taxis on matching routes successfully", async () => {
    // Mock routes query
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([mockRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      if (table === "drivers") {
        return {
          withIndex: () => ({
            collect: () => Promise.resolve([mockDriver])
          })
        };
      }
      if (table === "locations") {
        return {
          collect: () => Promise.resolve([mockLocation])
        };
      }
      if (table === "taxis") {
        return {
          withIndex: () => ({
            first: () => Promise.resolve(mockTaxi)
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    // Mock user lookup
    ctx.db.get.mockResolvedValue(mockUser);

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(1);
    expect(result.availableTaxis[0]).toMatchObject({
      driverId: mockDriver._id,
      userId: mockUser._id,
      name: mockUser.name,
      phoneNumber: mockUser.phoneNumber,
      vehicleRegistration: mockTaxi.licensePlate,
      vehicleModel: mockTaxi.model,
      vehicleColor: mockTaxi.color,
      vehicleYear: mockTaxi.year,
      isAvailable: mockTaxi.isAvailable,
      numberOfRidesCompleted: mockDriver.numberOfRidesCompleted,
      averageRating: mockDriver.averageRating,
      taxiAssociation: mockDriver.taxiAssociation
    });
    expect(result.availableTaxis[0].routeInfo).toMatchObject({
      routeId: mockRoute.routeId,
      routeName: mockRoute.name,
      taxiAssociation: mockRoute.taxiAssociation,
      fare: mockRoute.fare,
      estimatedDuration: mockRoute.estimatedDuration
    });
    expect(result.totalTaxisFound).toBe(1);
    expect(result.validRoutesFound).toBe(1);
    expect(result.matchingRoutes).toHaveLength(1);
  });

  it("should return empty results when no active routes exist", async () => {
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([])
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.totalRoutesChecked).toBe(0);
    expect(result.validRoutesFound).toBe(0);
    expect(result.message).toContain("No taxi routes found");
  });

  it("should filter out routes that don't pass near origin and destination", async () => {
    const farRoute = {
      ...mockRoute,
      stops: [
        { coordinates: [-26.0000, 29.0000], name: "Far Start", order: 1, id: "stop1" },
        { coordinates: [-26.1000, 29.1000], name: "Far End", order: 2, id: "stop2" }
      ]
    };

    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([farRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.validRoutesFound).toBe(0);
    expect(result.message).toContain("No taxi routes found that pass near both");
  });

  it("should filter out routes without direct connection (reverse order)", async () => {
    const reverseRoute = {
      ...mockRoute,
      stops: [
        { coordinates: [-25.7679, 28.2493], name: "Destination First", order: 1, id: "stop1" },
        { coordinates: [-25.7479, 28.2293], name: "Origin Second", order: 2, id: "stop2" }
      ]
    };

    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([reverseRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.validRoutesFound).toBe(0);
  });

  it("should handle multiple taxis and sort them correctly", async () => {
    const mockDriver2 = {
      _id: "driver_456" as Id<"drivers">,
      userId: "user_456" as Id<"taxiTap_users">,
      assignedRoute: "route_123" as Id<"routes">,
      numberOfRidesCompleted: 200,
      averageRating: 4.8,
      taxiAssociation: "Pretoria Taxi Association"
    };

    const mockLocation2 = {
      userId: "user_456" as Id<"taxiTap_users">,
      latitude: -25.7500, // Further from origin
      longitude: 28.2300,
      role: "driver" as const,
      updatedAt: "2025-06-26T10:00:00Z"
    };

    const mockUser2 = {
      _id: "user_456" as Id<"taxiTap_users">,
      name: "Jane Smith",
      phoneNumber: "+27987654321"
    };

    const mockTaxi2 = {
      _id: "taxi_456" as Id<"taxis">,
      driverId: "driver_456" as Id<"drivers">,
      licensePlate: "XYZ789GP",
      model: "Nissan NV200",
      color: "Blue",
      year: 2021,
      isAvailable: true
    };

    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([mockRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      if (table === "drivers") {
        return {
          withIndex: () => ({
            collect: () => Promise.resolve([mockDriver, mockDriver2])
          })
        };
      }
      if (table === "locations") {
        return {
          collect: () => Promise.resolve([mockLocation, mockLocation2])
        };
      }
      if (table === "taxis") {
        return {
          withIndex: (index: string, fn: any) => ({
            first: () => {
              const query = fn({ eq: (field: string, value: string) => ({ field, value }) });
              if (query.value === "driver_123") {
                return Promise.resolve(mockTaxi);
              }
              if (query.value === "driver_456") {
                return Promise.resolve(mockTaxi2);
              }
              return Promise.resolve(null);
            }
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    ctx.db.get.mockImplementation((id: string) => {
      if (id === "user_123") return Promise.resolve(mockUser);
      if (id === "user_456") return Promise.resolve(mockUser2);
      return Promise.resolve(null);
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(2);
    expect(result.totalTaxisFound).toBe(2);
    
    // Should be sorted by distance to origin (closer first)
    expect(result.availableTaxis[0].name).toBe("John Doe"); // Closer driver
    expect(result.availableTaxis[1].name).toBe("Jane Smith"); // Further driver
    expect(result.availableTaxis[0].distanceToOrigin).toBeLessThan(
      result.availableTaxis[1].distanceToOrigin
    );
  });

  it("should handle no drivers on matching routes", async () => {
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([mockRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      if (table === "drivers") {
        return {
          withIndex: () => ({
            collect: () => Promise.resolve([]) // No drivers
          })
        };
      }
      if (table === "locations") {
        return {
          collect: () => Promise.resolve([])
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.validRoutesFound).toBe(1); // Route is valid but no drivers
    expect(result.totalTaxisFound).toBe(0);
  });

  it("should handle drivers too far from origin", async () => {
    const farLocation = {
      ...mockLocation,
      latitude: -26.0000, // Very far from origin
      longitude: 29.0000
    };

    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([mockRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      if (table === "drivers") {
        return {
          withIndex: () => ({
            collect: () => Promise.resolve([mockDriver])
          })
        };
      }
      if (table === "locations") {
        return {
          collect: () => Promise.resolve([farLocation])
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.validRoutesFound).toBe(1);
    expect(result.totalTaxisFound).toBe(0);
  });

  it("should handle enriched route stops when available", async () => {
    const enrichedStops = {
      routeId: "R001",
      stops: [
        { coordinates: [-25.7479, 28.2293], name: "Enhanced Central", order: 1, id: "stop1" },
        { coordinates: [-25.7679, 28.2493], name: "Enhanced Hatfield", order: 2, id: "stop2" }
      ]
    };

    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([mockRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(enrichedStops)
          })
        };
      }
      if (table === "drivers") {
        return {
          withIndex: () => ({
            collect: () => Promise.resolve([mockDriver])
          })
        };
      }
      if (table === "locations") {
        return {
          collect: () => Promise.resolve([mockLocation])
        };
      }
      if (table === "taxis") {
        return {
          withIndex: () => ({
            first: () => Promise.resolve(mockTaxi)
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    ctx.db.get.mockResolvedValue(mockUser);

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(1);
    expect(result.availableTaxis[0].routeInfo.closestStartStop?.name).toBe("Enhanced Central");
    expect(result.availableTaxis[0].routeInfo.closestEndStop?.name).toBe("Enhanced Hatfield");
  });

  it("should handle errors gracefully", async () => {
    ctx.db.query.mockImplementation(() => {
      throw new Error("Database connection failed");
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, defaultArgs);

    expect(result.success).toBe(false);
    expect(result.availableTaxis).toHaveLength(0);
    expect(result.message).toContain("Error finding available taxis");
    expect(result.totalTaxisFound).toBe(0);
    expect(result.totalRoutesChecked).toBe(0);
    expect(result.validRoutesFound).toBe(0);
  });

  it("should respect maxResults parameter", async () => {
    const manyDrivers = Array.from({ length: 15 }, (_, i) => ({
      _id: `driver_${i}` as Id<"drivers">,
      userId: `user_${i}` as Id<"taxiTap_users">,
      assignedRoute: "route_123" as Id<"routes">,
      numberOfRidesCompleted: 100 + i,
      averageRating: 4.0 + (i * 0.1),
      taxiAssociation: "Test Association"
    }));

    const manyLocations = Array.from({ length: 15 }, (_, i) => ({
      userId: `user_${i}` as Id<"taxiTap_users">,
      latitude: -25.7480 + (i * 0.0001),
      longitude: 28.2295 + (i * 0.0001),
      role: "driver" as const,
      updatedAt: "2025-06-26T10:00:00Z"
    }));

    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      _id: `user_${i}` as Id<"taxiTap_users">,
      name: `Driver ${i}`,
      phoneNumber: `+2712345678${i}`
    }));

    ctx.db.query.mockImplementation((table: string) => {
      if (table === "routes") {
        return {
          filter: () => ({
            collect: () => Promise.resolve([mockRoute])
          })
        };
      }
      if (table === "enrichedRouteStops") {
        return {
          withIndex: () => ({
            unique: () => Promise.resolve(null)
          })
        };
      }
      if (table === "drivers") {
        return {
          withIndex: () => ({
            collect: () => Promise.resolve(manyDrivers)
          })
        };
      }
      if (table === "locations") {
        return {
          collect: () => Promise.resolve(manyLocations)
        };
      }
      if (table === "taxis") {
        return {
          withIndex: () => ({
            first: () => Promise.resolve(mockTaxi)
          })
        };
      }
      return { collect: () => Promise.resolve([]) };
    });

    ctx.db.get.mockImplementation((id: string) => {
      const index = parseInt(id.split('_')[1]);
      return Promise.resolve(manyUsers[index]);
    });

    const result = await _findAvailableTaxisForJourneyHandler(ctx, {
      ...defaultArgs,
      maxResults: 5
    });

    expect(result.success).toBe(true);
    expect(result.availableTaxis).toHaveLength(5); // Limited by maxResults
    expect(result.totalTaxisFound).toBe(15); // But total found should show all
  });
});