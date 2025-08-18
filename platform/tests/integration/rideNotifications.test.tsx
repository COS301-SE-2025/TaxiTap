import { sendRideNotificationHandler } from "../../convex/functions/notifications/rideNotifications";
import { Id } from "../../convex/_generated/dataModel";

describe("sendRideNotificationHandler", () => {
  let ctx: any;
  const rideId = "ride_123";
  const passengerId = "passenger1" as Id<"taxiTap_users">;
  const driverId = "driver1" as Id<"taxiTap_users">;
  const mockRide = {
    _id: "ride_doc_id",
    rideId: "ride_123",
    passengerId,
    driverId,
    startLocation: {
      address: "123 Main St, Johannesburg"
    },
    endLocation: {
      address: "456 Oak Ave, Sandton"
    },
    finalFare: 150.50,
    status: "active"
  };

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
      },
      runMutation: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("ride_requested", () => {
    it("sends notification to driver when ride is requested", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_requested",
        driverId,
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("rides");
      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object), // internal.functions.notifications.sendNotifications.sendNotificationInternal
        {
          userId: driverId,
          type: "ride_request",
          title: "New Ride Request",
          message: "New ride request from 123 Main St, Johannesburg to 456 Oak Ave, Sandton",
          priority: "high",
          metadata: { rideId, passengerId }
        }
      );
    });

    it("does not send notification if no driverId provided", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });

      const args = {
        rideId,
        type: "ride_requested",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).not.toHaveBeenCalled();
    });
  });

  describe("ride_accepted", () => {
    it("sends notification to passenger when ride is accepted", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_accepted",
        driverId,
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          userId: passengerId,
          type: "ride_accepted",
          title: "Ride Accepted",
          message: "Your ride has been accepted. Driver is on the way!",
          priority: "high",
          metadata: { rideId, driverId }
        }
      );
    });
  });

  describe("driver_arrived", () => {
    it("sends urgent notification to passenger when driver arrives", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "driver_arrived",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          userId: passengerId,
          type: "driver_arrived",
          title: "Driver Arrived",
          message: "Your driver has arrived at the pickup location.",
          priority: "urgent",
          metadata: { rideId, driverId }
        }
      );
    });
  });

  describe("ride_started", () => {
    it("sends notification to passenger when ride starts", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_started",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          userId: passengerId,
          type: "ride_started",
          title: "Ride Started",
          message: "Your ride has started. Enjoy your journey!",
          priority: "medium",
          metadata: { rideId }
        }
      );
    });
  });

  describe("ride_completed", () => {
    it("sends notifications to both passenger and driver when ride completes", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_completed",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(2);
      
      // Check passenger notification
      expect(ctx.runMutation).toHaveBeenNthCalledWith(1,
        expect.any(Object),
        {
          userId: passengerId,
          type: "ride_completed",
          title: "Ride Completed",
          message: "Your ride has been completed. Thank you for using TaxiTap!",
          priority: "medium",
          metadata: { rideId, amount: 150.50 }
        }
      );

      // Check driver notification
      expect(ctx.runMutation).toHaveBeenNthCalledWith(2,
        expect.any(Object),
        {
          userId: driverId,
          type: "ride_completed",
          title: "Ride Completed",
          message: "Ride completed successfully. Fare: R150.5",
          priority: "medium",
          metadata: { rideId, amount: 150.50 }
        }
      );
    });

    it("only sends passenger notification when no driver is assigned", async () => {
      const rideWithoutDriver = { ...mockRide, driverId: null };
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(rideWithoutDriver),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_completed",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          userId: passengerId,
          type: "ride_completed",
          title: "Ride Completed",
          message: "Your ride has been completed. Thank you for using TaxiTap!",
          priority: "medium",
          metadata: { rideId, amount: 150.50 }
        }
      );
    });
  });

  describe("ride_cancelled", () => {
    it("notifies passenger when driver cancels ride", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_cancelled",
        driverId, // Driver cancelling
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          userId: passengerId,
          type: "ride_cancelled",
          title: "Ride Cancelled",
          message: "Your ride has been cancelled by the driver.",
          priority: "high",
          metadata: { rideId }
        }
      );
    });

    it("notifies driver when passenger cancels ride", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockResolvedValue("notification_id");

      const args = {
        rideId,
        type: "ride_cancelled",
        passengerId, // Passenger cancelling
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
      expect(ctx.runMutation).toHaveBeenCalledWith(
        expect.any(Object),
        {
          userId: driverId,
          type: "ride_cancelled",
          title: "Ride Cancelled",
          message: "The ride has been cancelled by the passenger.",
          priority: "high",
          metadata: { rideId }
        }
      );
    });

    it("does not send notification when no target user can be determined", async () => {
      const rideWithoutDriver = { ...mockRide, driverId: null };
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(rideWithoutDriver),
        }),
      });

      const args = {
        rideId,
        type: "ride_cancelled",
        // No specific canceller provided
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("returns early when ride is not found", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(null),
        }),
      });

      const args = {
        rideId: "nonexistent_ride",
        type: "ride_started",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).not.toHaveBeenCalled();
    });

    it("handles unknown notification type gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });

      const args = {
        rideId,
        type: "unknown_type",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).not.toHaveBeenCalled();
    });

    it("queries rides with correct index and filter", async () => {
      const mockWithIndex = jest.fn().mockReturnValue({
        first: () => Promise.resolve(mockRide),
      });

      ctx.db.query.mockReturnValue({
        withIndex: mockWithIndex,
      });

      const args = {
        rideId,
        type: "ride_started",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.db.query).toHaveBeenCalledWith("rides");
      expect(mockWithIndex).toHaveBeenCalledWith("by_ride_id", expect.any(Function));
    });

    it("handles database errors gracefully", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.reject(new Error("Database error")),
        }),
      });

      const args = {
        rideId,
        type: "ride_started",
      };

      await expect(sendRideNotificationHandler(ctx, args)).rejects.toThrow("Database error");
      expect(ctx.runMutation).not.toHaveBeenCalled();
    });

    it("handles notification sending failures", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      ctx.runMutation.mockRejectedValue(new Error("Notification failed"));

      const args = {
        rideId,
        type: "ride_started",
      };

      await expect(sendRideNotificationHandler(ctx, args)).rejects.toThrow("Notification failed");
    });
  });

  describe("multiple notifications", () => {
    it("sends all notifications in sequence", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      
      // Mock successful responses for both calls
      ctx.runMutation
        .mockResolvedValueOnce("notification_1")
        .mockResolvedValueOnce("notification_2");

      const args = {
        rideId,
        type: "ride_completed",
      };

      await sendRideNotificationHandler(ctx, args);

      expect(ctx.runMutation).toHaveBeenCalledTimes(2);
      
      // Verify the calls were made in sequence
      expect(ctx.runMutation.mock.invocationCallOrder[0]).toBeLessThan(
        ctx.runMutation.mock.invocationCallOrder[1]
      );
    });

    it("stops execution if first notification fails", async () => {
      ctx.db.query.mockReturnValue({
        withIndex: () => ({
          first: () => Promise.resolve(mockRide),
        }),
      });
      
      ctx.runMutation
        .mockRejectedValueOnce(new Error("First notification failed"))
        .mockResolvedValueOnce("notification_2");

      const args = {
        rideId,
        type: "ride_completed",
      };

      await expect(sendRideNotificationHandler(ctx, args)).rejects.toThrow("First notification failed");
      
      // Should only be called once since the first one failed
      expect(ctx.runMutation).toHaveBeenCalledTimes(1);
    });
  });
});