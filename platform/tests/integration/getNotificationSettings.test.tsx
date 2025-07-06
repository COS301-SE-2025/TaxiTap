import { getNotificationSettingsHandler } from "../../convex/functions/notifications/getNotificationSettings";
import { Id } from "../../convex/_generated/dataModel";

describe("getNotificationSettingsHandler integration", () => {
  let ctx: any;
  const userId = "user_123" as Id<"taxiTap_users">;

  beforeEach(() => {
    ctx = {
      db: {
        query: jest.fn(),
      },
    };
    jest.clearAllMocks();
  });

  it("returns user settings if they exist", async () => {
    const settings = {
      rideUpdates: false,
      promotionalOffers: false,
      systemAlerts: true,
      emergencyNotifications: false,
      routeUpdates: true,
      paymentNotifications: false,
      ratingReminders: true,
      soundEnabled: false,
      vibrationEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "06:00"
    };
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(settings),
      }),
    });

    const result = await getNotificationSettingsHandler(ctx, { userId });
    expect(result).toEqual(settings);
  });

  it("returns default settings if none exist", async () => {
    ctx.db.query.mockReturnValue({
      withIndex: () => ({
        first: () => Promise.resolve(null),
      }),
    });

    const result = await getNotificationSettingsHandler(ctx, { userId });
    expect(result).toEqual({
      rideUpdates: true,
      promotionalOffers: true,
      systemAlerts: true,
      emergencyNotifications: true,
      routeUpdates: true,
      paymentNotifications: true,
      ratingReminders: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00"
    });
  });
});
