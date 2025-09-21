import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useLanguage } from '../contexts/LanguageContext';
import { JourneyLeg, MultiLegJourney } from '../types/multiLegJourney';

interface LegTransitionProps {
  visible: boolean;
  currentLeg: JourneyLeg;
  nextLeg: JourneyLeg;
  journey: MultiLegJourney;
  onConfirmNextLeg: () => void;
  onRequestNextLeg: () => Promise<void>;
  onCancelJourney: () => void;
  onRetryRequest: () => Promise<void>;
  transferStatus: 'arriving' | 'arrived' | 'requesting' | 'confirmed' | 'failed';
  nextLegRequestStatus?: 'pending' | 'success' | 'failed' | 'timeout';
  errorMessage?: string;
  estimatedArrivalTime?: number;
  isDarkMode?: boolean;
}

const { width } = Dimensions.get('window');

export const LegTransition: React.FC<LegTransitionProps> = ({
  visible,
  currentLeg,
  nextLeg,
  journey,
  onConfirmNextLeg,
  onRequestNextLeg,
  onCancelJourney,
  onRetryRequest,
  transferStatus,
  nextLegRequestStatus = 'pending',
  errorMessage,
  estimatedArrivalTime,
  isDarkMode = false,
}) => {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Countdown timer for arrival
  useEffect(() => {
    if (estimatedArrivalTime && transferStatus === 'arriving') {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((estimatedArrivalTime - now) / 1000));
        setCountdown(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
          setCountdown(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [estimatedArrivalTime, transferStatus]);

  // Auto-request next leg when arriving
  useEffect(() => {
    if (transferStatus === 'arrived' && nextLegRequestStatus === 'pending') {
      handleRequestNextLeg();
    }
  }, [transferStatus, nextLegRequestStatus]);

  const handleRequestNextLeg = async () => {
    setIsRequesting(true);
    try {
      await onRequestNextLeg();
    } catch (error) {
      console.error('Error requesting next leg:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRetry = async () => {
    setIsRequesting(true);
    try {
      await onRetryRequest();
    } catch (error) {
      console.error('Error retrying request:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (transferStatus) {
      case 'arriving':
        return 'location-on';
      case 'arrived':
        return 'check-circle';
      case 'requesting':
        return 'refresh';
      case 'confirmed':
        return 'check-circle';
      case 'failed':
        return 'error';
      default:
        return 'location-on';
    }
  };

  const getStatusColor = () => {
    switch (transferStatus) {
      case 'arriving':
        return '#FF9900';
      case 'arrived':
        return '#4CAF50';
      case 'requesting':
        return '#2196F3';
      case 'confirmed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      default:
        return '#FF9900';
    }
  };

  const getNextLegStatusIcon = () => {
    switch (nextLegRequestStatus) {
      case 'pending':
        return 'schedule';
      case 'success':
        return 'check-circle';
      case 'failed':
        return 'error';
      case 'timeout':
        return 'access-time';
      default:
        return 'schedule';
    }
  };

  const getNextLegStatusColor = () => {
    switch (nextLegRequestStatus) {
      case 'pending':
        return '#FF9800';
      case 'success':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'timeout':
        return '#FF5722';
      default:
        return '#FF9800';
    }
  };

  const renderJourneyProgress = () => {
    const currentLegNum = currentLeg.legIndex + 1;
    const totalLegs = journey.totalLegs;
    const progress = (currentLegNum / totalLegs) * 100;

    return (
      <View style={[styles.progressContainer, isDarkMode && styles.progressContainerDark]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, isDarkMode && styles.progressTitleDark]}>
            Journey Progress
          </Text>
          <Text style={[styles.progressSubtitle, isDarkMode && styles.progressSubtitleDark]}>
            Leg {currentLegNum} of {totalLegs}
          </Text>
        </View>
        
        <View style={[styles.progressBar, isDarkMode && styles.progressBarDark]}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${progress}%` },
              isDarkMode && styles.progressFillDark
            ]} 
          />
        </View>
        
        <View style={styles.progressSteps}>
          {Array.from({ length: totalLegs }, (_, index) => (
            <View
              key={index}
              style={[
                styles.progressStep,
                index < currentLegNum && styles.progressStepCompleted,
                index === currentLegNum - 1 && styles.progressStepCurrent,
                isDarkMode && styles.progressStepDark,
                index < currentLegNum && isDarkMode && styles.progressStepCompletedDark,
                index === currentLegNum - 1 && isDarkMode && styles.progressStepCurrentDark,
              ]}
            >
              <Text style={[
                styles.progressStepText,
                isDarkMode && styles.progressStepTextDark,
                index < currentLegNum && styles.progressStepTextCompleted,
                index === currentLegNum - 1 && styles.progressStepTextCurrent,
              ]}>
                {index + 1}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTransferNotification = () => {
    return (
      <View style={[styles.notificationContainer, isDarkMode && styles.notificationContainerDark]}>
        <View style={styles.notificationHeader}>
          <Icon
            name={getStatusIcon()}
            color={getStatusColor()}
            size={32}
          />
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationTitle, isDarkMode && styles.notificationTitleDark]}>
              {transferStatus === 'arriving' ? 'Approaching Transfer Point' : 
               transferStatus === 'arrived' ? 'Arrived at Transfer Point' :
               transferStatus === 'requesting' ? 'Requesting Next Leg' :
               transferStatus === 'confirmed' ? 'Next Leg Confirmed' :
               'Transfer Failed'}
            </Text>
            <Text style={[styles.notificationSubtitle, isDarkMode && styles.notificationSubtitleDark]}>
              {currentLeg.toAddress}
            </Text>
            {countdown !== null && (
              <Text style={[styles.countdownText, isDarkMode && styles.countdownTextDark]}>
                Arriving in {formatTime(countdown)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderNextLegInfo = () => {
    return (
      <View style={[styles.nextLegContainer, isDarkMode && styles.nextLegContainerDark]}>
        <View style={styles.nextLegHeader}>
          <Icon
            name={getNextLegStatusIcon()}
            color={getNextLegStatusColor()}
            size={24}
          />
          <Text style={[styles.nextLegTitle, isDarkMode && styles.nextLegTitleDark]}>
            Next Leg: {nextLeg.fromAddress} → {nextLeg.toAddress}
          </Text>
        </View>
        
        <View style={styles.nextLegDetails}>
          <View style={styles.nextLegDetailItem}>
            <Icon name="schedule" size={16} color={isDarkMode ? '#B0B0B0' : '#666'} />
            <Text style={[styles.nextLegDetailText, isDarkMode && styles.nextLegDetailTextDark]}>
              Est. Duration: {Math.round(nextLeg.estimatedDuration / 60)} min
            </Text>
          </View>
          
          <View style={styles.nextLegDetailItem}>
            <Icon name="attach-money" size={16} color={isDarkMode ? '#B0B0B0' : '#666'} />
            <Text style={[styles.nextLegDetailText, isDarkMode && styles.nextLegDetailTextDark]}>
              Est. Fare: R{nextLeg.estimatedFare.toFixed(2)}
            </Text>
          </View>
        </View>

        {nextLegRequestStatus === 'failed' && errorMessage && (
          <View style={[styles.errorContainer, isDarkMode && styles.errorContainerDark]}>
            <Icon name="error" size={16} color="#F44336" />
            <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
              {errorMessage}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderActionButtons = () => {
    return (
      <View style={styles.actionButtonsContainer}>
        {transferStatus === 'arrived' && nextLegRequestStatus === 'success' && (
          <TouchableOpacity
            style={[styles.confirmButton, isDarkMode && styles.confirmButtonDark]}
            onPress={onConfirmNextLeg}
          >
            <Icon name="check" size={20} color="white" />
            <Text style={styles.confirmButtonText}>Confirm Next Leg</Text>
          </TouchableOpacity>
        )}

        {nextLegRequestStatus === 'failed' && (
          <TouchableOpacity
            style={[styles.retryButton, isDarkMode && styles.retryButtonDark]}
            onPress={handleRetry}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Icon name="refresh" size={20} color="white" />
            )}
            <Text style={styles.retryButtonText}>
              {isRequesting ? 'Retrying...' : 'Retry Request'}
            </Text>
          </TouchableOpacity>
        )}

        {transferStatus === 'requesting' && (
          <View style={[styles.requestingContainer, isDarkMode && styles.requestingContainerDark]}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={[styles.requestingText, isDarkMode && styles.requestingTextDark]}>
              Requesting next leg taxi...
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.cancelButton, isDarkMode && styles.cancelButtonDark]}
          onPress={onCancelJourney}
        >
          <Icon name="cancel" size={20} color={isDarkMode ? '#FF6B6B' : '#F44336'} />
          <Text style={[styles.cancelButtonText, isDarkMode && styles.cancelButtonTextDark]}>
            Cancel Journey
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderJourneyProgress()}
        {renderTransferNotification()}
        {renderNextLegInfo()}
        {renderActionButtons()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  
  // Journey Progress Styles
  progressContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressContainerDark: {
    backgroundColor: '#1E1E1E',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  progressTitleDark: {
    color: '#FFFFFF',
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressSubtitleDark: {
    color: '#B0B0B0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressBarDark: {
    backgroundColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressFillDark: {
    backgroundColor: '#66BB6A',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepDark: {
    backgroundColor: '#333',
  },
  progressStepCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressStepCompletedDark: {
    backgroundColor: '#66BB6A',
  },
  progressStepCurrent: {
    backgroundColor: '#FF9900',
  },
  progressStepCurrentDark: {
    backgroundColor: '#FFB74D',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressStepTextDark: {
    color: '#B0B0B0',
  },
  progressStepTextCompleted: {
    color: 'white',
  },
  progressStepTextCurrent: {
    color: 'white',
  },

  // Transfer Notification Styles
  notificationContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  notificationContainerDark: {
    backgroundColor: '#1A237E',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  notificationTitleDark: {
    color: '#90CAF9',
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  notificationSubtitleDark: {
    color: '#B0B0B0',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 4,
  },
  countdownTextDark: {
    color: '#FFB74D',
  },

  // Next Leg Info Styles
  nextLegContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  nextLegContainerDark: {
    backgroundColor: '#1E1E1E',
  },
  nextLegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextLegTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  nextLegTitleDark: {
    color: '#FFFFFF',
  },
  nextLegDetails: {
    marginLeft: 32,
  },
  nextLegDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextLegDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  nextLegDetailTextDark: {
    color: '#B0B0B0',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorContainerDark: {
    backgroundColor: '#3E2723',
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  errorTextDark: {
    color: '#EF5350',
  },

  // Action Buttons Styles
  actionButtonsContainer: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  confirmButtonDark: {
    backgroundColor: '#66BB6A',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  retryButtonDark: {
    backgroundColor: '#FFB74D',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  requestingContainerDark: {
    backgroundColor: '#1A237E',
  },
  requestingText: {
    fontSize: 16,
    color: '#1976D2',
    marginLeft: 8,
  },
  requestingTextDark: {
    color: '#90CAF9',
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonDark: {
    backgroundColor: '#3E2723',
    borderColor: '#FF6B6B',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButtonTextDark: {
    color: '#FF6B6B',
  },
});

export default LegTransition;
