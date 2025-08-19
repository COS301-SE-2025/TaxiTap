import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useAlerts, Alert, AlertPosition, AlertAnimation, AlertType } from '../contexts/AlertContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AlertItemProps {
  alert: Alert;
  onDismiss: (id: string) => void;
  index: number;
  isGlobal: boolean;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onDismiss, index, isGlobal }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation based on type
    const animations: Animated.CompositeAnimation[] = [];

    switch (alert.animation) {
      case 'slide-up':
        animatedValue.setValue(screenHeight);
        animations.push(
          Animated.spring(animatedValue, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        );
        break;
      case 'slide-down':
        animatedValue.setValue(-screenHeight);
        animations.push(
          Animated.spring(animatedValue, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        );
        break;
      case 'slide-left':
        animatedValue.setValue(screenWidth);
        animations.push(
          Animated.spring(animatedValue, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        );
        break;
      case 'slide-right':
        animatedValue.setValue(-screenWidth);
        animations.push(
          Animated.spring(animatedValue, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        );
        break;
      case 'fade':
        animations.push(
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'scale':
        animations.push(
          Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        );
        break;
      case 'bounce':
        animations.push(
          Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 3,
          })
        );
        break;
    }

    // Always fade in
    animations.push(
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, []);

  const handleDismiss = () => {
    const animations: Animated.CompositeAnimation[] = [];

    switch (alert.animation) {
      case 'slide-up':
        animations.push(
          Animated.timing(animatedValue, {
            toValue: screenHeight,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'slide-down':
        animations.push(
          Animated.timing(animatedValue, {
            toValue: -screenHeight,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'slide-left':
        animations.push(
          Animated.timing(animatedValue, {
            toValue: screenWidth,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'slide-right':
        animations.push(
          Animated.timing(animatedValue, {
            toValue: -screenWidth,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'fade':
        animations.push(
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'scale':
        animations.push(
          Animated.timing(scaleValue, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
      case 'bounce':
        animations.push(
          Animated.timing(scaleValue, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          })
        );
        break;
    }

    // Always fade out
    animations.push(
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start(() => {
      // Defer dismiss to next tick to avoid scheduling state updates during render/commit
      requestAnimationFrame(() => onDismiss(alert.id));
    });
  };

  const handleActionPress = (action: any) => {
    action.onPress();
    handleDismiss();
  };

  const getAlertIcon = () => {
    switch (alert.type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  // Native-style notification colors
  const getDefaultStyle = (): any => {
    const baseStyle = {
      // Light transparent Amazon blue background
      backgroundColor: 'rgba(29, 41, 57, 0.95)', // Amazon blue with transparency
      textColor: '#FFFFFF',
      titleColor: '#FFFFFF',
      messageColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 12, // Native iOS-style rounded corners
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
    };

    // Subtle variations for different alert types
    switch (alert.type) {
      case 'success':
        return { 
          ...baseStyle, 
          backgroundColor: 'rgba(29, 41, 57, 0.95)',
          borderLeftColor: '#34C759',
          borderLeftWidth: 3,
        };
      case 'warning':
        return { 
          ...baseStyle, 
          backgroundColor: 'rgba(29, 41, 57, 0.95)',
          borderLeftColor: '#FF9500',
          borderLeftWidth: 3,
        };
      case 'error':
        return { 
          ...baseStyle, 
          backgroundColor: 'rgba(29, 41, 57, 0.95)',
          borderLeftColor: '#FF3B30',
          borderLeftWidth: 3,
        };
      case 'info':
        return { 
          ...baseStyle, 
          backgroundColor: 'rgba(29, 41, 57, 0.95)',
          borderLeftColor: '#007AFF',
          borderLeftWidth: 3,
        };
      default:
        return baseStyle;
    }
  };

  const defaultStyle = getDefaultStyle();
  const customStyle = alert.style || {};
  const finalStyle = { ...defaultStyle, ...customStyle };

  const getPositionStyle = (): any => {
    // Native notification spacing
    const baseOffset = Platform.OS === 'ios' ? 60 : 40;
    const spacing = 74; // Native notification spacing
    const topOffset = baseOffset + (index * spacing);
    const horizontalMargin = 12; // Native side margins

    switch (alert.position) {
      case 'top':
        return {
          top: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'bottom':
        return {
          bottom: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'center':
        return {
          top: '50%',
          left: 20,
          right: 20,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
            { translateY: -50 },
          ],
        };
      case 'top-left':
        return {
          top: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'top-right':
        return {
          top: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'bottom-left':
        return {
          bottom: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'bottom-right':
        return {
          bottom: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      default:
        return {
          top: topOffset,
          left: horizontalMargin,
          right: horizontalMargin,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
          ],
        };
    }
  };

  const renderAppIcon = () => (
    <View style={[
      styles.appIconContainer,
      { borderLeftColor: finalStyle.borderLeftColor }
    ]}>
      {/* App Logo - Replace with your actual app logo/icon */}
      <View style={styles.appIcon}>
        <Text style={styles.appIconText}>A</Text>
      </View>
      {isGlobal && (
        <View style={styles.globalBadge}>
          <Text style={styles.globalBadgeText}>!</Text>
        </View>
      )}
    </View>
  );

  const renderAlert = () => (
    <Animated.View
      style={[
        styles.alertContainer,
        getPositionStyle(),
        {
          zIndex: isGlobal ? 1100 : 1000,
          opacity: opacityValue,
          backgroundColor: finalStyle.backgroundColor,
          borderRadius: finalStyle.borderRadius,
          borderLeftColor: finalStyle.borderLeftColor,
          borderLeftWidth: finalStyle.borderLeftWidth,
          shadowColor: finalStyle.shadowColor,
          shadowOffset: finalStyle.shadowOffset,
          shadowOpacity: finalStyle.shadowOpacity,
          shadowRadius: finalStyle.shadowRadius,
          elevation: finalStyle.elevation,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.alertContent}
        onPress={alert.actions?.length ? undefined : handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.alertHeader}>
          {renderAppIcon()}
          
          <View style={styles.textContainer}>
            <Text 
              style={[styles.title, { color: finalStyle.titleColor }]} 
              numberOfLines={1}
            >
              {alert.title}
            </Text>
            <Text 
              style={[styles.message, { color: finalStyle.messageColor }]} 
              numberOfLines={3}
            >
              {alert.message}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeText, { color: finalStyle.textColor }]}>
              ×
            </Text>
          </TouchableOpacity>
        </View>

        {alert.actions && alert.actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {alert.actions.map((action, actionIndex) => {
              const actionCount = alert.actions?.length || 0;
              return (
                <TouchableOpacity
                  key={actionIndex}
                  style={[
                    styles.actionButton,
                    {
                      minWidth: actionCount === 1 ? 100 : 80,
                      flex: actionCount <= 2 ? 1 : 0,
                      marginHorizontal: actionCount > 2 ? 4 : 0,
                    },
                    action.style === 'destructive' && styles.destructiveAction,
                    action.style === 'cancel' && styles.cancelAction,
                  ]}
                  onPress={() => handleActionPress(action)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      { color: finalStyle.textColor },
                      action.style === 'destructive' && styles.destructiveText,
                      action.style === 'cancel' && styles.cancelText,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  // Render with backdrop for center positioned alerts
  if (alert.position === 'center') {
    return (
      <Animated.View
        style={[
          styles.backdrop,
          {
            zIndex: isGlobal ? 1100 : 1000,
            opacity: opacityValue,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={handleDismiss}
          activeOpacity={1}
        >
          <View style={styles.backdropContent} onStartShouldSetResponder={() => true}>
            {renderAlert()}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return renderAlert();
};

export const AlertOverlay: React.FC = () => {
  const { globalAlerts, localAlerts, dismissGlobalAlert, dismissLocalAlert, dismissAllLocalAlerts } = useAlerts();
  const pathname = usePathname();
  const currentRoute = useRef<string>('');

  // Navigation listener to dismiss local alerts on route change
  useEffect(() => {
    // If route changed and we have local alerts, dismiss them
    if (currentRoute.current && currentRoute.current !== pathname && localAlerts.length > 0) {
      dismissAllLocalAlerts();
    }
    
    currentRoute.current = pathname;
  }, [pathname, localAlerts.length, dismissAllLocalAlerts]);

  const allAlerts = [...globalAlerts, ...localAlerts];

  if (allAlerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {globalAlerts.map((alert, index) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={dismissGlobalAlert}
          index={index}
          isGlobal={true}
        />
      ))}
      
      {localAlerts.map((alert, index) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={dismissLocalAlert}
          index={index}
          isGlobal={false}
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
  alertContainer: {
    position: 'absolute',
  },
  alertContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 70,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  globalBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  globalBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '400',
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
    fontWeight: '500',
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 52, // Align with text content
    gap: 10,
    minHeight: 32,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '48%',
    minHeight: 28,
  },
  destructiveAction: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  cancelAction: {
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  cancelText: {
    color: '#8E8E93',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});