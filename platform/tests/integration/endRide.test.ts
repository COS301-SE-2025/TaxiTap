import { endRideHandler } from "../../convex/functions/rides/endRideHandler";
import { internal } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

describe("Integration-like: endRideHandler", () => {
  let dbData: any;
  let mockCtx: any;

  beforeEach(() => {
    dbData = {
      rides: [
        {
          _id: "ride_doc456",
          rideId: "ride_abc123",
          driverId: "user_driver456",
          passengerId: "user_passenger789",
          status: "in_progress",
          completedAt: null,
        },
      ],
    };

    mockCtx = {
      db: {
        query: (table: string) => ({
          withIndex: (_: any, fn: any) => ({
            first: async () => {
              const rideId = fn({ eq: (_field: string, val: string) => val });
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

  const runMutation = async (args: { rideId: string; userId: Id<"taxiTap_users"> }) => {
    return endRideHandler(mockCtx, args);
  };

  it("throws if ride not found", async () => {
    dbData.rides = [];
    await expect(
      runMutation({
        rideId: "nonexistent_ride",
        userId: "user_passenger789" as Id<"taxiTap_users">,
      })
    ).rejects.toThrow("Ride not found");
  });

  it("throws if user is not the passenger", async () => {
    dbData.rides[0].passengerId = "someone_else";
    await expect(
      runMutation({
        rideId: "ride_abc123",
        userId: "user_passenger789" as Id<"taxiTap_users">,
      })
    ).rejects.toThrow("Only the assigned passenger can end this ride");
  });

  it("throws if ride status is not accepted, started, or in_progress", async () => {
    dbData.rides[0].status = "cancelled";
    await expect(
      runMutation({
        rideId: "ride_abc123",
        userId: "user_passenger789" as Id<"taxiTap_users">,
      })
    ).rejects.toThrow("Ride is not in progress or started");
  });

  it("completes the ride successfully and sends notification", async () => {
    const args = {
      rideId: "ride_abc123",
      userId: "user_passenger789" as Id<"taxiTap_users">,
    };

    const result = await runMutation(args);

    expect(dbData.rides[0].status).toBe("completed");
    expect(dbData.rides[0].completedAt).toEqual(expect.any(Number));

    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      internal.functions.notifications.rideNotifications.sendRideNotification,
      {
        rideId: args.rideId,
        type: "ride_completed",
        driverId: dbData.rides[0].driverId,
        passengerId: args.userId,
      }
    );

    expect(result).toEqual({
      _id: dbData.rides[0]._id,
      message: "Ride completed successfully",
    });
  });
});