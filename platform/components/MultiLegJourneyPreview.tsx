import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  
  // Screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;

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
      flex: 1,
      backgroundColor: theme.background,
      width: '100%',
      height: '100%',
    },
    header: {
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingTop: Platform.OS === 'ios' ? (screenHeight > 800 ? 80 : 70) : 60,
      paddingBottom: 20,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
      marginTop: 8,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 16,
      textAlign: 'center',
    },
    noOptionsContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    noOptionsIcon: {
      marginBottom: 16,
      opacity: 0.5,
    },
    noOptionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    noOptionsText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    scrollContainer: {
      flex: 1,
    },
    optionCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      // Cross-platform shadow handling
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
      }),
    },
    optionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    totalCostContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    totalCostLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginRight: 8,
      fontWeight: '500',
    },
    totalCost: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    optionIndex: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIndexText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    legContainer: {
      marginBottom: 16,
    },
    legHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    legIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 16,
    },
    leg1Indicator: {
      backgroundColor: theme.primary,
    },
    leg2Indicator: {
      backgroundColor: '#FF6B6B',
    },
    legContent: {
      flex: 1,
    },
    routeName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
      lineHeight: 20,
    },
    routeDetails: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    legCost: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    transferContainer: {
      marginVertical: 12,
      padding: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    transferHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    transferTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 6,
    },
    transferDetails: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 22,
    },
    selectButton: {
      backgroundColor: '#F59E0B',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginTop: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    selectButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (isLoading) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerRow}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Finding Multi-Leg Routes</Text>
          </View>
        </View>
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.loadingContainer}>
            <LoadingSpinner size="large" />
            <Text style={dynamicStyles.loadingText}>
              Calculating transfer points and route options...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (journeyOptions.length === 0) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerRow}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>No Multi-Leg Options</Text>
          </View>
        </View>
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.noOptionsContainer}>
            <Ionicons
              name="map-outline"
              size={48}
              color={theme.textSecondary}
              style={dynamicStyles.noOptionsIcon}
            />
            <Text style={dynamicStyles.noOptionsTitle}>
              No Multi-Leg Routes Available
            </Text>
            <Text style={dynamicStyles.noOptionsText}>
              No multi-leg journey options are available between your origin and destination.
              {'\n\n'}
              Try selecting different locations or check direct routes instead.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Multi-Leg Journey Options</Text>
        </View>
      </View>

      <View style={dynamicStyles.content}>
        <Text style={dynamicStyles.sectionTitle}>
          Available Journey Options
        </Text>
        <ScrollView
          style={dynamicStyles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: Platform.OS === 'ios' ? 40 : 20
          }}
        >
          {journeyOptions.map((option, index) => (
            <TouchableOpacity
              key={option.journeyId}
              style={dynamicStyles.optionCard}
              onPress={() => handleSelectOption(option)}
              activeOpacity={0.7}
            >
              <View style={dynamicStyles.optionHeader}>
                <View style={dynamicStyles.totalCostContainer}>
                  <Text style={dynamicStyles.totalCostLabel}>Total:</Text>
                  <Text style={dynamicStyles.totalCost}>
                    R{option.totalEstimatedCost.toFixed(2)}
                  </Text>
                </View>
                <View style={dynamicStyles.optionIndex}>
                  <Text style={dynamicStyles.optionIndexText}>{index + 1}</Text>
                </View>
              </View>

               {/* Leg 1 */}
               <View style={dynamicStyles.legContainer}>
                 <View style={dynamicStyles.legHeader}>
                   <View style={[dynamicStyles.legIndicator, dynamicStyles.leg1Indicator]} />
                   <View style={dynamicStyles.legContent}>
                     <Text style={dynamicStyles.routeName} numberOfLines={1}>
                       {option.leg1.routeName}
                     </Text>
                     <Text style={dynamicStyles.routeDetails} numberOfLines={2}>
                       {option.leg1.origin.address} → {option.leg1.destination.address}
                     </Text>
                   </View>
                   <Text style={dynamicStyles.legCost}>
                     R{option.leg1.estimatedCost.toFixed(2)}
                   </Text>
                 </View>
               </View>

              {/* Transfer Point */}
              <View style={dynamicStyles.transferContainer}>
                <View style={dynamicStyles.transferHeader}>
                  <Ionicons name="walk" size={16} color={theme.primary} />
                  <Text style={dynamicStyles.transferTitle}>Transfer Required</Text>
                </View>
                <Text style={dynamicStyles.transferDetails}>
                  Walk {formatDistance(option.transferPoint.walkingDistance)} • {formatWalkingTime(option.transferPoint.estimatedWalkingTime)}
                </Text>
              </View>

               {/* Leg 2 */}
               <View style={dynamicStyles.legContainer}>
                 <View style={dynamicStyles.legHeader}>
                   <View style={[dynamicStyles.legIndicator, dynamicStyles.leg2Indicator]} />
                   <View style={dynamicStyles.legContent}>
                     <Text style={dynamicStyles.routeName} numberOfLines={1}>
                       {option.leg2.routeName}
                     </Text>
                     <Text style={dynamicStyles.routeDetails} numberOfLines={2}>
                       {option.leg2.origin.address} → {option.leg2.destination.address}
                     </Text>
                   </View>
                   <Text style={dynamicStyles.legCost}>
                     R{option.leg2.estimatedCost.toFixed(2)}
                   </Text>
                 </View>
               </View>

              <TouchableOpacity
                style={dynamicStyles.selectButton}
                onPress={() => handleSelectOption(option)}
                activeOpacity={0.8}
              >
                <Text style={dynamicStyles.selectButtonText}>
                  Select This Route
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};