import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface TransferWindowCountdownProps {
  transferTimeoutAt: number;
  onTimeoutWarning?: (minutesLeft: number) => void;
  onTimeout?: () => void;
  onContinuePressed?: () => void;
  onCancelPressed?: () => void;
  isVisible?: boolean;
}

export const TransferWindowCountdown: React.FC<TransferWindowCountdownProps> = ({
  transferTimeoutAt,
  onTimeoutWarning,
  onTimeout,
  onContinuePressed,
  onCancelPressed,
  isVisible = true,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, transferTimeoutAt - now);
      setTimeLeft(remaining);

      const minutesLeft = Math.ceil(remaining / (60 * 1000));

      // Warn when 2 minutes or less remaining
      if (!hasWarned && minutesLeft <= 2 && minutesLeft > 0 && onTimeoutWarning) {
        setHasWarned(true);
        onTimeoutWarning(minutesLeft);
      }

      // Handle timeout
      if (remaining === 0 && !hasTimedOut) {
        setHasTimedOut(true);
        if (onTimeout) {
          onTimeout();
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [transferTimeoutAt, hasWarned, hasTimedOut, onTimeoutWarning, onTimeout]);

  if (!isVisible || hasTimedOut) {
    return null;
  }

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getUrgencyLevel = (): 'normal' | 'warning' | 'critical' => {
    const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
    if (minutesLeft <= 1) return 'critical';
    if (minutesLeft <= 2) return 'warning';
    return 'normal';
  };

  const urgency = getUrgencyLevel();
  const minutesLeft = Math.ceil(timeLeft / (60 * 1000));

  const getStatusColor = () => {
    switch (urgency) {
      case 'critical': return '#EF4444'; // Red
      case 'warning': return '#F59E0B'; // Orange
      default: return '#10B981'; // Green
    }
  };

  const getStatusIcon = () => {
    switch (urgency) {
      case 'critical': return 'warning';
      case 'warning': return 'time';
      default: return 'checkmark-circle';
    }
  };

  const statusColor = getStatusColor();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDark
        ? 'rgba(30, 41, 59, 0.95)'
        : 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      margin: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: statusColor,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    statusIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: statusColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    countdownContainer: {
      backgroundColor: isDark
        ? 'rgba(249, 115, 22, 0.1)'
        : 'rgba(249, 115, 22, 0.05)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
    },
    countdownText: {
      fontSize: 32,
      fontWeight: '700',
      color: statusColor,
      marginBottom: 4,
    },
    countdownLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    messageContainer: {
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.1)'
        : 'rgba(59, 130, 246, 0.05)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    messageText: {
      fontSize: 14,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    continueButton: {
      flex: 1,
      backgroundColor: '#10B981',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    continueButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    cancelButton: {
      flex: 1,
      backgroundColor: isDark
        ? 'rgba(239, 68, 68, 0.2)'
        : 'rgba(239, 68, 68, 0.1)',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    cancelButtonText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  const getMessage = () => {
    if (minutesLeft <= 1) {
      return "Transfer window expires in less than 1 minute! Board your next taxi immediately or your journey will be cancelled.";
    } else if (minutesLeft <= 2) {
      return "Hurry! Make your way to the next taxi stop. Your transfer window expires soon.";
    } else {
      return "You have time to walk to your next taxi. Follow the directions to the transfer point.";
    }
  };

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.statusIcon}>
          <Icon
            name={getStatusIcon()}
            size={20}
            color="#FFFFFF"
          />
        </View>
        <View style={dynamicStyles.headerContent}>
          <Text style={dynamicStyles.title}>
            Transfer Window Active
          </Text>
          <Text style={dynamicStyles.subtitle}>
            Ready for next leg of your journey
          </Text>
        </View>
      </View>

      <View style={dynamicStyles.countdownContainer}>
        <Text style={dynamicStyles.countdownText}>
          {formatTime(timeLeft)}
        </Text>
        <Text style={dynamicStyles.countdownLabel}>
          Time remaining to board next taxi
        </Text>
      </View>

      <View style={dynamicStyles.messageContainer}>
        <Text style={dynamicStyles.messageText}>
          {getMessage()}
        </Text>
      </View>

      <View style={dynamicStyles.buttonContainer}>
        {onContinuePressed && (
          <TouchableOpacity
            style={dynamicStyles.continueButton}
            onPress={onContinuePressed}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.continueButtonText}>
              Continue to Next Leg
            </Text>
          </TouchableOpacity>
        )}

        {onCancelPressed && (
          <TouchableOpacity
            style={dynamicStyles.cancelButton}
            onPress={onCancelPressed}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.cancelButtonText}>
              Cancel Journey
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};