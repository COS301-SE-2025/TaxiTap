import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface MultiLegJourneyOption {
  journeyId: string;
  leg1: {
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
  };
  leg2: {
    routeName: string;
    origin: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    destination: {
      coordinates: { latitude: number; longitude: number };
      address: string;
    };
    originStopId: string;
    destinationStopId: string;
    estimatedCost: number;
  };
  totalEstimatedCost: number;
  transferPoint: {
    stop1_id: string;
    stop2_id: string;
    walkingDistance: number;
    estimatedWalkingTime: number;
  };
}

interface MultiLegJourneyPreviewProps {
  journeyOptions: MultiLegJourneyOption[];
  isLoading: boolean;
  onSelectOption: (option: MultiLegJourneyOption) => void;
  onClose: () => void;
}

export const MultiLegJourneyPreview: React.FC<MultiLegJourneyPreviewProps> = ({
  journeyOptions,
  isLoading,
  onSelectOption,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const formatWalkingTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    return `${Math.round(minutes)} min`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const handleSelectOption = (option: MultiLegJourneyOption) => {
    setSelectedOption(option.journeyId);
    onSelectOption(option);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDark
        ? 'rgba(30, 41, 59, 0.95)'
        : 'rgba(255, 255, 255, 0.95)',
      borderRadius: 20,
      padding: 24,
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(71, 85, 105, 0.3)'
        : 'rgba(226, 232, 240, 0.8)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark
        ? 'rgba(71, 85, 105, 0.3)'
        : 'rgba(226, 232, 240, 0.5)',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark
        ? 'rgba(71, 85, 105, 0.3)'
        : 'rgba(226, 232, 240, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    noOptionsContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    noOptionsText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    scrollContainer: {
      maxHeight: 400,
    },
    optionCard: {
      backgroundColor: isDark
        ? 'rgba(30, 41, 59, 0.8)'
        : 'rgba(255, 255, 255, 0.9)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(71, 85, 105, 0.3)'
        : 'rgba(226, 232, 240, 0.8)',
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    totalCost: {
      fontSize: 18,
      fontWeight: '700',
      color: '#10B981',
    },
    legContainer: {
      marginBottom: 12,
    },
    legHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    legNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#F59E0B',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    legNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    routeName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    legCost: {
      fontSize: 14,
      fontWeight: '600',
      color: '#10B981',
    },
    routeDetails: {
      marginLeft: 32,
    },
    routeText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    transferContainer: {
      marginTop: 8,
      padding: 12,
      backgroundColor: isDark
        ? 'rgba(59, 130, 246, 0.1)'
        : 'rgba(59, 130, 246, 0.05)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(59, 130, 246, 0.1)',
    },
    transferHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    transferIcon: {
      marginRight: 6,
    },
    transferTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: '#3B82F6',
    },
    transferDetails: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    selectButton: {
      backgroundColor: '#F59E0B',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 12,
      alignItems: 'center',
    },
    selectButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  if (isLoading) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>Finding Multi-Leg Routes...</Text>
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={dynamicStyles.loadingText}>
            Calculating transfer points...
          </Text>
        </View>
      </View>
    );
  }

  if (journeyOptions.length === 0) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>No Multi-Leg Options</Text>
          <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={dynamicStyles.noOptionsContainer}>
          <Icon name="map-outline" size={48} color={theme.textSecondary} />
          <Text style={dynamicStyles.noOptionsText}>
            No multi-leg journey options are available between your origin and destination.
            {'\n\n'}
            Try selecting different locations or check again later.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Multi-Leg Journey Options</Text>
        <TouchableOpacity style={dynamicStyles.closeButton} onPress={onClose}>
          <Icon name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={dynamicStyles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {journeyOptions.map((option, index) => (
          <TouchableOpacity
            key={option.journeyId}
            style={dynamicStyles.optionCard}
            onPress={() => handleSelectOption(option)}
            activeOpacity={0.7}
          >
            <View style={dynamicStyles.optionHeader}>
              <Text style={dynamicStyles.totalCost}>
                R{option.totalEstimatedCost.toFixed(2)}
              </Text>
            </View>

            {/* Leg 1 */}
            <View style={dynamicStyles.legContainer}>
              <View style={dynamicStyles.legHeader}>
                <View style={dynamicStyles.legNumber}>
                  <Text style={dynamicStyles.legNumberText}>1</Text>
                </View>
                <Text style={dynamicStyles.routeName} numberOfLines={1}>
                  {option.leg1.routeName}
                </Text>
                <Text style={dynamicStyles.legCost}>
                  R{option.leg1.estimatedCost.toFixed(2)}
                </Text>
              </View>
              <View style={dynamicStyles.routeDetails}>
                <Text style={dynamicStyles.routeText} numberOfLines={1}>
                  {option.leg1.origin.address} → {option.leg1.destination.address}
                </Text>
              </View>
            </View>

            {/* Transfer Point */}
            <View style={dynamicStyles.transferContainer}>
              <View style={dynamicStyles.transferHeader}>
                <Icon
                  name="walk"
                  size={14}
                  color="#3B82F6"
                  style={dynamicStyles.transferIcon}
                />
                <Text style={dynamicStyles.transferTitle}>Transfer</Text>
              </View>
              <Text style={dynamicStyles.transferDetails}>
                Walk {formatDistance(option.transferPoint.walkingDistance)} • {formatWalkingTime(option.transferPoint.estimatedWalkingTime)}
              </Text>
            </View>

            {/* Leg 2 */}
            <View style={dynamicStyles.legContainer}>
              <View style={dynamicStyles.legHeader}>
                <View style={dynamicStyles.legNumber}>
                  <Text style={dynamicStyles.legNumberText}>2</Text>
                </View>
                <Text style={dynamicStyles.routeName} numberOfLines={1}>
                  {option.leg2.routeName}
                </Text>
                <Text style={dynamicStyles.legCost}>
                  R{option.leg2.estimatedCost.toFixed(2)}
                </Text>
              </View>
              <View style={dynamicStyles.routeDetails}>
                <Text style={dynamicStyles.routeText} numberOfLines={1}>
                  {option.leg2.origin.address} → {option.leg2.destination.address}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={dynamicStyles.selectButton}
              onPress={() => handleSelectOption(option)}
            >
              <Text style={dynamicStyles.selectButtonText}>
                Select This Route
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};