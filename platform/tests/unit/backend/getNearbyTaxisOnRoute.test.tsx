import { getNearbyTaxisForRouteRequestHandler } from "../../../convex/functions/locations/getNearbyTaxisOnRoute";
import { QueryCtx } from "../../../convex/_generated/server";

// Helper to create mock QueryCtx
function createMockQueryCtx(mockRoutes: any[], mockDrivers: any[], mockLocations: any[]): QueryCtx {
  return {
    db: {
      query: jest.fn((tableName: string) => {
        if (tableName === "routes") {
          return {
            collect: () => Promise.resolve(mockRoutes),
          };
        }
        if (tableName === "drivers") {
          return {
            withIndex: () => ({
              collect: () => Promise.resolve(mockDrivers),
            }),
          };
        }
        if (tableName === "locations") {
          return {
            collect: () => Promise.resolve(mockLocations),
          };
        }
        throw new Error(`Unknown table: ${tableName}`);
      }),
    },
  } as unknown as QueryCtx;
}

describe("getNearbyTaxisForRouteRequest", () => {
  it("returns nearby taxis assigned to matching routes", async () => {
    const mockRoutes = [
      {
        _id: "route123",
        stops: [
          { coordinates: [10.0, 10.0], id: "stop1", name: "Start", order: 1 },
          { coordinates: [20.0, 20.0], id: "stop2", name: "End", order: 2 },
        ],
      },
    ];

    const mockDrivers = [
      {
        userId: "driver1",
        assignedRoute: "route123",
      },
    ];

    const mockLocations = [
      {
        userId: "driver1",
        latitude: 10.001,  // Close to passenger start location
        longitude: 10.001,
        role: "driver",
      },
    ];

    const ctx = createMockQueryCtx(mockRoutes, mockDrivers, mockLocations);

    const result = await getNearbyTaxisForRouteRequestHandler(ctx, {
      passengerLat: 10.0,
      passengerLng: 10.0,
      passengerEndLat: 20.0,
      passengerEndLng: 20.0,
    });

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("driver1");
  });

  it("returns empty when no routes match", async () => {
    const ctx = createMockQueryCtx([], [], []);

    const result = await getNearbyTaxisForRouteRequestHandler(ctx, {
      passengerLat: 10.0,
      passengerLng: 10.0,
      passengerEndLat: 20.0,
      passengerEndLng: 20.0,
    });

    expect(result).toEqual([]);
  });
});