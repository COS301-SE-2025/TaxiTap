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
  routeName?: string;
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

  // Debug logging
  React.useEffect(() => {
    console.log('🎭 MultiLegJourneyPreview received options:', {
      optionsCount: options.length,
      visible,
      hasDirectRoute,
      availableTaxis,
      multilegReason,
      options: options.map(opt => ({
        journeyId: opt.journeyId,
        totalLegs: opt.totalLegs,
        estimatedTotalDuration: opt.estimatedTotalDuration,
        estimatedTotalFare: opt.estimatedTotalFare
      }))
    });
  }, [options, visible, hasDirectRoute, availableTaxis, multilegReason]);
  
  // Gesture handling for drag interactions
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.y0 < 100;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dx) < 50;
    },
    onPanResponderGrant: () => {
      translateY.setOffset((translateY as any)._value);
      translateY.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      const newValue = Math.max(0, gestureState.dy);
      translateY.setValue(newValue);
    },
    onPanResponderRelease: (evt, gestureState) => {
      translateY.flattenOffset();
      
      if (gestureState.dy > 150) {
        Animated.timing(translateY, {
          toValue: 1000,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onCancel();
        });
        return;
      }
      
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    },
  });

  const formatDuration = (seconds: number): string => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatFare = (fare: number): string => {
    return `R${fare.toFixed(0)}`;
  };

  const getRouteTypeInfo = (preference: string) => {
    switch (preference) {
      case 'shortest_time':
        return { label: 'Fastest', icon: 'flash', color: '#4CAF50' };
      case 'fewest_transfers':
        return { label: 'Direct', icon: 'arrow-forward', color: '#2196F3' };
      case 'most_reliable':
        return { label: 'Reliable', icon: 'shield-checkmark', color: '#FF9800' };
      default:
        return { label: 'Route', icon: 'help', color: theme.textSecondary };
    }
  };

  // Don't show the modal if there's a direct route with available taxis
  if (hasDirectRoute && availableTaxis > 0) {
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

    onConfirm(selectedOption, selectedOption.optimizationPreference);
  };

  const renderSimplifiedLeg = (leg: JourneyLeg, isLast: boolean, totalLegs: number) => (
    <View key={leg.legIndex} style={dynamicStyles.legContainer}>
      <View style={dynamicStyles.legContent}>
        <View style={dynamicStyles.legNumber}>
          <Text style={dynamicStyles.legNumberText}>{leg.legIndex + 1}</Text>
        </View>
        
        <View style={dynamicStyles.legDetails}>
          {leg.routeName && (
            <Text style={dynamicStyles.legRouteName}>
              {leg.routeName}
            </Text>
          )}
          <Text style={dynamicStyles.legRoute}>
            {leg.fromAddress} → {leg.toAddress}
          </Text>
          <View style={dynamicStyles.legMeta}>
            <Text style={dynamicStyles.legTime}>{formatDuration(leg.estimatedDuration)}</Text>
            <Text style={dynamicStyles.legDot}>•</Text>
            <Text style={dynamicStyles.legFare}>{formatFare(leg.estimatedFare)}</Text>
          </View>
        </View>
      </View>
      
      {!isLast && (
        <View style={dynamicStyles.transferIndicator}>
          <View style={dynamicStyles.transferLine} />
          <View style={dynamicStyles.transferDot}>
            <Icon name="swap-horizontal" size={12} color={theme.primary} />
          </View>
        </View>
      )}
    </View>
  );

  const renderJourneyOption = (option: MultiLegJourneyOption, index: number) => {
    const routeInfo = getRouteTypeInfo(option.optimizationPreference);
    const isSelected = selectedOptionIndex === index;
    
    return (
      <TouchableOpacity
        key={option.journeyId}
        style={[
          dynamicStyles.optionCard,
          isSelected && dynamicStyles.optionCardSelected,
        ]}
        onPress={() => setSelectedOptionIndex(index)}
      >
        <View style={dynamicStyles.optionHeader}>
          <View style={dynamicStyles.routeTypeContainer}>
            <View style={[dynamicStyles.routeTypeBadge, { backgroundColor: routeInfo.color }]}>
              <Icon name={routeInfo.icon} size={14} color="white" />
            </View>
            <Text style={dynamicStyles.routeTypeLabel}>{routeInfo.label}</Text>
          </View>
          
          <View style={dynamicStyles.optionSummary}>
            <Text style={dynamicStyles.totalTime}>{formatDuration(option.estimatedTotalDuration)}</Text>
            <Text style={dynamicStyles.totalFare}>{formatFare(option.estimatedTotalFare)}</Text>
          </View>
        </View>

        <View style={dynamicStyles.transfersInfo}>
          <Text style={dynamicStyles.transfersText}>
            {option.totalLegs} rides • {option.totalLegs - 1} transfer{option.totalLegs - 1 !== 1 ? 's' : ''}
          </Text>
        </View>

        {isSelected && (
          <View style={dynamicStyles.legsList}>
            {option.legs.map((leg, legIndex) => 
              renderSimplifiedLeg(leg, legIndex === option.legs.length - 1, option.totalLegs)
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
      maxHeight: '85%',
      paddingTop: 20,
    },
    closeButton: {
      position: 'absolute',
      top: 15,
      right: 15,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    header: {
      alignItems: 'center',
      paddingBottom: 20,
      marginHorizontal: 20,
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.textSecondary,
      borderRadius: 2,
      marginBottom: 20,
      opacity: 0.3,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    contentContainer: {
      paddingHorizontal: 20,
    },
    optionsContainer: {
      marginBottom: 20,
    },
    optionCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    optionCardSelected: {
      borderColor: theme.primary,
      backgroundColor: isDark ? 'rgba(255, 184, 77, 0.08)' : 'rgba(255, 184, 77, 0.08)',
      borderWidth: 2,
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    routeTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    routeTypeBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeTypeLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    optionSummary: {
      alignItems: 'flex-end',
    },
    totalTime: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 2,
    },
    totalFare: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    transfersInfo: {
      marginBottom: 4,
    },
    transfersText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    legsList: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    legContainer: {
      marginBottom: 8,
    },
    legContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    legNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    legNumberText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#121212' : '#FFFFFF',
    },
    legDetails: {
      flex: 1,
    },
    legRouteName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      marginBottom: 2,
    },
    legRoute: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 4,
    },
    legMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legTime: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    legDot: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    legFare: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.primary,
    },
    transferIndicator: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    transferLine: {
      width: 2,
      height: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      marginBottom: 4,
    },
    transferDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 184, 77, 0.2)' : 'rgba(255, 184, 77, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonContainer: {
      paddingHorizontal: 20,
      paddingBottom: 30,
      paddingTop: 10,
      backgroundColor: theme.surface,
    },
    confirmButton: {
      backgroundColor: theme.primary,
      borderRadius: 25,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    confirmButtonText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
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
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onCancel}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <View style={dynamicStyles.header}>
            <View style={dynamicStyles.dragHandle} />
            <Text style={dynamicStyles.headerTitle}>Multiple Rides Needed</Text>
            <Text style={dynamicStyles.headerSubtitle}>
              No direct route available. Choose your preferred journey below.
            </Text>
          </View>

          <ScrollView style={dynamicStyles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={dynamicStyles.optionsContainer}>
              {options.map((option, index) => renderJourneyOption(option, index))}
            </View>
          </ScrollView>

          <View style={dynamicStyles.buttonContainer}>
            <TouchableOpacity style={dynamicStyles.confirmButton} onPress={handleConfirm}>
              <Text style={dynamicStyles.confirmButtonText}>Book Journey</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default MultiLegJourneyPreview;