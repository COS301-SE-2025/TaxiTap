import { NotificationService } from '../../../services/NotificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  });

  describe('registerForPushNotifications', () => {
    it('returns token on granted permissions', async () => {
      jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
      jest.spyOn(Notifications, 'setNotificationChannelAsync').mockResolvedValue(undefined as any);
      jest.spyOn(Device, 'isDevice', 'get').mockReturnValue(true);
      jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ status: 'granted' } as any);
      jest.spyOn(Notifications, 'getExpoPushTokenAsync').mockResolvedValue({ data: 'token123' } as any);
      jest.spyOn(Constants, 'expoConfig', 'get').mockReturnValue({ extra: { eas: { projectId: 'pid' } } } as any);
      const token = await NotificationService.registerForPushNotifications();
      expect(token).toBe('token123');
    });
    it('requests permissions if not granted', async () => {
      jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
      jest.spyOn(Notifications, 'setNotificationChannelAsync').mockResolvedValue(undefined as any);
      jest.spyOn(Device, 'isDevice', 'get').mockReturnValue(true);
      jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ status: 'denied' } as any);
      jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ status: 'granted' } as any);
      jest.spyOn(Notifications, 'getExpoPushTokenAsync').mockResolvedValue({ data: 'token456' } as any);
      jest.spyOn(Constants, 'expoConfig', 'get').mockReturnValue({ extra: { eas: { projectId: 'pid' } } } as any);
      const token = await NotificationService.registerForPushNotifications();
      expect(token).toBe('token456');
    });
    it('alerts and returns null if permissions denied', async () => {
      jest.spyOn(Device, 'isDevice', 'get').mockReturnValue(true);
      jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ status: 'denied' } as any);
      jest.spyOn(Notifications, 'requestPermissionsAsync').mockResolvedValue({ status: 'denied' } as any);
      const alertSpy = jest.spyOn(global, 'alert').mockImplementation(() => {});
      const token = await NotificationService.registerForPushNotifications();
      expect(alertSpy).toHaveBeenCalled();
      expect(token).toBeNull();
    });
    it('alerts and returns null if not a physical device', async () => {
      jest.spyOn(Device, 'isDevice', 'get').mockReturnValue(false);
      const alertSpy = jest.spyOn(global, 'alert').mockImplementation(() => {});
      const token = await NotificationService.registerForPushNotifications();
      expect(alertSpy).toHaveBeenCalled();
      expect(token).toBeNull();
    });
  });

  describe('schedulePushNotification', () => {
    it('schedules a notification with default trigger', async () => {
      const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync').mockResolvedValue(undefined as any);
      await NotificationService.schedulePushNotification('title', 'body', { foo: 'bar' }, null);
      expect(scheduleSpy).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.objectContaining({ title: 'title', body: 'body', data: { foo: 'bar' } }),
        trigger: expect.any(Object),
      }));
    });
    it('schedules a notification with custom trigger', async () => {
      const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync').mockResolvedValue(undefined as any);
      const trigger = { seconds: 10, repeats: false };
      await NotificationService.schedulePushNotification('t', 'b', {}, trigger);
      expect(scheduleSpy).toHaveBeenCalledWith(expect.objectContaining({ trigger }));
    });
  });

  describe('cancelAllScheduledNotifications', () => {
    it('calls cancelAllScheduledNotificationsAsync', async () => {
      const cancelSpy = jest.spyOn(Notifications, 'cancelAllScheduledNotificationsAsync').mockResolvedValue(undefined as any);
      await NotificationService.cancelAllScheduledNotifications();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('getBadgeCount', () => {
    it('returns badge count', async () => {
      jest.spyOn(Notifications, 'getBadgeCountAsync').mockResolvedValue(7 as any);
      const count = await NotificationService.getBadgeCount();
      expect(count).toBe(7);
    });
  });

  describe('setBadgeCount', () => {
    it('sets badge count', async () => {
      const setSpy = jest.spyOn(Notifications, 'setBadgeCountAsync').mockResolvedValue(undefined as any);
      await NotificationService.setBadgeCount(5);
      expect(setSpy).toHaveBeenCalledWith(5);
    });
  });
}); 