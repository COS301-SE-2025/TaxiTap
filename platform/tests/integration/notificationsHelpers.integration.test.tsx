import { NotificationService } from '../../services/NotificationService';

// Define global.alert for Node.js environment
if (typeof global.alert === 'undefined') {
  global.alert = jest.fn();
}

// Mock all dependencies before importing NotificationService
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id'
      }
    }
  }
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

describe('NotificationService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  });

  it('registers for push notifications successfully', async () => {
    const Notifications = require('expo-notifications');
    
    // Mock the notification functions
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'test-token' });

    const token = await NotificationService.registerForPushNotifications();
    
    expect(token).toBe('test-token');
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  });

  it('sets and gets badge count correctly', async () => {
    const Notifications = require('expo-notifications');
    
    (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);
    (Notifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(42);

    await NotificationService.setBadgeCount(42);
    const count = await NotificationService.getBadgeCount();

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(42);
    expect(Notifications.getBadgeCountAsync).toHaveBeenCalled();
    expect(count).toBe(42);
  });

  it('schedules and cancels notifications correctly', async () => {
    const Notifications = require('expo-notifications');
    
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(undefined);

    await NotificationService.schedulePushNotification('Test', 'Test notification', { test: 'data' });
    await NotificationService.cancelAllScheduledNotifications();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('handles permission denied gracefully', async () => {
    const Notifications = require('expo-notifications');
    
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const token = await NotificationService.registerForPushNotifications();
    
    expect(token).toBeNull();
    expect(global.alert).toHaveBeenCalledWith('Failed to get push token for push notification!');
  });

  it('handles non-device environment', async () => {
    const Device = require('expo-device');
    Device.isDevice = false;

    const token = await NotificationService.registerForPushNotifications();
    
    expect(token).toBeNull();
    expect(global.alert).toHaveBeenCalledWith('Failed to get push token for push notification!');
  });
}); 