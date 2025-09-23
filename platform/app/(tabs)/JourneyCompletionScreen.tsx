import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

interface JourneyLegSummary {
  legIndex: number;
  fromAddress: string;
  toAddress: string;
  estimatedFare: number;
  actualFare: number;
  status: string;
  completedAt?: number;
  driverInfo?: {
    name: string;
    phoneNumber: string;
  };
}

interface JourneyCompletionData {
  journeyId: string;
  totalLegs: number;
  completedLegs: number;
  totalEstimatedFare: number;
  totalActualFare: number;
  totalDuration: number;
  completedAt: number;
  legs: JourneyLegSummary[];
  overallEfficiencyScore?: number;
}

interface JourneyCompletionScreenProps {
  journeyData: JourneyCompletionData;
  onFeedbackRequest: () => void;
  onViewAnalytics: () => void;
  onClose: () => void;
  visible?: boolean;
}

export const JourneyCompletionScreen: React.FC<JourneyCompletionScreenProps> = ({
  journeyData,
  onFeedbackRequest,
  onViewAnalytics,
  onClose,
  visible = true,
}) => {
  const { theme, isDark } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const formatDuration = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatFare = (fare: number): string => {
    return `R${fare.toFixed(2)}`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEfficiencyColor = (score?: number): string => {
    if (!score) return theme.textSecondary;
    if (score >= 4) return '#4CAF50'; // Green
    if (score >= 3) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getEfficiencyLabel = (score?: number): string => {
    if (!score) return 'Calculating...';
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Needs Improvement';
  };

  const fareVariance = journeyData.totalActualFare - journeyData.totalEstimatedFare;
  const fareVariancePercentage = journeyData.totalEstimatedFare > 0
    ? (fareVariance / journeyData.totalEstimatedFare) * 100
    : 0;

  const handleViewAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      await onViewAnalytics();
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const renderLegSummary = (leg: JourneyLegSummary) => (
    <View key={leg.legIndex} style={dynamicStyles.legSummaryCard}>
      <View style={dynamicStyles.legHeader}>
        <Text style={dynamicStyles.legTitle}>Leg {leg.legIndex + 1}</Text>
        <View style={[
          dynamicStyles.statusBadge,
          leg.status === 'completed' ? dynamicStyles.statusCompleted : dynamicStyles.statusFailed
        ]}>
          <Text style={dynamicStyles.statusText}>
            {leg.status === 'completed' ? 'Completed' : 'Failed'}
          </Text>
        </View>
      </View>

      <Text style={dynamicStyles.legRoute}>
        {leg.fromAddress} → {leg.toAddress}
      </Text>

      <View style={dynamicStyles.legMetrics}>
        <View style={dynamicStyles.metricItem}>
          <Text style={dynamicStyles.metricLabel}>Fare:</Text>
          <Text style={dynamicStyles.metricValue}>
            {formatFare(leg.actualFare)}
            {leg.actualFare !== leg.estimatedFare && (
              <Text style={dynamicStyles.metricVariance}>
                {' '}({leg.actualFare > leg.estimatedFare ? '+' : ''}{formatFare(leg.actualFare - leg.estimatedFare)})
              </Text>
            )}
          </Text>
        </View>

        {leg.completedAt && (
          <View style={dynamicStyles.metricItem}>
            <Text style={dynamicStyles.metricLabel}>Completed:</Text>
            <Text style={dynamicStyles.metricValue}>{formatTime(leg.completedAt)}</Text>
          </View>
        )}
      </View>

      {leg.driverInfo && (
        <View style={dynamicStyles.driverInfo}>
          <Icon name="person" size={14} color={theme.textSecondary} />
          <Text style={dynamicStyles.driverName}>{leg.driverInfo.name}</Text>
        </View>
      )}
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      paddingVertical: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      alignItems: 'center',
    },
    successIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#4CAF50',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    summarySection: {
      backgroundColor: theme.surface,
      margin: 16,
      borderRadius: 12,
      padding: 20,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    summaryItem: {
      width: '48%',
      marginBottom: 16,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    summaryValueLarge: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.primary,
    },
    efficiencySection: {
      backgroundColor: theme.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    efficiencyScore: {
      fontSize: 32,
      fontWeight: '700',
      marginBottom: 8,
    },
    efficiencyLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    efficiencyDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    detailsSection: {
      backgroundColor: theme.surface,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },
    detailsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    detailsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    detailsContent: {
      padding: 20,
    },
    legSummaryCard: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    legHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    legTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusCompleted: {
      backgroundColor: '#4CAF50',
    },
    statusFailed: {
      backgroundColor: '#F44336',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    legRoute: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    legMetrics: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    metricItem: {
      flex: 1,
    },
    metricLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    metricValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    metricVariance: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    driverInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    driverName: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 30,
      paddingTop: 10,
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F5F5F5',
      borderRadius: 25,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButton: {
      flex: 1,
      backgroundColor: theme.primary,
      borderRadius: 25,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (!visible) return null;

  return (
    <View style={dynamicStyles.container}>
      <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
        <Icon name="close" size={20} color={theme.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.successIcon}>
            <Icon name="checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text style={dynamicStyles.headerTitle}>Journey Complete!</Text>
          <Text style={dynamicStyles.headerSubtitle}>
            {journeyData.totalLegs > 1
              ? `Your ${journeyData.totalLegs}-leg journey has been completed successfully.`
              : 'Your journey has been completed successfully.'
            }
          </Text>
        </View>

        <View style={dynamicStyles.summarySection}>
          <Text style={dynamicStyles.summaryTitle}>Journey Summary</Text>
          <View style={dynamicStyles.summaryGrid}>
            <View style={dynamicStyles.summaryItem}>
              <Text style={dynamicStyles.summaryLabel}>Total Fare</Text>
              <Text style={dynamicStyles.summaryValueLarge}>
                {formatFare(journeyData.totalActualFare)}
              </Text>
              {fareVariance !== 0 && (
                <Text style={[dynamicStyles.summaryLabel, { marginTop: 2 }]}>
                  {fareVariance > 0 ? '+' : ''}{formatFare(fareVariance)} vs estimated
                </Text>
              )}
            </View>

            <View style={dynamicStyles.summaryItem}>
              <Text style={dynamicStyles.summaryLabel}>Duration</Text>
              <Text style={dynamicStyles.summaryValue}>
                {formatDuration(journeyData.totalDuration)}
              </Text>
            </View>

            <View style={dynamicStyles.summaryItem}>
              <Text style={dynamicStyles.summaryLabel}>Legs Completed</Text>
              <Text style={dynamicStyles.summaryValue}>
                {journeyData.completedLegs} of {journeyData.totalLegs}
              </Text>
            </View>

            <View style={dynamicStyles.summaryItem}>
              <Text style={dynamicStyles.summaryLabel}>Completed At</Text>
              <Text style={dynamicStyles.summaryValue}>
                {formatTime(journeyData.completedAt)}
              </Text>
            </View>
          </View>
        </View>

        {journeyData.overallEfficiencyScore && (
          <View style={dynamicStyles.efficiencySection}>
            <Text style={[
              dynamicStyles.efficiencyScore,
              { color: getEfficiencyColor(journeyData.overallEfficiencyScore) }
            ]}>
              {journeyData.overallEfficiencyScore.toFixed(1)}/5.0
            </Text>
            <Text style={[
              dynamicStyles.efficiencyLabel,
              { color: getEfficiencyColor(journeyData.overallEfficiencyScore) }
            ]}>
              {getEfficiencyLabel(journeyData.overallEfficiencyScore)}
            </Text>
            <Text style={dynamicStyles.efficiencyDescription}>
              Overall journey efficiency score
            </Text>
          </View>
        )}

        <View style={dynamicStyles.detailsSection}>
          <TouchableOpacity
            style={dynamicStyles.detailsHeader}
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={dynamicStyles.detailsTitle}>Leg Details</Text>
            <Icon
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {showDetails && (
            <View style={dynamicStyles.detailsContent}>
              {journeyData.legs.map(renderLegSummary)}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={dynamicStyles.actionButtons}>
        <TouchableOpacity
          style={dynamicStyles.secondaryButton}
          onPress={handleViewAnalytics}
          disabled={analyticsLoading}
        >
          {analyticsLoading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Text style={dynamicStyles.secondaryButtonText}>View Analytics</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.primaryButton}
          onPress={onFeedbackRequest}
        >
          <Text style={dynamicStyles.primaryButtonText}>Rate Journey</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JourneyCompletionScreen;