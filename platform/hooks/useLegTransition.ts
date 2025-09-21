import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { JourneyLeg, MultiLegJourney } from '../types/multiLegJourney';

export type TransferStatus = 'arriving' | 'arrived' | 'requesting' | 'confirmed' | 'failed';
export type NextLegRequestStatus = 'pending' | 'success' | 'failed' | 'timeout';

interface UseLegTransitionProps {
  currentLeg: JourneyLeg;
  nextLeg: JourneyLeg;
  journey: MultiLegJourney;
  onRequestNextLegTaxi: (journeyId: string, legIndex: number) => Promise<void>;
  onProgressJourney: (journeyId: string, completedLegIndex: number) => Promise<void>;
  onCancelJourney: (journeyId: string) => Promise<void>;
  transferProximity: number; // Distance to transfer point in km
  transferThreshold: number; // Distance threshold to trigger transfer (default: 2km)
}

interface UseLegTransitionReturn {
  transferStatus: TransferStatus;
  nextLegRequestStatus: NextLegRequestStatus;
  isTransitionVisible: boolean;
  errorMessage: string | null;
  estimatedArrivalTime: number | null;
  handleArrival: () => void;
  handleConfirmNextLeg: () => void;
  handleRetryRequest: () => void;
  handleCancelJourney: () => void;
  resetTransition: () => void;
}

export const useLegTransition = ({
  currentLeg,
  nextLeg,
  journey,
  onRequestNextLegTaxi,
  onProgressJourney,
  onCancelJourney,
  transferProximity,
  transferThreshold = 2.0,
}: UseLegTransitionProps): UseLegTransitionReturn => {
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('arriving');
  const [nextLegRequestStatus, setNextLegRequestStatus] = useState<NextLegRequestStatus>('pending');
  const [isTransitionVisible, setIsTransitionVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState<number | null>(null);
  const [requestTimeout, setRequestTimeout] = useState<NodeJS.Timeout | null>(null);

  // Calculate estimated arrival time based on proximity
  useEffect(() => {
    if (transferProximity <= transferThreshold && transferStatus === 'arriving') {
      // Estimate arrival time based on proximity (assuming average speed of 30 km/h)
      const estimatedMinutes = (transferProximity / 30) * 60;
      const arrivalTime = Date.now() + (estimatedMinutes * 60 * 1000);
      setEstimatedArrivalTime(arrivalTime);
    }
  }, [transferProximity, transferThreshold, transferStatus]);

  // Monitor proximity to transfer point
  useEffect(() => {
    if (transferProximity <= transferThreshold && transferStatus === 'arriving') {
      setTransferStatus('arrived');
      setIsTransitionVisible(true);
    }
  }, [transferProximity, transferThreshold, transferStatus]);

  // Auto-request next leg when arrived at transfer point
  useEffect(() => {
    if (transferStatus === 'arrived' && nextLegRequestStatus === 'pending') {
      handleRequestNextLeg();
    }
  }, [transferStatus, nextLegRequestStatus]);

  const handleRequestNextLeg = useCallback(async () => {
    try {
      setTransferStatus('requesting');
      setNextLegRequestStatus('pending');
      setErrorMessage(null);

      // Set timeout for request (30 seconds)
      const timeout = setTimeout(() => {
        setNextLegRequestStatus('timeout');
        setErrorMessage('Request timed out. Please try again.');
        setTransferStatus('failed');
      }, 30000);

      setRequestTimeout(timeout);

      // Request next leg taxi
      await onRequestNextLegTaxi(journey.journeyId, nextLeg.legIndex);
      
      // Clear timeout if successful
      if (timeout) {
        clearTimeout(timeout);
      }

      setNextLegRequestStatus('success');
      setTransferStatus('confirmed');
    } catch (error: any) {
      console.error('Error requesting next leg:', error);
      setNextLegRequestStatus('failed');
      setTransferStatus('failed');
      setErrorMessage(error?.message || 'Failed to request next leg taxi');
      
      // Clear timeout on error
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }
    }
  }, [journey.journeyId, nextLeg.legIndex, onRequestNextLegTaxi, requestTimeout]);

  const handleArrival = useCallback(() => {
    if (transferStatus === 'arriving') {
      setTransferStatus('arrived');
      setIsTransitionVisible(true);
    }
  }, [transferStatus]);

  const handleConfirmNextLeg = useCallback(async () => {
    try {
      // Progress to next leg
      await onProgressJourney(journey.journeyId, currentLeg.legIndex);
      
      // Reset transition state
      resetTransition();
      
      Alert.alert(
        'Leg Confirmed',
        'You have successfully transitioned to the next leg of your journey.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error confirming next leg:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to confirm next leg. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [journey.journeyId, currentLeg.legIndex, onProgressJourney]);

  const handleRetryRequest = useCallback(async () => {
    setErrorMessage(null);
    await handleRequestNextLeg();
  }, [handleRequestNextLeg]);

  const handleCancelJourney = useCallback(async () => {
    Alert.alert(
      'Cancel Journey',
      'Are you sure you want to cancel the entire multi-leg journey? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await onCancelJourney(journey.journeyId);
              resetTransition();
              
              Alert.alert(
                'Journey Cancelled',
                'Your multi-leg journey has been cancelled.',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('Error cancelling journey:', error);
              Alert.alert(
                'Error',
                error?.message || 'Failed to cancel journey. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  }, [journey.journeyId, onCancelJourney]);

  const resetTransition = useCallback(() => {
    setTransferStatus('arriving');
    setNextLegRequestStatus('pending');
    setIsTransitionVisible(false);
    setErrorMessage(null);
    setEstimatedArrivalTime(null);
    
    if (requestTimeout) {
      clearTimeout(requestTimeout);
      setRequestTimeout(null);
    }
  }, [requestTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }
    };
  }, [requestTimeout]);

  return {
    transferStatus,
    nextLegRequestStatus,
    isTransitionVisible,
    errorMessage,
    estimatedArrivalTime,
    handleArrival,
    handleConfirmNextLeg,
    handleRetryRequest,
    handleCancelJourney,
    resetTransition,
  };
};

export default useLegTransition;
