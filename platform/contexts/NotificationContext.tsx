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
import { useUser } from "./UserContext";
import { useAlerts } from "../contexts/AlertContext";

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  markAsRead: (notificationId: Id<"notifications">) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useUser();
  const userId = user?.id;
  
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appState, setAppState] = useState(AppState.currentState);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Use the new alert system
  const { showGlobalAlert } = useAlerts();

  // Convex mutations and queries
  const registerToken = useMutation(
    api.functions.notifications.registerPushToken.registerPushToken
  );

  const userNotifications = useQuery(
    api.functions.notifications.getNotifications.getNotifications,
    userId ? { userId } : "skip"
  );

  // Calculate unread count from notifications if getUnreadCount doesn't exist
  const unreadCount = userNotifications?.filter(n => !n.isRead).length || 0;

  const markNotificationAsRead = useMutation(
    api.functions.notifications.markAsRead.markAsRead
  );
  
  const markAllNotificationsAsRead = useMutation(
    api.functions.notifications.markAllAsRead.markAllAsRead
  );

  // Track app state
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => subscription?.remove();
  }, []);

  // Setup notifications
  useEffect(() => {
    if (userId && !__DEV__) {
      registerForPushNotifications();
    }

    if (__DEV__) {
      console.log('Skipping notification setup in development/Expo Go');
      return;
    }

    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);

        // Use new alert system instead of old showInAppNotification
        if (appState === "active") {
          showGlobalAlert({
            title: notification.request.content.title || "New Notification",
            message: notification.request.content.body || "",
            type: "info",
            duration: 5000,
            position: "top",
            animation: "slide-down",
            actions: notification.request.content.data?.actionRequired
              ? [
                  {
                    label: "View",
                    onPress: () =>
                      handleNotificationTap(notification.request.content.data),
                    style: "default",
                  },
                ]
              : undefined,
            style: {
              backgroundColor: "#007AFF",
              textColor: "#FFFFFF",
              borderRadius: 12,
            },
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
    };
  }, [userId, appState, showGlobalAlert]);

  // Update notifications from Convex
  useEffect(() => {
    if (userNotifications) {
      setNotifications(userNotifications);
    }
  }, [userNotifications]);

  // Update badge count
  useEffect(() => {
    if (unreadCount !== undefined && !__DEV__) {
      try {
        NotificationService.setBadgeCount(unreadCount);
      } catch (error) {
        console.log('Badge count not supported in Expo Go');
      }
    }
  }, [unreadCount]);

  const registerForPushNotifications = async () => {
    if (__DEV__) {
      console.log('Skipping push notification registration in Expo Go');
      return;
    }

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
      if (data?.type === "ride_request" && data?.rideId) {
        router.push({
          pathname: "/DriverRequestPage",
          params: { rideId: data.rideId },
        });
        return;
      }

      if (data?.screen) {
        router.push(data.screen as any);
        return;
      }

      router.push("/NotificationsScreen");
    } catch (error) {
      console.error("Error navigating from notification:", error);
      router.push("/");
    }
  };

  const markAsRead = async (notificationId: Id<"notifications">) => {
    if (!userId) return;
    
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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: unreadCount || 0,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
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