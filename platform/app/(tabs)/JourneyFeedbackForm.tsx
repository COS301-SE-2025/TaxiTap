import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

interface JourneyLegData {
  legIndex: number;
  fromAddress: string;
  toAddress: string;
  estimatedFare: number;
  actualFare: number;
  driverInfo?: {
    driverId: string;
    name: string;
    phoneNumber: string;
  };
  rideInfo?: {
    rideId: string;
    status: string;
  };
}

interface JourneyData {
  journeyId: string;
  totalLegs: number;
  originAddress: string;
  destinationAddress: string;
  estimatedTotalFare: number;
  completedAt: number;
  legs: JourneyLegData[];
}

interface LegFeedback {
  legIndex: number;
  driverId?: string;
  rideId?: string;
  rating: number;
  comment?: string;
  issues?: string[];
}

interface TransferFeedback {
  transferIndex: number;
  rating: number;
  waitTime?: number;
  issues?: string[];
  suggestions?: string;
}

interface JourneyMetrics {
  totalDuration: number;
  expectedDuration: number;
  totalCost: number;
  expectedCost: number;
  wouldUseAgain: boolean;
  wouldRecommend: boolean;
}

interface JourneyFeedbackFormProps {
  journeyData: JourneyData;
  onSubmit: (feedbackData: any) => Promise<void>;
  onCancel: () => void;
  visible?: boolean;
}

export const JourneyFeedbackForm: React.FC<JourneyFeedbackFormProps> = ({
  journeyData,
  onSubmit,
  onCancel,
  visible = true,
}) => {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form data
  const [overallRating, setOverallRating] = useState(0);
  const [overallComment, setOverallComment] = useState('');
  const [legFeedback, setLegFeedback] = useState<LegFeedback[]>([]);
  const [transferFeedback, setTransferFeedback] = useState<TransferFeedback[]>([]);
  const [journeyMetrics, setJourneyMetrics] = useState<JourneyMetrics>({
    totalDuration: 0,
    expectedDuration: 0,
    totalCost: journeyData.estimatedTotalFare,
    expectedCost: journeyData.estimatedTotalFare,
    wouldUseAgain: true,
    wouldRecommend: true,
  });
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');

  const steps = [
    'Overall Rating',
    'Leg Details',
    'Transfer Experience',
    'Journey Metrics',
    'Final Comments'
  ];

  useEffect(() => {
    // Initialize leg feedback array
    const initialLegFeedback = journeyData.legs.map(leg => ({
      legIndex: leg.legIndex,
      driverId: leg.driverInfo?.driverId,
      rideId: leg.rideInfo?.rideId,
      rating: 0,
      comment: '',
      issues: []
    }));
    setLegFeedback(initialLegFeedback);

    // Initialize transfer feedback array (one less than total legs)
    const initialTransferFeedback = Array.from({ length: journeyData.totalLegs - 1 }, (_, index) => ({
      transferIndex: index,
      rating: 0,
      waitTime: 0,
      issues: [],
      suggestions: ''
    }));
    setTransferFeedback(initialTransferFeedback);

    // Calculate actual journey duration and cost
    const actualDuration = Date.now() - journeyData.completedAt;
    const actualCost = journeyData.legs.reduce((sum, leg) => sum + leg.actualFare, 0);

    setJourneyMetrics(prev => ({
      ...prev,
      totalDuration: actualDuration,
      totalCost: actualCost,
    }));
  }, [journeyData]);

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating for your journey.');
      return;
    }

    setLoading(true);
    try {
      const feedbackData = {
        journeyId: journeyData.journeyId,
        passengerId: 'current_user_id', // This would come from auth context
        overallRating,
        overallComment,
        legFeedback: legFeedback.filter(lf => lf.rating > 0), // Only include rated legs
        transferFeedback: transferFeedback.filter(tf => tf.rating > 0), // Only include rated transfers
        journeyMetrics,
        improvementSuggestions,
        additionalComments,
      };

      await onSubmit(feedbackData);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateLegFeedback = (legIndex: number, field: keyof LegFeedback, value: any) => {
    setLegFeedback(prev => prev.map(lf =>
      lf.legIndex === legIndex ? { ...lf, [field]: value } : lf
    ));
  };

  const updateTransferFeedback = (transferIndex: number, field: keyof TransferFeedback, value: any) => {
    setTransferFeedback(prev => prev.map(tf =>
      tf.transferIndex === transferIndex ? { ...tf, [field]: value } : tf
    ));
  };

  const renderStarRating = (rating: number, onPress: (rating: number) => void, size = 24) => (
    <View style={dynamicStyles.starContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onPress(star)}>
          <Icon
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? '#FFD700' : theme.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverallRatingStep = () => (
    <View style={dynamicStyles.stepContainer}>
      <Text style={dynamicStyles.stepTitle}>How was your overall journey?</Text>
      <Text style={dynamicStyles.stepSubtitle}>
        Rate your complete {journeyData.totalLegs}-leg journey experience
      </Text>

      <View style={dynamicStyles.centerContent}>
        {renderStarRating(overallRating, setOverallRating, 32)}
        <Text style={dynamicStyles.ratingLabel}>
          {overallRating === 0 ? 'Tap to rate' :
           overallRating === 1 ? 'Poor' :
           overallRating === 2 ? 'Fair' :
           overallRating === 3 ? 'Good' :
           overallRating === 4 ? 'Very Good' : 'Excellent'}
        </Text>
      </View>

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Share your overall experience (optional)"
        placeholderTextColor={theme.textSecondary}
        value={overallComment}
        onChangeText={setOverallComment}
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderLegDetailsStep = () => (
    <View style={dynamicStyles.stepContainer}>
      <Text style={dynamicStyles.stepTitle}>Rate Each Leg</Text>
      <Text style={dynamicStyles.stepSubtitle}>
        How was each individual leg of your journey?
      </Text>

      {journeyData.legs.map(leg => {
        const feedback = legFeedback.find(lf => lf.legIndex === leg.legIndex);
        return (
          <View key={leg.legIndex} style={dynamicStyles.legCard}>
            <Text style={dynamicStyles.legTitle}>Leg {leg.legIndex + 1}</Text>
            <Text style={dynamicStyles.legRoute}>
              {leg.fromAddress} → {leg.toAddress}
            </Text>

            {leg.driverInfo && (
              <Text style={dynamicStyles.driverName}>
                Driver: {leg.driverInfo.name}
              </Text>
            )}

            {renderStarRating(
              feedback?.rating || 0,
              (rating) => updateLegFeedback(leg.legIndex, 'rating', rating)
            )}

            <TextInput
              style={dynamicStyles.smallTextInput}
              placeholder="Comments about this leg (optional)"
              placeholderTextColor={theme.textSecondary}
              value={feedback?.comment || ''}
              onChangeText={(text) => updateLegFeedback(leg.legIndex, 'comment', text)}
              multiline
              numberOfLines={2}
            />
          </View>
        );
      })}
    </View>
  );

  const renderTransferExperienceStep = () => {
    if (journeyData.totalLegs < 2) {
      return (
        <View style={dynamicStyles.stepContainer}>
          <Text style={dynamicStyles.stepTitle}>No Transfers</Text>
          <Text style={dynamicStyles.stepSubtitle}>
            Your journey had only one leg, so no transfers were required.
          </Text>
        </View>
      );
    }

    return (
      <View style={dynamicStyles.stepContainer}>
        <Text style={dynamicStyles.stepTitle}>Transfer Experience</Text>
        <Text style={dynamicStyles.stepSubtitle}>
          How smooth were the transfers between taxis?
        </Text>

        {transferFeedback.map(transfer => {
          return (
            <View key={transfer.transferIndex} style={dynamicStyles.transferCard}>
              <Text style={dynamicStyles.transferTitle}>
                Transfer {transfer.transferIndex + 1}
              </Text>
              <Text style={dynamicStyles.transferDescription}>
                Between Leg {transfer.transferIndex + 1} and Leg {transfer.transferIndex + 2}
              </Text>

              {renderStarRating(
                transfer.rating,
                (rating) => updateTransferFeedback(transfer.transferIndex, 'rating', rating)
              )}

              <View style={dynamicStyles.waitTimeContainer}>
                <Text style={dynamicStyles.waitTimeLabel}>Wait time (minutes):</Text>
                <TextInput
                  style={dynamicStyles.numberInput}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  value={transfer.waitTime?.toString() || ''}
                  onChangeText={(text) => updateTransferFeedback(transfer.transferIndex, 'waitTime', parseInt(text) || 0)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderJourneyMetricsStep = () => (
    <View style={dynamicStyles.stepContainer}>
      <Text style={dynamicStyles.stepTitle}>Journey Assessment</Text>
      <Text style={dynamicStyles.stepSubtitle}>
        Help us understand your journey experience
      </Text>

      <View style={dynamicStyles.metricsContainer}>
        <View style={dynamicStyles.metricRow}>
          <Text style={dynamicStyles.metricLabel}>Expected journey time (minutes):</Text>
          <TextInput
            style={dynamicStyles.numberInput}
            placeholder="60"
            placeholderTextColor={theme.textSecondary}
            value={Math.round(journeyMetrics.expectedDuration / 60000).toString()}
            onChangeText={(text) => setJourneyMetrics(prev => ({
              ...prev,
              expectedDuration: (parseInt(text) || 0) * 60000
            }))}
            keyboardType="numeric"
          />
        </View>

        <View style={dynamicStyles.metricRow}>
          <Text style={dynamicStyles.metricLabel}>Expected total cost:</Text>
          <TextInput
            style={dynamicStyles.numberInput}
            placeholder="R0.00"
            placeholderTextColor={theme.textSecondary}
            value={journeyMetrics.expectedCost.toString()}
            onChangeText={(text) => setJourneyMetrics(prev => ({
              ...prev,
              expectedCost: parseFloat(text) || 0
            }))}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={dynamicStyles.booleanOption}
          onPress={() => setJourneyMetrics(prev => ({ ...prev, wouldUseAgain: !prev.wouldUseAgain }))}
        >
          <Icon
            name={journeyMetrics.wouldUseAgain ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={journeyMetrics.wouldUseAgain ? theme.primary : theme.textSecondary}
          />
          <Text style={dynamicStyles.booleanText}>Would use multi-leg journeys again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.booleanOption}
          onPress={() => setJourneyMetrics(prev => ({ ...prev, wouldRecommend: !prev.wouldRecommend }))}
        >
          <Icon
            name={journeyMetrics.wouldRecommend ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={journeyMetrics.wouldRecommend ? theme.primary : theme.textSecondary}
          />
          <Text style={dynamicStyles.booleanText}>Would recommend to others</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFinalCommentsStep = () => (
    <View style={dynamicStyles.stepContainer}>
      <Text style={dynamicStyles.stepTitle}>Additional Feedback</Text>
      <Text style={dynamicStyles.stepSubtitle}>
        Any suggestions or additional comments?
      </Text>

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="How can we improve the multi-leg journey experience?"
        placeholderTextColor={theme.textSecondary}
        value={improvementSuggestions}
        onChangeText={setImprovementSuggestions}
        multiline
        numberOfLines={3}
      />

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Any other comments about your journey?"
        placeholderTextColor={theme.textSecondary}
        value={additionalComments}
        onChangeText={setAdditionalComments}
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderOverallRatingStep();
      case 1: return renderLegDetailsStep();
      case 2: return renderTransferExperienceStep();
      case 3: return renderJourneyMetricsStep();
      case 4: return renderFinalCommentsStep();
      default: return renderOverallRatingStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return overallRating > 0;
      default: return true;
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    closeButton: {
      padding: 8,
    },
    progressContainer: {
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    progressBar: {
      height: 4,
      backgroundColor: isDark ? theme.background : '#F0F0F0',
      borderRadius: 2,
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    stepContainer: {
      padding: 20,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 24,
    },
    centerContent: {
      alignItems: 'center',
      marginBottom: 24,
    },
    starContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    ratingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    textInput: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    smallTextInput: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
      textAlignVertical: 'top',
      marginTop: 8,
    },
    numberInput: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
      textAlign: 'center',
      minWidth: 80,
    },
    legCard: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    legTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    legRoute: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    driverName: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    transferCard: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    transferTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    transferDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    waitTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    waitTimeLabel: {
      fontSize: 14,
      color: theme.text,
    },
    metricsContainer: {
      gap: 16,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    metricLabel: {
      fontSize: 16,
      color: theme.text,
      flex: 1,
    },
    booleanOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    booleanText: {
      fontSize: 16,
      color: theme.text,
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 30,
      paddingTop: 10,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    backButton: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F5F5F5',
      borderRadius: 25,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    backButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    nextButton: {
      flex: 2,
      backgroundColor: theme.primary,
      borderRadius: 25,
      paddingVertical: 16,
      alignItems: 'center',
    },
    nextButtonDisabled: {
      backgroundColor: theme.textSecondary,
    },
    nextButtonText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>Journey Feedback</Text>
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onCancel}>
            <Icon name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.progressContainer}>
          <View style={dynamicStyles.progressBar}>
            <View style={[
              dynamicStyles.progressFill,
              { width: `${((currentStep + 1) / steps.length) * 100}%` }
            ]} />
          </View>
          <Text style={dynamicStyles.progressText}>
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
          </Text>
        </View>

        <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
          {renderCurrentStep()}
        </ScrollView>

        <View style={dynamicStyles.buttonContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={() => setCurrentStep(prev => prev - 1)}
            >
              <Text style={dynamicStyles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              dynamicStyles.nextButton,
              !canProceed() && dynamicStyles.nextButtonDisabled
            ]}
            onPress={() => {
              if (currentStep === steps.length - 1) {
                handleSubmit();
              } else {
                setCurrentStep(prev => prev + 1);
              }
            }}
            disabled={!canProceed() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={isDark ? '#121212' : '#FFFFFF'} />
            ) : (
              <Text style={dynamicStyles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Submit Feedback' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default JourneyFeedbackForm;