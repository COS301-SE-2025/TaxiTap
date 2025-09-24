import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

interface JourneyLeg {
  legIndex: number;
  fromAddress: string;
  toAddress: string;
  fromCoordinates: { latitude: number; longitude: number };
  toCoordinates: { latitude: number; longitude: number };
  routeId?: string;
  estimatedFare: number;
  estimatedDuration: number;
  transferWindowStart?: number;
  transferWindowEnd?: number;
}

export interface MultiLegJourneyOption {
  journeyId: string;
  totalLegs: number;
  legs: JourneyLeg[];
  estimatedTotalFare: number;
  estimatedTotalDuration: number;
  optimizationPreference: 'shortest_time' | 'fewest_transfers' | 'most_reliable';
  transferPoints: string[];
}

interface MultiLegJourneyPreviewProps {
  options: MultiLegJourneyOption[];
  onConfirm: (selectedOption: MultiLegJourneyOption, preference: string) => void;
  onCancel: () => void;
  visible?: boolean;
  hasDirectRoute?: boolean;
  availableTaxis?: number;
  multilegReason?: 'no_direct_route' | 'no_taxis_available' | 'no_intersections';
}

export const MultiLegJourneyPreview: React.FC<MultiLegJourneyPreviewProps> = ({
  options,
  onConfirm,
  onCancel,
  visible = true,
  hasDirectRoute = false,
  availableTaxis = 0,
  multilegReason = 'no_direct_route',
}) => {
  const { theme, isDark } = useTheme();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [userPreference, setUserPreference] = useState<'shortest_time' | 'fewest_transfers' | 'most_reliable'>('shortest_time');
  
  // Gesture handling for drag interactions
  const translateY = useRef(new Animated.Value(0)).current;
  const lastGestureY = useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to gestures that start near the drag handle area
      return gestureState.y0 < 100; // Only respond if gesture starts in top 100px
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to vertical gestures with sufficient movement
      return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 50;
    },
    onPanResponderGrant: () => {
      // Reset the animated value when gesture starts
      translateY.setOffset(translateY._value);
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Only allow downward movement or small upward movement
      const newValue = Math.max(0, gestureState.dy); // Prevent upward dragging beyond original position
      translateY.setValue(newValue);
      lastGestureY.current = gestureState.dy;
    },
    onPanResponderRelease: (evt, gestureState) => {
      // Clear the offset
      translateY.flattenOffset();
      
      // If dragged down significantly, close the modal
      if (gestureState.dy > 150) {
        // Animate modal sliding down and close
        Animated.timing(translateY, {
          toValue: 1000,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onCancel();
        });
        return;
      }
      
      // If dragged up, snap back to original position
      if (gestureState.dy < -50) {
        // Animate modal expanding upward (could be extended for more functionality)
        Animated.spring(translateY, {
          toValue: -50,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
        return;
      }
      
      // Reset position for small movements
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    },
  });

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

  const getPreferenceLabel = (preference: string): string => {
    switch (preference) {
      case 'shortest_time':
        return 'Fastest Route';
      case 'fewest_transfers':
        return 'Fewest Transfers';
      case 'most_reliable':
        return 'Most Reliable';
      default:
        return 'Unknown';
    }
  };

  const getPreferenceIcon = (preference: string): string => {
    switch (preference) {
      case 'shortest_time':
        return 'time-outline';
      case 'fewest_transfers':
        return 'swap-horizontal-outline';
      case 'most_reliable':
        return 'shield-checkmark-outline';
      default:
        return 'help-outline';
    }
  };

  // Determine if multileg journey should be shown
  const shouldShowMultileg = !hasDirectRoute || availableTaxis === 0;
  
  // Get appropriate warning message based on reason
  const getWarningMessage = (): string => {
    switch (multilegReason) {
      case 'no_direct_route':
        return 'No single taxi route connects your origin and destination. You\'ll need to transfer between taxis. We\'ll help guide you through each leg.';
      case 'no_taxis_available':
        return 'No taxis are currently available for a direct route. A multi-leg journey with transfers is your best option.';
      case 'no_intersections':
        return 'No suitable transfer points found between routes. Please try a different destination or wait for more taxi availability.';
      default:
        return 'No direct route available. You\'ll need to transfer between taxis. We\'ll help guide you through each leg.';
    }
  };

  // Don't show the modal if there's a direct route with available taxis
  if (!shouldShowMultileg) {
    return null;
  }

  const handleConfirm = () => {
    if (options.length === 0) {
      Alert.alert('Error', 'No journey options available.');
      return;
    }

    const selectedOption = options[selectedOptionIndex];
    if (!selectedOption) {
      Alert.alert('Error', 'Please select a journey option.');
      return;
    }

    onConfirm(selectedOption, userPreference);
  };

  const renderJourneyLeg = (leg: JourneyLeg, isLast: boolean) => (
    <View key={leg.legIndex} style={dynamicStyles.legContainer}>
      <View style={dynamicStyles.legHeader}>
        <View style={dynamicStyles.legIndicator}>
          <View style={dynamicStyles.startDot} />
          {!isLast && (
            <View style={dynamicStyles.legLine}>
              {[...Array(6)].map((_, index) => (
                <View key={index} style={dynamicStyles.legLineDot} />
              ))}
            </View>
          )}
        </View>
        
        <View style={dynamicStyles.legInfo}>
          <Text style={dynamicStyles.legTitle}>Leg {leg.legIndex + 1}</Text>
          <Text style={dynamicStyles.legRoute}>
            {leg.fromAddress} → {leg.toAddress}
          </Text>
          <View style={dynamicStyles.legDetails}>
            <Text style={dynamicStyles.legTime}>
              {formatDuration(leg.estimatedDuration)}
            </Text>
            <Text style={dynamicStyles.legFare}>
              {formatFare(leg.estimatedFare)}
            </Text>
          </View>
        </View>
      </View>
      
      {!isLast && (
        <View style={dynamicStyles.transferInfo}>
          <Icon name="swap-horizontal" size={16} color={theme.primary} />
          <Text style={dynamicStyles.transferText}>Transfer required</Text>
        </View>
      )}
    </View>
  );

  const renderJourneyOption = (option: MultiLegJourneyOption, index: number) => (
    <TouchableOpacity
      key={option.journeyId}
      style={[
        dynamicStyles.optionCard,
        selectedOptionIndex === index && dynamicStyles.optionCardSelected,
      ]}
      onPress={() => setSelectedOptionIndex(index)}
    >
      <View style={dynamicStyles.optionHeader}>
        <View style={dynamicStyles.optionTitleContainer}>
          <Icon 
            name={getPreferenceIcon(option.optimizationPreference)} 
            size={20} 
            color={theme.primary} 
          />
          <Text style={dynamicStyles.optionTitle}>
            {getPreferenceLabel(option.optimizationPreference)}
          </Text>
        </View>
        <View style={dynamicStyles.optionSummary}>
          <Text style={dynamicStyles.totalTime}>
            {formatDuration(option.estimatedTotalDuration)}
          </Text>
          <Text style={dynamicStyles.totalFare}>
            {formatFare(option.estimatedTotalFare)}
          </Text>
        </View>
      </View>

      <View style={dynamicStyles.optionStats}>
        <View style={dynamicStyles.statItem}>
          <Icon name="layers-outline" size={16} color={theme.textSecondary} />
          <Text style={dynamicStyles.statText}>
            {option.totalLegs} legs
          </Text>
        </View>
        <View style={dynamicStyles.statItem}>
          <Icon name="location-outline" size={16} color={theme.textSecondary} />
          <Text style={dynamicStyles.statText}>
            {option.totalLegs - 1} transfers
          </Text>
        </View>
      </View>

      {selectedOptionIndex === index && (
        <View style={dynamicStyles.legsList}>
          {option.legs.map((leg, legIndex) => 
            renderJourneyLeg(leg, legIndex === option.legs.length - 1)
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderPreferenceSelector = () => (
    <View style={dynamicStyles.preferenceContainer}>
      <Text style={dynamicStyles.preferenceTitle}>Optimize for:</Text>
      <View style={dynamicStyles.preferenceButtons}>
        {[
          { key: 'shortest_time', label: 'Speed', icon: 'time-outline' },
          { key: 'fewest_transfers', label: 'Transfers', icon: 'swap-horizontal-outline' },
          { key: 'most_reliable', label: 'Reliability', icon: 'shield-checkmark-outline' },
        ].map((pref) => (
          <TouchableOpacity
            key={pref.key}
            style={[
              dynamicStyles.preferenceButton,
              userPreference === pref.key && dynamicStyles.preferenceButtonSelected,
            ]}
            onPress={() => setUserPreference(pref.key as any)}
          >
            <Icon 
              name={pref.icon} 
              size={18} 
              color={userPreference === pref.key ? (isDark ? '#121212' : '#FFFFFF') : theme.textSecondary} 
            />
            <Text style={[
              dynamicStyles.preferenceButtonText,
              userPreference === pref.key && dynamicStyles.preferenceButtonTextSelected,
            ]}>
              {pref.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      maxHeight: '90%',
      paddingTop: 20,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: 15,
      right: 15,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    header: {
      alignItems: 'center',
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginHorizontal: 20,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.textSecondary,
      borderRadius: 2,
      marginBottom: 15,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    contentContainer: {
      padding: 20,
    },
    warningContainer: {
      backgroundColor: isDark ? 'rgba(255, 184, 77, 0.1)' : '#FFF8E1',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    warningText: {
      color: theme.primary,
      fontSize: 14,
      flex: 1,
      marginLeft: 10,
      fontWeight: '500',
    },
    preferenceContainer: {
      marginBottom: 25,
    },
    preferenceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    preferenceButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    preferenceButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.background : '#F5F5F5',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
      gap: 6,
    },
    preferenceButtonSelected: {
      backgroundColor: theme.primary,
    },
    preferenceButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    preferenceButtonTextSelected: {
      color: isDark ? '#121212' : '#FFFFFF',
    },
    optionsContainer: {
      marginBottom: 20,
    },
    optionCard: {
      backgroundColor: isDark ? theme.background : '#F8F9FA',
      borderRadius: 15,
      padding: 15,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionCardSelected: {
      borderColor: theme.primary,
      backgroundColor: isDark ? 'rgba(255, 184, 77, 0.05)' : 'rgba(255, 184, 77, 0.1)',
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    optionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    optionSummary: {
      alignItems: 'flex-end',
    },
    totalTime: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    totalFare: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    optionStats: {
      flexDirection: 'row',
      gap: 20,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    legsList: {
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    legContainer: {
      marginBottom: 15,
    },
    legHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    legIndicator: {
      alignItems: 'center',
      marginRight: 12,
      paddingTop: 2,
    },
    startDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
      marginBottom: 8,
    },
    legLine: {
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 30,
    },
    legLineDot: {
      width: 2,
      height: 3,
      backgroundColor: theme.textSecondary,
      borderRadius: 1,
    },
    legInfo: {
      flex: 1,
    },
    legTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    legRoute: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 6,
    },
    legDetails: {
      flexDirection: 'row',
      gap: 15,
    },
    legTime: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    legFare: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
    },
    transferInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      marginLeft: 18,
      gap: 6,
    },
    transferText: {
      fontSize: 12,
      color: theme.primary,
      fontStyle: 'italic',
    },
    buttonContainer: {
      paddingHorizontal: 20,
      paddingBottom: 30,
      paddingTop: 10,
    },
    confirmButton: {
      backgroundColor: theme.primary,
      borderRadius: 25,
      paddingVertical: 16,
      alignItems: 'center',
    },
    confirmButtonText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={dynamicStyles.modalOverlay}>
        <Animated.View 
          style={[
            dynamicStyles.container,
            {
              transform: [{ translateY }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          {/* X button in top right corner */}
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onCancel}>
            <Icon name="close" size={24} color="#000000" />
          </TouchableOpacity>
          
          <View style={dynamicStyles.header}>
            <View style={dynamicStyles.dragHandle} />
            <Text style={dynamicStyles.headerTitle}>Multi-Leg Journey</Text>
            <Text style={dynamicStyles.headerSubtitle}>
              {hasDirectRoute && availableTaxis === 0 
                ? 'No taxis available for direct route. Choose your journey option below.'
                : 'No direct route available. Choose your journey option below.'
              }
            </Text>
          </View>

          <ScrollView style={dynamicStyles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.warningContainer}>
              <Icon name="information-circle" size={20} color={theme.primary} />
              <Text style={dynamicStyles.warningText}>
                {getWarningMessage()}
              </Text>
            </View>

            {renderPreferenceSelector()}

            <View style={dynamicStyles.optionsContainer}>
              {options.map((option, index) => renderJourneyOption(option, index))}
            </View>
          </ScrollView>

          <View style={dynamicStyles.buttonContainer}>
            <TouchableOpacity style={dynamicStyles.confirmButton} onPress={handleConfirm}>
              <Text style={dynamicStyles.confirmButtonText}>Start Journey</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default MultiLegJourneyPreview;