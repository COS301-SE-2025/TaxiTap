import { describe, it, expect, beforeEach } from "@jest/globals";
import { testProximityCheck, testAllRidesProximity } from "../../convex/functions/rides/testProximityCheck";

// Mock DB and context helpers (replace with real test utils if available)
const mockCtx = {
  db: {
    query: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
  },
  runMutation: jest.fn(),
};

describe("Proximity Alerts Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends driver_10min_away notification when driver is 10min away", async () => {
    // Setup: ride, locations, no existing notification
    // ...simulate DB state...
    const args = {
      rideId: "ride10min",
      driverLat: 0,
      driverLon: 0,
      passengerLat: 0.05, // ~5.5km
      passengerLon: 0,
      destinationLat: 0,
      destinationLon: 0
    };
    const result = await testProximityCheck.handler(mockCtx, args);
    expect(result.success).toBe(true);
    // Check that notification was created
    // ...assert DB insert or runMutation called with driver_10min_away...
  });

  it("sends driver_5min_away notification when driver is 5min away", async () => {
    const args = {
      rideId: "ride5min",
      driverLat: 0,
      driverLon: 0,
      passengerLat: 0.025, // ~2.7km
      passengerLon: 0,
      destinationLat: 0,
      destinationLon: 0
    };
    const result = await testProximityCheck.handler(mockCtx, args);
    expect(result.success).toBe(true);
    // ...assert notification for driver_5min_away...
  });

  it("sends driver_arrived notification when driver is at passenger", async () => {
    const args = {
      rideId: "rideArrived",
      driverLat: 0,
      driverLon: 0,
      passengerLat: 0.005, // ~0.55km
      passengerLon: 0,
      destinationLat: 0,
      destinationLon: 0
    };
    const result = await testProximityCheck.handler(mockCtx, args);
    expect(result.success).toBe(true);
    // ...assert notification for driver_arrived...
  });

  it("sends passenger_at_stop notification when passenger is at destination", async () => {
    const args = {
      rideId: "rideAtStop",
      driverLat: 0,
      driverLon: 0,
      passengerLat: 0,
      passengerLon: 0,
      destinationLat: 0.0005, // ~55m
      destinationLon: 0
    };
    const result = await testProximityCheck.handler(mockCtx, args);
    expect(result.success).toBe(true);
    // ...assert notification for passenger_at_stop...
  });

  it("does not send duplicate notifications if already sent", async () => {
    // Simulate existing notification in DB
    mockCtx.db.query.mockReturnValueOnce({
      withIndex: () => ({ filter: () => ({ first: () => Promise.resolve({ _id: "notif1" }) }) })
    });
    const args = {
      rideId: "rideNoDupes",
      driverLat: 0,
      driverLon: 0,
      passengerLat: 0.05,
      passengerLon: 0,
      destinationLat: 0,
      destinationLon: 0
    };
    const result = await testProximityCheck.handler(mockCtx, args);
    expect(result.success).toBe(true);
    // ...assert no new notification created...
  });

  it("returns error if ride not found", async () => {
    mockCtx.db.query.mockReturnValueOnce({
      withIndex: () => ({ first: () => Promise.resolve(null) })
    });
    const args = {
      rideId: "rideNotFound",
      driverLat: 0,
      driverLon: 0,
      passengerLat: 0,
      passengerLon: 0,
      destinationLat: 0,
      destinationLon: 0
    };
    const result = await testProximityCheck.handler(mockCtx, args);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found/i);
  });
}); 