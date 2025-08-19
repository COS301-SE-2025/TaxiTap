import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return token;
  }

  static async schedulePushNotification(
    title: string,
    body: string,
    data: any = {},
    trigger: Notifications.NotificationTriggerInput | null = null
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: trigger || { seconds: 1, repeats: false, type: 'timeInterval' as any },
    });
  }

  static async cancelAllScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  static async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }
} 