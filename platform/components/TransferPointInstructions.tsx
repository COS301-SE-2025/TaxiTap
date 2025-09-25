import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

interface TransferPointInstructionsProps {
  journeyId: string;
  currentLegIndex: number;
  passengerLocation: {
    latitude: number;
    longitude: number;
  };
  visible: boolean;
  onClose: () => void;
  onNavigateToNextLeg: () => void;
}

export const TransferPointInstructions: React.FC<TransferPointInstructionsProps> = ({
  journeyId,
  currentLegIndex,
  passengerLocation,
  visible,
  onClose,
  onNavigateToNextLeg,
}) => {
  const { theme, isDark } = useTheme();
  const [slideAnim] = useState(new Animated.Value(0));

  // Get transfer point instructions
  const instructionsQuery = useQuery(
    api.functions.journeys.automaticSecondLegHandler.getTransferPointInstructions,
    visible ? {
      journeyId,
      currentLegIndex,
      passengerLocation
    } : "skip"
  );

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible || !instructionsQuery?.success) {
    return null;
  }

  const instructions = instructionsQuery.instructions;
  const { width } = Dimensions.get('window');

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived':
        return '#10B981';
      case 'approaching':
        return '#F59E0B';
      default:
        return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'arrived':
        return 'checkmark-circle';
      case 'approaching':
        return 'walk';
      default:
        return 'location';
    }
  };

  return (
    <Animated.View
      style={[
        dynamicStyles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerContent}>
          <Icon
            name={getStatusIcon(instructions.status)}
            size={24}
            color={getStatusColor(instructions.status)}
          />
          <Text style={dynamicStyles.title}>
            {instructions.status === 'arrived' ? 'Transfer Point Reached' : 'Walking to Transfer Point'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
          <Icon name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.content}>
        <View style={dynamicStyles.transferPointInfo}>
          <Text style={dynamicStyles.transferPointTitle}>Transfer Point</Text>
          <Text style={dynamicStyles.transferPointAddress}>
            {instructions.transferPoint.address}
          </Text>
        </View>

        <View style={dynamicStyles.distanceInfo}>
          <View style={dynamicStyles.distanceItem}>
            <Icon name="walk" size={16} color={theme.textSecondary} />
            <Text style={dynamicStyles.distanceText}>
              {formatDistance(instructions.walkingDistance)} to go
            </Text>
          </View>
          <View style={dynamicStyles.distanceItem}>
            <Icon name="time" size={16} color={theme.textSecondary} />
            <Text style={dynamicStyles.distanceText}>
              {formatTime(instructions.estimatedWalkingTime)} walk
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.instructionsList}>
          <Text style={dynamicStyles.instructionsTitle}>Instructions:</Text>
          {instructions.instructions.map((instruction: string, index: number) => (
            <View key={index} style={dynamicStyles.instructionItem}>
              <View style={dynamicStyles.instructionNumber}>
                <Text style={dynamicStyles.instructionNumberText}>{index + 1}</Text>
              </View>
              <Text style={dynamicStyles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>

        {instructions.status === 'arrived' && (
          <TouchableOpacity
            style={dynamicStyles.nextLegButton}
            onPress={onNavigateToNextLeg}
          >
            <Text style={dynamicStyles.nextLegButtonText}>Continue to Next Leg</Text>
            <Icon name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const dynamicStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  transferPointInfo: {
    marginBottom: 20,
  },
  transferPointTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  transferPointAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: 22,
  },
  distanceInfo: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  distanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  instructionsList: {
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  nextLegButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextLegButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransferPointInstructions;
