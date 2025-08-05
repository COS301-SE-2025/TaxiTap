import { useEffect, useRef } from 'react';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface SessionMonitoringOptions {
  updateInterval?: number; // milliseconds, default 5 minutes
  checkForConflicts?: boolean; // default true
  onSessionConflict?: (conflictInfo: any) => void;
}

export const useSessionMonitoring = (options: SessionMonitoringOptions = {}) => {
  const {
    updateInterval = 5 * 60 * 1000, // 5 minutes
    checkForConflicts = true,
    onSessionConflict,
  } = options;

  const convex = useConvex();
  const { user, logout } = useUser();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Get device ID
  const getDeviceId = async (): Promise<string | null> => {
    if (deviceIdRef.current) {
      return deviceIdRef.current;
    }

    try {
      const deviceId = await AsyncStorage.getItem('deviceId');
      deviceIdRef.current = deviceId;
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return null;
    }
  };

  // Update session activity
  const updateSessionActivity = async () => {
    if (!user) return;

    try {
      const deviceId = await getDeviceId();
      if (!deviceId) return;

      await convex.mutation(api.functions.users.UserManagement.logInWithSMS.updateSessionActivity, {
        deviceId,
      });
    } catch (error) {
      console.error('Error updating session activity:', error);
      // Don't show alerts for session activity updates - these are background operations
      // Don't throw errors to prevent app crashes
    }
  };

  // Check for session conflicts
  const checkForSessionConflicts = async () => {
    if (!user || !checkForConflicts) return;

    try {
      const deviceId = await getDeviceId();
      if (!deviceId) return;

      const activeSessions = await convex.query(api.functions.users.UserManagement.logInWithSMS.checkActiveSessions, {
        userId: user.id as any,
      });

      // Check if there are sessions on other devices
      const otherDeviceSessions = activeSessions.filter(session => session.deviceId !== deviceId);

      if (otherDeviceSessions.length > 0) {
        const conflictInfo = {
          message: 'Your account is active on another device',
          otherDevices: otherDeviceSessions.map(session => ({
            deviceName: session.deviceName || 'Unknown Device',
            platform: session.platform,
            lastActivity: new Date(session.lastActivityAt).toLocaleString(),
          })),
        };

        if (onSessionConflict) {
          onSessionConflict(conflictInfo);
        } else {
          // Default conflict handling with better error message
          Alert.alert(
            'Session Conflict',
            'Your account is active on another device. You will be logged out for security.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  try {
                    await logout();
                  } catch (logoutError) {
                    console.error('Error during logout:', logoutError);
                  }
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error checking for session conflicts:', error);
      // Don't show alerts for session conflict checks - these are background operations
      // Only log the error for debugging purposes
    }
  };

  // Start monitoring
  const startMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Initial update
    updateSessionActivity();
    checkForSessionConflicts();

    // Set up periodic updates
    intervalRef.current = setInterval(() => {
      updateSessionActivity();
      checkForSessionConflicts();
    }, updateInterval);
  };

  // Stop monitoring
  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (user) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return {
    updateSessionActivity,
    checkForSessionConflicts,
    startMonitoring,
    stopMonitoring,
  };
}; 