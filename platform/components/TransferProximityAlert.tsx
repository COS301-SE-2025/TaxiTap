import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface TransferProximityStatus {
  journeyId: string;
  currentLegIndex: number;
  distanceToTransfer: number;
  isNearTransfer: boolean;
  transferPoint: {
    stop1_id: string;
    stop2_id: string;
    walkingDistance: number;
    estimatedWalkingTime: number;
  };
  estimatedArrival: string;
}

interface TransferProximityAlertProps {
  proximityStatus: TransferProximityStatus | null;
  isVisible: boolean;
  onClose: () => void;
}

export const TransferProximityAlert: React.FC<TransferProximityAlertProps> = ({
  proximityStatus,
  isVisible,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  if (!isVisible || !proximityStatus) {
    return null;
  }

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const formatWalkingTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    return `${Math.round(minutes)} min`;
  };

  const getStatusColor = () => {
    if (proximityStatus.distanceToTransfer <= 0.1) return '#10B981'; // Green - Arrived
    if (proximityStatus.isNearTransfer) return '#F59E0B'; // Orange - Near
    return '#6B7280'; // Gray - Far
  };

  const getStatusText = () => {
    if (proximityStatus.distanceToTransfer <= 0.1) return 'Transfer Point Reached!';
    if (proximityStatus.isNearTransfer) return 'Approaching Transfer Point';
    return 'En Route to Transfer Point';
  };

  const getStatusIcon = () => {
    if (proximityStatus.distanceToTransfer <= 0.1) return 'checkmark-circle';
    if (proximityStatus.isNearTransfer) return 'location';
    return 'navigate';
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
    statusTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    legInfo: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark
        ? 'rgba(71, 85, 105, 0.3)'
        : 'rgba(226, 232, 240, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsContainer: {
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.1)'
        : 'rgba(59, 130, 246, 0.05)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    lastDetailRow: {
      marginBottom: 0,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '600',
    },
    transferInfo: {
      backgroundColor: isDark
        ? 'rgba(249, 115, 22, 0.1)'
        : 'rgba(249, 115, 22, 0.05)',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(249, 115, 22, 0.2)'
        : 'rgba(249, 115, 22, 0.1)',
    },
    transferTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#F97316',
      marginBottom: 8,
      textAlign: 'center',
    },
    transferDetail: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });

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
          <Text style={dynamicStyles.statusTitle}>
            {getStatusText()}
          </Text>
          <Text style={dynamicStyles.legInfo}>
            Leg {proximityStatus.currentLegIndex + 1} • ETA: {proximityStatus.estimatedArrival}
          </Text>
        </View>
        <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
          <Icon name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.detailsContainer}>
        <View style={dynamicStyles.detailRow}>
          <Text style={dynamicStyles.detailLabel}>Distance to Transfer</Text>
          <Text style={dynamicStyles.detailValue}>
            {formatDistance(proximityStatus.distanceToTransfer)}
          </Text>
        </View>
        <View style={[dynamicStyles.detailRow, dynamicStyles.lastDetailRow]}>
          <Text style={dynamicStyles.detailLabel}>Status</Text>
          <Text style={[dynamicStyles.detailValue, { color: statusColor }]}>
            {proximityStatus.isNearTransfer ? 'Near Transfer Point' : 'En Route'}
          </Text>
        </View>
      </View>

      {proximityStatus.isNearTransfer && (
        <View style={dynamicStyles.transferInfo}>
          <Text style={dynamicStyles.transferTitle}>
            Prepare for Transfer
          </Text>
          <Text style={dynamicStyles.transferDetail}>
            After completing this leg, you'll need to walk {formatDistance(proximityStatus.transferPoint.walkingDistance)} ({formatWalkingTime(proximityStatus.transferPoint.estimatedWalkingTime)}) to catch your next taxi.
          </Text>
        </View>
      )}
    </View>
  );
};