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
      onDismiss(alert.id);
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

  const getDefaultStyle = (): any => {
    const baseStyle = {
      backgroundColor: '#007AFF',
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    };

    switch (alert.type) {
      case 'success':
        return { ...baseStyle, backgroundColor: '#34C759' };
      case 'warning':
        return { ...baseStyle, backgroundColor: '#FF9500' };
      case 'error':
        return { ...baseStyle, backgroundColor: '#FF3B30' };
      case 'info':
        return { ...baseStyle, backgroundColor: '#007AFF' };
      default:
        return baseStyle;
    }
  };

  const defaultStyle = getDefaultStyle();
  const customStyle = alert.style || {};
  const finalStyle = { ...defaultStyle, ...customStyle };

  const getPositionStyle = (): any => {
    const baseOffset = isGlobal ? 60 : 20;
    const spacing = 80;
    const topOffset = baseOffset + (index * spacing);

    switch (alert.position) {
      case 'top':
        return {
          top: topOffset,
          left: 16,
          right: 16,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'bottom':
        return {
          bottom: topOffset,
          left: 16,
          right: 16,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'center':
        return {
          top: '50%',
          left: 16,
          right: 16,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
            { translateY: -50 },
          ],
        };
      case 'top-left':
        return {
          top: topOffset,
          left: 16,
          maxWidth: screenWidth * 0.7,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'top-right':
        return {
          top: topOffset,
          right: 16,
          maxWidth: screenWidth * 0.7,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'bottom-left':
        return {
          bottom: topOffset,
          left: 16,
          maxWidth: screenWidth * 0.7,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      case 'bottom-right':
        return {
          bottom: topOffset,
          right: 16,
          maxWidth: screenWidth * 0.7,
          transform: [
            { translateX: animatedValue },
            { scale: scaleValue },
          ],
        };
      default:
        return {
          top: topOffset,
          left: 16,
          right: 16,
          transform: [
            { translateY: animatedValue },
            { scale: scaleValue },
          ],
        };
    }
  };

  const renderAlert = () => (
    <Animated.View
      style={[
        styles.alertContainer,
        getPositionStyle(),
        {
          zIndex: isGlobal ? 1100 : 1000,
          opacity: opacityValue,
          backgroundColor: finalStyle.backgroundColor,
          borderColor: finalStyle.borderColor,
          borderWidth: finalStyle.borderWidth,
          borderRadius: finalStyle.borderRadius,
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
          <View style={styles.iconContainer}>
            <Text style={[styles.icon, { color: finalStyle.textColor }]}>
              {getAlertIcon()}
            </Text>
          </View>
          
          <View style={styles.textContainer}>
            <Text 
              style={[styles.title, { color: finalStyle.textColor }]} 
              numberOfLines={1}
            >
              {alert.title}
            </Text>
            <Text 
              style={[styles.message, { color: finalStyle.textColor }]} 
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
            {alert.actions.map((action, actionIndex) => (
              <TouchableOpacity
                key={actionIndex}
                style={[
                  styles.actionButton,
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
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
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
  const { globalAlerts, localAlerts, dismissGlobalAlert, dismissLocalAlert } = useAlerts();

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
    padding: 16,
    minHeight: 70,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.9,
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
    fontWeight: 'bold',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  destructiveAction: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  cancelAction: {
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
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