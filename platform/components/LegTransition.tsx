import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useMapContext } from '../contexts/MapContext';

interface LegTransitionProps {
  visible: boolean;
  journeyId: string;
  currentLegIndex: number;
  totalLegs: number;
  transferLocation: {
    latitude: number;
    longitude: number;
    name: string;
  };
  nextLeg: {
    fromAddress: string;
    toAddress: string;
    estimatedFare: number;
    estimatedDuration: number;
  };
  onConfirmNextLeg: () => void;
  onCancelJourney: () => void;
  onRequestAssistance: () => void;
  transferWindowStart?: number;
  transferWindowEnd?: number;
}

const { width, height } = Dimensions.get('window');

export const LegTransition: React.FC<LegTransitionProps> = ({
  visible,
  journeyId,
  currentLegIndex,
  totalLegs,
  transferLocation,
  nextLeg,
  onConfirmNextLeg,
  onCancelJourney,
  onRequestAssistance,
  transferWindowStart,
  transferWindowEnd,
}) => {
  const { theme, isDark } = useTheme();
  const { currentJourney, progressToNextLeg } = useMapContext();
  
  const [countdown, setCountdown] = useState(0);
  const [isTransferWindowActive, setIsTransferWindowActive] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(height));

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Start countdown if transfer window is provided
      if (transferWindowStart && transferWindowEnd) {
        const now = Date.now();
        const timeUntilStart = transferWindowStart - now;
        
        if (timeUntilStart > 0) {
          setCountdown(Math.ceil(timeUntilStart / 1000));
          setIsTransferWindowActive(false);
        } else {
          setIsTransferWindowActive(true);
        }
      }
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, transferWindowStart, transferWindowEnd]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsTransferWindowActive(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatFare = (fare: number): string => {
    return `R${fare.toFixed(2)}`;
  };

  const handleConfirmNextLeg = () => {
    progressToNextLeg();
    onConfirmNextLeg();
  };

  const handleCancelJourney = () => {
    Alert.alert(
      'Cancel Journey',
      'Are you sure you want to cancel this multi-leg journey? You will be charged for completed legs only.',
      [
        { text: 'Keep Journey', style: 'cancel' },
        { text: 'Cancel Journey', style: 'destructive', onPress: onCancelJourney },
      ]
    );
  };

  const handleRequestAssistance = () => {
    Alert.alert(
      'Request Assistance',
      'Would you like to request assistance at the transfer point?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Help', onPress: onRequestAssistance },
      ]
    );
  };

  const dynamicStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      margin: 20,
      maxHeight: height * 0.8,
      width: width - 40,
      shadowColor: theme.shadow,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      backgroundColor: theme.primary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#121212' : '#FFFFFF',
      marginBottom: 5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? '#121212' : '#FFFFFF',
      opacity: 0.9,
      textAlign: 'center',
    },
    content: {
      padding: 20,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      padding: 15,
      backgroundColor: isDark ? 'rgba(255, 184, 77, 0.1)' : 'rgba(255, 184, 77, 0.05)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 184, 77, 0.2)' : 'rgba(255, 184, 77, 0.1)',
    },
    progressIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    progressText: {
      flex: 1,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    progressSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    transferInfo: {
      marginBottom: 20,
    },
    transferTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 10,
    },
    transferLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
      padding: 15,
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    locationIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    locationText: {
      flex: 1,
    },
    locationName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    locationAddress: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    nextLegInfo: {
      marginBottom: 20,
    },
    nextLegTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 10,
    },
    nextLegCard: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    nextLegRoute: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 8,
    },
    nextLegDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nextLegTime: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    nextLegFare: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    countdownContainer: {
      alignItems: 'center',
      marginBottom: 20,
      padding: 15,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    },
    countdownText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#3B82F6',
      marginBottom: 5,
    },
    countdownSubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: isDark ? '#FF4444' : '#FF6B6B',
    },
    confirmButton: {
      backgroundColor: theme.primary,
    },
    assistanceButton: {
      backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    buttonIcon: {
      marginRight: 8,
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancelJourney}
    >
      <Animated.View style={[dynamicStyles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[dynamicStyles.container, { transform: [{ translateY: slideAnim }] }]}>
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.headerTitle}>
              Transfer Point Reached
            </Text>
            <Text style={dynamicStyles.headerSubtitle}>
              Leg {currentLegIndex + 1} of {totalLegs} completed
            </Text>
          </View>

          <View style={dynamicStyles.content}>
            {/* Progress Indicator */}
            <View style={dynamicStyles.progressContainer}>
              <View style={dynamicStyles.progressIcon}>
                <Icon name="checkmark" size={20} color={isDark ? '#121212' : '#FFFFFF'} />
              </View>
              <View style={dynamicStyles.progressText}>
                <Text style={dynamicStyles.progressTitle}>
                  Leg {currentLegIndex + 1} Completed
                </Text>
                <Text style={dynamicStyles.progressSubtitle}>
                  {currentLegIndex + 1 < totalLegs 
                    ? `Next: Leg ${currentLegIndex + 2} of ${totalLegs}`
                    : 'Journey Complete!'
                  }
                </Text>
              </View>
            </View>

            {/* Transfer Information */}
            <View style={dynamicStyles.transferInfo}>
              <Text style={dynamicStyles.transferTitle}>
                Transfer Point
              </Text>
              <View style={dynamicStyles.transferLocation}>
                <View style={dynamicStyles.locationIcon}>
                  <Icon name="location" size={16} color={isDark ? '#121212' : '#FFFFFF'} />
                </View>
                <View style={dynamicStyles.locationText}>
                  <Text style={dynamicStyles.locationName}>
                    {transferLocation.name}
                  </Text>
                  <Text style={dynamicStyles.locationAddress}>
                    Transfer point for next leg
                  </Text>
                </View>
              </View>
            </View>

            {/* Next Leg Information */}
            {currentLegIndex + 1 < totalLegs && (
              <View style={dynamicStyles.nextLegInfo}>
                <Text style={dynamicStyles.nextLegTitle}>
                  Next Leg Details
                </Text>
                <View style={dynamicStyles.nextLegCard}>
                  <Text style={dynamicStyles.nextLegRoute}>
                    {nextLeg.fromAddress} → {nextLeg.toAddress}
                  </Text>
                  <View style={dynamicStyles.nextLegDetails}>
                    <Text style={dynamicStyles.nextLegTime}>
                      {formatDuration(nextLeg.estimatedDuration)}
                    </Text>
                    <Text style={dynamicStyles.nextLegFare}>
                      {formatFare(nextLeg.estimatedFare)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Countdown Timer */}
            {countdown > 0 && (
              <View style={dynamicStyles.countdownContainer}>
                <Text style={dynamicStyles.countdownText}>
                  Transfer window starts in {countdown}s
                </Text>
                <Text style={dynamicStyles.countdownSubtext}>
                  Please wait for the next leg to become available
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={dynamicStyles.buttonContainer}>
              <TouchableOpacity
                style={[dynamicStyles.button, dynamicStyles.cancelButton]}
                onPress={handleCancelJourney}
              >
                <Text style={dynamicStyles.buttonText}>Cancel Journey</Text>
              </TouchableOpacity>

              {currentLegIndex + 1 < totalLegs ? (
                <TouchableOpacity
                  style={[dynamicStyles.button, dynamicStyles.confirmButton]}
                  onPress={handleConfirmNextLeg}
                  disabled={!isTransferWindowActive && countdown > 0}
                >
                  <Text style={dynamicStyles.buttonText}>
                    {isTransferWindowActive ? 'Start Next Leg' : 'Wait for Transfer Window'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[dynamicStyles.button, dynamicStyles.confirmButton]}
                  onPress={onConfirmNextLeg}
                >
                  <Text style={dynamicStyles.buttonText}>Complete Journey</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Assistance Button */}
            <TouchableOpacity
              style={[dynamicStyles.button, dynamicStyles.assistanceButton, { marginTop: 12 }]}
              onPress={handleRequestAssistance}
            >
              <Text style={dynamicStyles.buttonText}>Request Assistance</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default LegTransition;