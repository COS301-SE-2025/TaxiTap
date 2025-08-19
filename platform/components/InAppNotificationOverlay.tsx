import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

const { width: screenWidth } = Dimensions.get('window');

interface NotificationItemProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    action?: {
      label: string;
      onPress: () => void;
    };
  };
  onDismiss: (id: string) => void;
  index: number;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss, index }) => {
  const slideAnim = useRef(new Animated.Value(-screenWidth)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  const handleActionPress = () => {
    if (notification.action) {
      notification.action.onPress();
      handleDismiss();
    }
  };

  const getNotificationStyle = () => {
    // All notifications use the same Amazon blue base with accent colors
    const baseStyle = {
      backgroundColor: 'rgba(29, 41, 57, 0.95)', // Amazon blue with transparency
      borderLeftWidth: 3,
    };

    switch (notification.type) {
      case 'success':
        return { ...baseStyle, borderLeftColor: '#34C759' };
      case 'warning':
        return { ...baseStyle, borderLeftColor: '#FF9500' };
      case 'error':
        return { ...baseStyle, borderLeftColor: '#FF3B30' };
      default:
        return { ...baseStyle, borderLeftColor: '#007AFF' };
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return timestamp.toLocaleDateString();
  };

  const renderAppIcon = () => (
    <View style={styles.appIconContainer}>
      {/* App Logo - Replace with your actual app logo/icon */}
      <View style={styles.appIcon}>
        <Text style={styles.appIconText}>A</Text>
      </View>
      <View style={[styles.statusIndicator, getStatusIndicatorColor()]}>
        <Text style={styles.statusIcon}>{getNotificationIcon()}</Text>
      </View>
    </View>
  );

  const getStatusIndicatorColor = () => {
    switch (notification.type) {
      case 'success':
        return { backgroundColor: '#34C759' };
      case 'warning':
        return { backgroundColor: '#FF9500' };
      case 'error':
        return { backgroundColor: '#FF3B30' };
      default:
        return { backgroundColor: '#007AFF' };
    }
  };

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
          top: Platform.OS === 'ios' ? 60 + (index * 74) : 40 + (index * 74),
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.notification, getNotificationStyle()]}
        onPress={notification.action ? handleActionPress : handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.notificationContent}>
          {renderAppIcon()}
          
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.appName} numberOfLines={1}>
                Your App
              </Text>
              <Text style={styles.timestamp}>{formatTime(notification.timestamp)}</Text>
            </View>
            
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            
            <Text style={styles.message} numberOfLines={2}>
              {notification.message}
            </Text>
            
            {notification.action && (
              <TouchableOpacity 
                style={styles.actionContainer}
                onPress={handleActionPress}
              >
                <Text style={styles.actionText}>{notification.action.label}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const InAppNotificationOverlay: React.FC = () => {
  const { inAppNotifications, dismissInAppNotification } = useNotifications();

  if (inAppNotifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {inAppNotifications.map((notification: any, index: number) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissInAppNotification}
          index={index}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  notificationContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  notification: {
    borderRadius: 12, // Native iOS-style rounded corners
    marginVertical: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 70,
  },
  appIconContainer: {
    position: 'relative',
    marginRight: 12,
    marginTop: 2,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8, // Native app icon corner radius
    backgroundColor: '#1d2939', // Amazon blue for app icon
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  appIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusIcon: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.08,
  },
  timestamp: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
  actionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  closeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  closeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    lineHeight: 16,
  },
});