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
    switch (notification.type) {
      case 'success':
        return styles.successNotification;
      case 'warning':
        return styles.warningNotification;
      case 'error':
        return styles.errorNotification;
      default:
        return styles.infoNotification;
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

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
          top: Platform.OS === 'ios' ? 60 + (index * 80) : 20 + (index * 80),
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.notification, getNotificationStyle()]}
        onPress={notification.action ? handleActionPress : handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getNotificationIcon()}</Text>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {notification.message}
            </Text>
            {notification.action && (
              <Text style={styles.actionText}>{notification.action.label}</Text>
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
      {inAppNotifications.map((notification, index) => (
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
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notification: {
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 70,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  infoNotification: {
    backgroundColor: '#007AFF',
  },
  successNotification: {
    backgroundColor: '#34C759',
  },
  warningNotification: {
    backgroundColor: '#FF9500',
  },
  errorNotification: {
    backgroundColor: '#FF3B30',
  },
});