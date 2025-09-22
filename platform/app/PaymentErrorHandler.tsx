import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';

interface PaymentErrorHandlerProps {
  journeyId: string;
  legIndex: number;
  rideId: string;
  error: {
    type: 'network' | 'validation' | 'server' | 'user_cancelled' | 'other';
    message: string;
    attemptNumber?: number;
  };
  onRetry: () => void;
  onDismiss: () => void;
}

export default function PaymentErrorHandler({
  journeyId,
  legIndex,
  rideId,
  error,
  onRetry,
  onDismiss,
}: PaymentErrorHandlerProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const recoveryOptions = useQuery(api.functions.journeys.paymentRecovery.getPaymentRecoveryOptions, {
    journeyId,
    legIndex,
  });

  const handleRecovery = useMutation(api.functions.journeys.paymentRecovery.handlePaymentRecovery);
  const logFailure = useMutation(api.functions.journeys.paymentRecovery.logPaymentFailure);

  React.useEffect(() => {
    // Log the payment failure when component mounts
    const logError = async () => {
      try {
        await logFailure({
          journeyId,
          legIndex,
          rideId,
          errorDetails: {
            errorType: error.type,
            errorMessage: error.message,
            attemptNumber: error.attemptNumber || 1,
            timestamp: Date.now(),
          },
        });
      } catch (logErr) {
        console.error('Failed to log payment error:', logErr);
      }
    };

    logError();
  }, []);

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Ionicons name="wifi-off" size={48} color="#E74C3C" />;
      case 'validation':
        return <Ionicons name="alert-circle" size={48} color="#FF9900" />;
      case 'server':
        return <Ionicons name="server" size={48} color="#E74C3C" />;
      case 'user_cancelled':
        return <Ionicons name="hand-left" size={48} color="#95A5A6" />;
      default:
        return <Ionicons name="warning" size={48} color="#E74C3C" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Connection Problem';
      case 'validation':
        return 'Payment Information Issue';
      case 'server':
        return 'System Error';
      case 'user_cancelled':
        return 'Payment Cancelled';
      default:
        return 'Payment Failed';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network':
        return 'Unable to connect to payment services. Please check your internet connection.';
      case 'validation':
        return 'There was an issue with the payment information provided.';
      case 'server':
        return 'Our payment system is currently experiencing issues. Please try again.';
      case 'user_cancelled':
        return 'Payment was cancelled. You can try again or contact support.';
      default:
        return error.message || 'An unexpected error occurred during payment.';
    }
  };

  const handleRetryPayment = async () => {
    setIsProcessing(true);
    try {
      await handleRecovery({
        journeyId,
        legIndex,
        recoveryAction: 'retry',
      });
      onRetry();
    } catch (err) {
      console.error('Recovery retry failed:', err);
      Alert.alert('Error', 'Unable to retry payment. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelJourney = () => {
    Alert.alert(
      'Cancel Journey',
      'Are you sure you want to cancel your entire multi-leg journey? This cannot be undone.',
      [
        { text: 'No, Keep Journey', style: 'cancel' },
        {
          text: 'Yes, Cancel Journey',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await handleRecovery({
                journeyId,
                legIndex,
                recoveryAction: 'cancel_journey',
              });
              router.push('/HomeScreen');
            } catch (err) {
              console.error('Journey cancellation failed:', err);
              Alert.alert('Error', 'Unable to cancel journey. Please contact support.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    const supportInfo = recoveryOptions?.emergencyContact;
    if (supportInfo) {
      Alert.alert(
        'Contact Support',
        `Phone: ${supportInfo.phone}\nEmail: ${supportInfo.email}\n\nPlease mention your journey ID: ${journeyId}`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Call Support',
            onPress: () => {
              // In a real app, this would open the phone dialer
              // Linking.openURL(`tel:${supportInfo.phone}`);
            },
          },
        ]
      );
    }
  };

  if (!recoveryOptions) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading recovery options...</Text>
      </View>
    );
  }

  const attemptNumber = error.attemptNumber || 1;
  const maxAttempts = 3;
  const canRetry = attemptNumber < maxAttempts;

  return (
    <View style={styles.container}>
      <View style={styles.errorCard}>
        {/* Error Icon and Title */}
        <View style={styles.errorHeader}>
          {getErrorIcon()}
          <Text style={styles.errorTitle}>{getErrorTitle()}</Text>
          <Text style={styles.errorDescription}>{getErrorDescription()}</Text>
        </View>

        {/* Attempt Information */}
        <View style={styles.attemptInfo}>
          <Text style={styles.attemptText}>
            Attempt {attemptNumber} of {maxAttempts}
          </Text>
          {!canRetry && (
            <Text style={styles.maxAttemptsText}>
              Maximum retry attempts reached. Please contact support.
            </Text>
          )}
        </View>

        {/* Recovery Actions */}
        <View style={styles.actionsContainer}>
          {canRetry && (
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={handleRetryPayment}
              disabled={isProcessing}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {isProcessing ? 'Processing...' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.supportButton]}
            onPress={handleContactSupport}
            disabled={isProcessing}
          >
            <Ionicons name="help-circle" size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
              Contact Support
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelJourney}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle" size={20} color="#E74C3C" />
            <Text style={[styles.actionButtonText, { color: '#E74C3C' }]}>
              Cancel Journey
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dismissButton]}
            onPress={onDismiss}
            disabled={isProcessing}
          >
            <Text style={[styles.actionButtonText, { color: '#666' }]}>
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={16} color="#FF9900" />
          <Text style={styles.noticeText}>
            Payment is required to continue your multi-leg journey. You cannot proceed to the next leg without completing payment for this leg.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B2B2B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  attemptInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  attemptText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  maxAttemptsText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#2ECC71',
  },
  supportButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  dismissButton: {
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  noticeText: {
    fontSize: 12,
    color: '#e67e22',
    flex: 1,
    lineHeight: 16,
  },
});