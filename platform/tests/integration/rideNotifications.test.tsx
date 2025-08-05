import { describe, it, expect, beforeEach } from "@jest/globals";
import { sendRideNotificationHandler } from "../../convex/functions/notifications/rideNotifications";

describe("sendRideNotificationHandler", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        insert: jest.fn(),
        get: jest.fn(),
      },
      runMutation: jest.fn(),
    };
    jest.clearAllMocks();
  });

  const mockRide = {
    _id: "ride_123",
    rideId: "RIDE123",
    passengerId: "passenger_123",
    driverId: "driver_123",
    status: "requested",
    startLocation: { address: "Start Address" },
    endLocation: { address: "End Address" },
  };

  describe("ride_requested", () => {
    it("sends notification to driver when ride is requested", async () => {
      // Mock the ride query
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_requested",
        driverId: "driver_123"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalled();
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("driver_123");
      expect(callArgs[1].type).toBe("ride_request");
      expect(callArgs[1].title).toBe("New Ride Request");
    });

    it("does not send notification if no driverId provided", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        return Promise.resolve([]);
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_requested"
        // No driverId
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).not.toHaveBeenCalled();
    });
  });

  describe("ride_accepted", () => {
    it("sends notification to passenger when ride is accepted", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_accepted",
        driverId: "driver_123"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalled();
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("passenger_123");
      expect(callArgs[1].type).toBe("ride_accepted");
      expect(callArgs[1].title).toBe("Ride Accepted");
    });
  });

  describe("driver_arrived", () => {
    it("sends urgent notification to passenger when driver arrives", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "driver_arrived"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalled();
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("passenger_123");
      expect(callArgs[1].type).toBe("driver_arrived");
      expect(callArgs[1].title).toBe("Driver Arrived");
      expect(callArgs[1].priority).toBe("urgent");
    });
  });

  describe("ride_started", () => {
    it("sends notification to passenger when ride starts", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_started"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalled();
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("passenger_123");
      expect(callArgs[1].type).toBe("ride_started");
      expect(callArgs[1].title).toBe("Ride Started");
    });
  });

  describe("ride_completed", () => {
    it("sends notifications to both passenger and driver when ride completes", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_completed"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(2);
      const calls = ctx.runMutation.mock.calls;
      expect(calls[0][1].userId).toBe("passenger_123");
      expect(calls[0][1].type).toBe("ride_completed");
      expect(calls[1][1].userId).toBe("driver_123");
      expect(calls[1][1].type).toBe("ride_completed");
    });

    it("only sends passenger notification when no driver is assigned", async () => {
      const rideWithoutDriver = { ...mockRide, driverId: undefined };
      
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(rideWithoutDriver)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_completed"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("passenger_123");
      expect(callArgs[1].type).toBe("ride_completed");
    });
  });

  describe("ride_cancelled", () => {
    it("notifies passenger when driver cancels ride", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_cancelled",
        driverId: "driver_123" // Driver is cancelling
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalled();
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("passenger_123");
      expect(callArgs[1].type).toBe("ride_cancelled");
      expect(callArgs[1].title).toBe("Ride Cancelled");
    });

    it("notifies driver when passenger cancels ride", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_cancelled"
        // No driverId means passenger cancelled
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalled();
      const callArgs = ctx.runMutation.mock.calls[0];
      expect(callArgs[1].userId).toBe("driver_123");
      expect(callArgs[1].type).toBe("ride_cancelled");
      expect(callArgs[1].title).toBe("Ride Cancelled");
    });
  });

  describe("edge cases", () => {
    it("handles notification sending failures", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      ctx.runMutation.mockRejectedValue(new Error("Notification failed"));

      const args = {
        rideId: "RIDE123",
        type: "ride_requested",
        driverId: "driver_123"
      };

      await expect(sendRideNotificationHandler(ctx, args)).rejects.toThrow("Notification failed");
    });
  });

  describe("multiple notifications", () => {
    it("sends all notifications in sequence", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      const args = {
        rideId: "RIDE123",
        type: "ride_completed"
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(2);
    });

    it("stops execution if first notification fails", async () => {
      ctx.db.query.mockImplementation((table: string) => {
        if (table === "rides") {
          return {
            withIndex: () => ({
              first: () => Promise.resolve(mockRide)
            })
          };
        }
        if (table === "notifications") {
          return Promise.resolve([]); // No recent notifications
        }
      });

      ctx.runMutation.mockRejectedValueOnce(new Error("First notification failed"));

      const args = {
        rideId: "RIDE123",
        type: "ride_completed"
      };

      await expect(sendRideNotificationHandler(ctx, args)).rejects.toThrow("First notification failed");
      
      // Should only be called once since the first one failed
      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    });
  });
});