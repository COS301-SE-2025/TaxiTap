import { NotificationService } from '../../services/NotificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

describe('NotificationService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  });

  it('registers for push notifications and schedules one end-to-end', async () => {
    jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
    jest.spyOn(Notifications, 'setNotificationChannelAsync').mockResolvedValue(undefined as any);
    jest.spyOn(Device, 'isDevice', 'get').mockReturnValue(true);
    jest.spyOn(Notifications, 'getPermissionsAsync').mockResolvedValue({ status: 'granted' } as any);
    jest.spyOn(Notifications, 'getExpoPushTokenAsync').mockResolvedValue({ data: 'tokenABC' } as any);
    jest.spyOn(Constants, 'expoConfig', 'get').mockReturnValue({ extra: { eas: { projectId: 'pid' } } } as any);
    const scheduleSpy = jest.spyOn(Notifications, 'scheduleNotificationAsync').mockResolvedValue(undefined as any);
    const token = await NotificationService.registerForPushNotifications();
    expect(token).toBe('tokenABC');
    await NotificationService.schedulePushNotification('Integration', 'Test', {}, null);
    expect(scheduleSpy).toHaveBeenCalled();
  });

  it('sets and gets badge count in sequence', async () => {
    const setSpy = jest.spyOn(Notifications, 'setBadgeCountAsync').mockResolvedValue(undefined as any);
    jest.spyOn(Notifications, 'getBadgeCountAsync').mockResolvedValue(42 as any);
    await NotificationService.setBadgeCount(42);
    expect(setSpy).toHaveBeenCalledWith(42);
    const count = await NotificationService.getBadgeCount();
    expect(count).toBe(42);
  });

  it('cancels all scheduled notifications after scheduling one', async () => {
    jest.spyOn(Notifications, 'scheduleNotificationAsync').mockResolvedValue(undefined as any);
    const cancelSpy = jest.spyOn(Notifications, 'cancelAllScheduledNotificationsAsync').mockResolvedValue(undefined as any);
    await NotificationService.schedulePushNotification('Cancel', 'Me', {}, null);
    await NotificationService.cancelAllScheduledNotifications();
    expect(cancelSpy).toHaveBeenCalled();
  });
}); 