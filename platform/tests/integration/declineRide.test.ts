import { declineRide } from "../../convex/functions/rides/declineRide";
import { declineRideHandler } from "../../convex/functions/rides/declineRideHandler";
import { internal } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

describe("Integration-like: declineRide", () => {
  let dbData: any;
  let mockCtx: any;

  beforeEach(() => {
    dbData = {
      rides: [
        {
          _id: "ride_doc456",
          rideId: "ride_abc123",
          driverId: "user_driver123",
          passengerId: "user_passenger789",
          status: "requested",
        },
      ],
    };

    mockCtx = {
      db: {
        query: (table: string) => ({
          withIndex: (_: any, fn: any) => ({
            first: async () => {
              const rideId = fn({ eq: (field: string, val: string) => val });
              return dbData.rides.find((r: any) => r.rideId === rideId);
            },
          }),
        }),
        patch: jest.fn((id, data) => {
          const index = dbData.rides.findIndex((r: any) => r._id === id);
          if (index !== -1) dbData.rides[index] = { ...dbData.rides[index], ...data };
        }),
      },
      runMutation: jest.fn(),
    };
  });

  const runMutation = async (args: { rideId: string; driverId: Id<"taxiTap_users"> }) => {
    return declineRideHandler(mockCtx, args);
  };

  it("declines a valid ride", async () => {
    const result = await runMutation({
      rideId: "ride_abc123",
      driverId: "user_driver123" as Id<"taxiTap_users">,
    });

    expect(result).toEqual({
      _id: "ride_doc456",
      message: "Ride declined by driver.",
    });

    expect(dbData.rides[0].status).toBe("declined");

    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId: "ride_abc123",
        type: "ride_declined",
        driverId: "user_driver123",
        passengerId: "user_passenger789",
      }
    );
  });

  it("throws error if ride not found", async () => {
    dbData.rides = []; // no rides
    await expect(
      runMutation({
        rideId: "nonexistent_ride",
        driverId: "user_driver123" as Id<"taxiTap_users">,
      })
    ).rejects.toThrow("Ride not found");
  });

  it("throws error if wrong driver", async () => {
    await expect(
      runMutation({
        rideId: "ride_abc123",
        driverId: "some_other_driver" as Id<"taxiTap_users">,
      })
    ).rejects.toThrow("Only the assigned driver can decline this ride");
  });

  it("throws error if ride is not pending", async () => {
    dbData.rides[0].status = "completed";

    await expect(
      runMutation({
        rideId: "ride_abc123",
        driverId: "user_driver123" as Id<"taxiTap_users">,
      })
    ).rejects.toThrow("Ride is not pending");
  });
});