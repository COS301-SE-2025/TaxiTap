import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { NotificationService } from "../services/NotificationService";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Platform, AppState } from "react-native";
import { Id } from "../convex/_generated/dataModel";
import { router } from "expo-router";

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  duration?: number; // Auto-dismiss duration in ms (default: 4000)
  action?: {
    label: string;
    onPress: () => void;
  };
  data?: any; // Additional data for navigation/handling
}

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  inAppNotifications: InAppNotification[];
  markAsRead: (notificationId: Id<"notifications">) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
  showInAppNotification: (
    notification: Omit<InAppNotification, "id" | "timestamp">
  ) => void;
  dismissInAppNotification: (id: string) => void;
  dismissAllInAppNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
  userId?: Id<"taxiTap_users">;
}> = ({ children, userId }) => {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<
    InAppNotification[]
  >([]);
  const [appState, setAppState] = useState(AppState.currentState);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const inAppTimeouts = useRef<Map<string, number>>(new Map());

  // Convex mutations and queries
  const registerToken = useMutation(
    api.functions.notifications.registerPushToken.registerPushToken
  );

  const userNotifications = useQuery(
    api.functions.notifications.getNotifications.getNotifications,
    userId ? { userId } : "skip"
  );

  const unreadCount = useQuery(
    api.functions.notifications.getNotifications.getUnreadCount,
    userId ? { userId } : "skip"
  );

  const markNotificationAsRead = useMutation(
    api.functions.notifications.markAsRead.markAsRead
  );
  const markAllNotificationsAsRead = useMutation(
    api.functions.notifications.markAllAsRead.markAllAsRead
  );

  // Track app state for in-app notifications
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (userId) {
      registerForPushNotifications();
    }

    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);

        // Show in-app popup if app is active
        if (appState === "active") {
          showInAppNotification({
            title: notification.request.content.title || "New Notification",
            message: notification.request.content.body || "",
            type: "info",
            data: notification.request.content.data,
            action: notification.request.content.data?.actionRequired
              ? {
                  label: "View",
                  onPress: () =>
                    handleNotificationTap(notification.request.content.data),
                }
              : undefined,
          });
        }

        refreshNotifications();
      });

    // Listener for when user taps on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        const notificationData = response.notification.request.content.data;
        handleNotificationTap(notificationData);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      // Clear all timeouts
      inAppTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      inAppTimeouts.current.clear();
    };
  }, [userId, appState]);

  useEffect(() => {
    if (userNotifications) {
      setNotifications(userNotifications);
    }
  }, [userNotifications]);

  // Update badge count when unread count changes
  useEffect(() => {
    if (unreadCount !== undefined) {
      NotificationService.setBadgeCount(unreadCount);
    }
  }, [unreadCount]);

  const registerForPushNotifications = async () => {
    try {
      const token = await NotificationService.registerForPushNotifications();
      if (token && userId) {
        setExpoPushToken(token);
        await registerToken({
          userId,
          token,
          platform: Platform.OS as "ios" | "android",
        });
      }
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    }
  };

  const handleNotificationTap = (data: any) => {
    console.log("Handling notification tap with data:", data);

    try {
      // Navigate to ride request page for driver
      if (data?.type === "ride_request" && data?.rideId) {
        router.push({
          pathname: "/DriverRequestPage",
          params: { rideId: data.rideId },
        });
        return;
      }

      // Navigate to specific screen if provided
      if (data?.screen) {
        // Use router.push with proper type casting for dynamic routes
        router.push(data.screen as any);
        return;
      }

      // Default navigation - update this path to match your actual route structure
      router.push("/NotificationsScreen");
    } catch (error) {
      console.error("Error navigating from notification:", error);
      // Fallback navigation
      router.push("/");
    }
  };

  const markAsRead = async (notificationId: Id<"notifications">) => {
    try {
      await markNotificationAsRead({ notificationId });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      await markAllNotificationsAsRead({ userId });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const refreshNotifications = () => {
    console.log("Notifications will auto-refresh due to Convex reactivity");
  };

  // In-app notification functions
  const showInAppNotification = (
    notification: Omit<InAppNotification, "id" | "timestamp">
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: InAppNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration || 4000,
    };

    setInAppNotifications((prev) => [...prev, newNotification]);

    // Auto-dismiss after specified duration
    if (newNotification.duration && newNotification.duration > 0) {
      const timeout = setTimeout(() => {
        dismissInAppNotification(id);
      }, newNotification.duration);

      inAppTimeouts.current.set(id, timeout);
    }
  };

  const dismissInAppNotification = (id: string) => {
    setInAppNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );

    // Clear timeout if exists
    const timeout = inAppTimeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      inAppTimeouts.current.delete(id);
    }
  };

  const dismissAllInAppNotifications = () => {
    setInAppNotifications([]);

    // Clear all timeouts
    inAppTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    inAppTimeouts.current.clear();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: unreadCount || 0,
        inAppNotifications,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        showInAppNotification,
        dismissInAppNotification,
        dismissAllInAppNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};