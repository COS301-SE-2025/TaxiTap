import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useUser } from '../../contexts/UserContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { Ionicons } from '@expo/vector-icons';

// DestinationBox with essential route information only
const DestinationBox = ({ 
  startLocation, 
  endLocation, 
  availableTaxisCount, 
  routeInfo,
  estimatedDuration 
}: {
  startLocation: { name: string; latitude: number; longitude: number };
  endLocation: { name: string; latitude: number; longitude: number };
  availableTaxisCount: number;
  routeInfo?: any;
  estimatedDuration?: number;
}) => {
  const { theme, isDark } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)',
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    routeContainer: {
      marginBottom: 20,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    locationIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 16,
    },
    startIndicator: {
      backgroundColor: theme.primary,
    },
    endIndicator: {
      backgroundColor: '#FF6B6B',
    },
    locationText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    arrowContainer: {
      alignItems: 'center',
      marginVertical: 4,
    },
    arrow: {
      marginLeft: 6,
    },
    // Route details section
    routeInfoContainer: {
      backgroundColor: isDark ? `${theme.primary}08` : `${theme.primary}05`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    routeDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    routeDetailIcon: {
      marginRight: 12,
      width: 16,
    },
    routeDetailText: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
      fontWeight: '500',
    },
    // Bottom summary
    summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark 
        ? 'rgba(71, 85, 105, 0.2)' 
        : 'rgba(226, 232, 240, 0.5)',
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryIcon: {
      marginRight: 8,
    },
    summaryText: {
      fontSize: 14,
      fontWeight: '600',
    },
    taxiCountText: {
      color: availableTaxisCount > 0 ? '#10B981' : theme.textSecondary,
    },
    routeText: {
      color: theme.primary,
    },
  });

  // Parse route name from routeInfo if available
  const getRouteNames = () => {
    if (routeInfo?.routeName) {
      // Parse route name in format "Start - End"
      const parts = routeInfo.routeName.split('-').map((part: any) => part.trim());
      if (parts.length >= 2) {
        return { start: parts[0], end: parts[1] };
      }
    }
    // Fallback to location names
    return { start: startLocation.name, end: endLocation.name };
  };

  const { start: startName, end: endName } = getRouteNames();

  return (
    <View style={dynamicStyles.container}>
      {/* Route Display */}
      <View style={dynamicStyles.routeContainer}>
        <View style={dynamicStyles.locationRow}>
          <View style={[dynamicStyles.locationIndicator, dynamicStyles.startIndicator]} />
          <Text style={dynamicStyles.locationText}>{startName}</Text>
        </View>

        <View style={dynamicStyles.arrowContainer}>
          <Icon 
            name="arrow-down" 
            size={16} 
            color={theme.textSecondary} 
            style={dynamicStyles.arrow}
          />
        </View>

        <View style={dynamicStyles.locationRow}>
          <View style={[dynamicStyles.locationIndicator, dynamicStyles.endIndicator]} />
          <Text style={dynamicStyles.locationText}>{endName}</Text>
        </View>
      </View>

      {/* Route Information */}
      {routeInfo && (
        <View style={dynamicStyles.routeInfoContainer}>
          <View style={dynamicStyles.routeDetailRow}>
            <Icon name="location-outline" size={16} color={theme.textSecondary} style={dynamicStyles.routeDetailIcon} />
            <Text style={dynamicStyles.routeDetailText}>
              {(routeInfo.passengerDisplacement || routeInfo.totalDistance || 0).toFixed(1)} km
            </Text>
          </View>

          {estimatedDuration && (
            <View style={dynamicStyles.routeDetailRow}>
              <Icon name="time" size={16} color={theme.textSecondary} style={dynamicStyles.routeDetailIcon} />
              <Text style={dynamicStyles.routeDetailText}>
                ~{Math.round(estimatedDuration / 60)} minutes
              </Text>
            </View>
          )}

          {(routeInfo.calculatedFare || routeInfo.fare) && (
            <View style={dynamicStyles.routeDetailRow}>
              <Icon name="cash-outline" size={16} color={theme.primary} style={dynamicStyles.routeDetailIcon} />
              <Text style={dynamicStyles.routeDetailText}>
                R{(routeInfo.calculatedFare || routeInfo.fare).toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Summary */}
      <View style={dynamicStyles.summaryContainer}>
        <View style={dynamicStyles.summaryItem}>
          <Icon 
            name="car-outline" 
            size={18} 
            color={availableTaxisCount > 0 ? '#10B981' : theme.textSecondary} 
            style={dynamicStyles.summaryIcon}
          />
          <Text style={[dynamicStyles.summaryText, dynamicStyles.taxiCountText]}>
            {availableTaxisCount} available
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function TaxiInformation() {
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const { t } = useLanguage();
  const { showGlobalError, showGlobalSuccess } = useAlertHelpers();

  // Get route parameters
  const {
    destinationName,
    destinationLat,
    destinationLng,
    currentName,
    currentLat,
    currentLng,
    routeId,
    availableTaxisCount,
    routeMatchData: routeMatchDataString,
    estimatedFare,
  } = useLocalSearchParams<{
    destinationName: string;
    destinationLat: string;
    destinationLng: string;
    currentName: string;
    currentLat: string;
    currentLng: string;
    routeId: string;
    availableTaxisCount?: string;
    routeMatchData?: string;
    estimatedFare?: string;
  }>();

  // State management
  const [selectedTaxi, setSelectedTaxi] = useState<any>(null);
  const [nearbyTaxis, setNearbyTaxis] = useState<any[]>([]);
  const [availableTaxis, setAvailableTaxis] = useState<any[]>([]);
  const [routeMatchData, setRouteMatchData] = useState<any>(null);
  const [isLoadingTaxis, setIsLoadingTaxis] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Convex mutations
  const requestRide = useMutation(api.functions.rides.RequestRide.requestRide);

  // Process enhanced data from HomeScreen
  useEffect(() => {
    if (routeMatchDataString) {
      try {
        const parsedData = JSON.parse(routeMatchDataString);
        setRouteMatchData(parsedData);
        setAvailableTaxis(parsedData.availableTaxis || []);
        setIsLoadingTaxis(false);
        
        console.log('📊 TaxiInformation received enhanced data:', {
          availableTaxis: parsedData.availableTaxis?.length || 0,
          matchingRoutes: parsedData.matchingRoutes?.length || 0
        });
        
        // Transform enhanced data to display format
        const enhancedTaxiData = parsedData.availableTaxis?.map((taxi: any) => ({
          _id: taxi.driverId,
          userId: taxi.userId,
          latitude: taxi.currentLocation.latitude,
          longitude: taxi.currentLocation.longitude,
          name: taxi.name,
          phoneNumber: taxi.phoneNumber,
          vehicleRegistration: taxi.vehicleRegistration,
          vehicleModel: taxi.vehicleModel,
          distanceToOrigin: taxi.distanceToOrigin,
          routeInfo: taxi.routeInfo,
          displayName: `${taxi.name} - ${taxi.vehicleModel}`,
          displayDistance: `${taxi.distanceToOrigin}${t('taxiInfo:km')} ${t('taxiInfo:away')}`,
          routeName: taxi.routeInfo.routeName,
          fare: taxi.routeInfo.calculatedFare,
        })) || [];
        
        setNearbyTaxis(enhancedTaxiData);
        
      } catch (error) {
        console.error('❌ Error parsing route match data:', error);
        setIsLoadingTaxis(false);
      }
    } else {
      console.log('⚠️ No enhanced data received, falling back to original query');
      setIsLoadingTaxis(false);
    }
  }, [routeMatchDataString, t]);

  // Fallback query for backward compatibility
  const shouldUseOriginalQuery = !routeMatchDataString;
  
  const fallbackNearbyTaxis = useQuery(
    api.functions.routes.enhancedTaxiMatching.getNearbyTaxisForRouteRequest,
    shouldUseOriginalQuery && currentLat && currentLng && destinationLat && destinationLng
      ? {
          passengerLat: parseFloat(currentLat),
          passengerLng: parseFloat(currentLng),
          passengerEndLat: parseFloat(destinationLat),
          passengerEndLng: parseFloat(destinationLng),
        }
      : "skip"
  );

  // Use fallback data if no enhanced data was provided
  useEffect(() => {
    if (shouldUseOriginalQuery && fallbackNearbyTaxis) {
      console.log('📱 Using fallback taxi query result');
      setNearbyTaxis(fallbackNearbyTaxis);
      setIsLoadingTaxis(false);
    }
  }, [fallbackNearbyTaxis, shouldUseOriginalQuery]);

  // Animation for book button
  useEffect(() => {
    if (selectedTaxi) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      buttonOpacity.setValue(0);
    }
  }, [selectedTaxi]);

  // Handle taxi selection
  const handleTaxiSelect = (taxi: any) => {
    setSelectedTaxi(taxi);
  };

  // Handle phone call
  const handleCallDriver = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          showGlobalError('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        console.error('Error opening phone app:', err);
        showGlobalError('Error', 'Could not open phone app');
      });
  };

  // Handle ride booking
  const handleBookRide = async () => {
    if (!selectedTaxi || !user?.id) {
      showGlobalError('Error', 'Please select a taxi and ensure you are logged in');
      return;
    }

    setIsBooking(true);

    try {
      const rideData = {
        passengerId: user.id as Id<"taxiTap_users">,
        driverId: selectedTaxi.userId as Id<"taxiTap_users">,
        startLocation: {
          coordinates: {
            latitude: parseFloat(currentLat),
            longitude: parseFloat(currentLng),
          },
          address: currentName,
        },
        endLocation: {
          coordinates: {
            latitude: parseFloat(destinationLat),
            longitude: parseFloat(destinationLng),
          },
          address: destinationName,
        },
        estimatedFare: selectedTaxi.routeInfo?.calculatedFare || selectedTaxi.routeInfo?.fare || 0,
      };

      console.log('📝 Creating ride request:', rideData);

      const result = await requestRide(rideData);

      if (result) {
        showGlobalSuccess(
          t('taxiInfo:rideRequestSent'),
          t('taxiInfo:rideRequestMessage').replace('{name}', selectedTaxi.name),
          {
            duration: 0,
            actions: [
              {
                label: t('common:ok'),
                onPress: () => {
                  router.push({
                    pathname: './PassengerReservation',
                    params: {
                      currentLat,
                      currentLng,
                      currentName,
                      destinationLat,
                      destinationLng,
                      destinationName,
                      driverId: selectedTaxi.userId,
                      driverName: selectedTaxi.name,
                      fare: (selectedTaxi.routeInfo?.calculatedFare || selectedTaxi.routeInfo?.fare || 0).toString(),
                      rideId: result.rideId,
                    },
                  });
                },
                style: 'default',
              },
            ],
          }
        );
      }
    } catch (error) {
      console.error('❌ Error creating ride request:', error);
      showGlobalError('Booking Error', 'Failed to send ride request. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

   // taxi card with cleaner layout
   const renderTaxiCard = (taxi: any, index: number) => {
     const isEnhanced = taxi.routeInfo;
     const isSelected = selectedTaxi?._id === taxi._id;
    
    return (
      <TouchableOpacity
        key={taxi._id || index}
        style={[
          dynamicStyles.taxiCard,
          isSelected && dynamicStyles.selectedTaxiCard
        ]}
        onPress={() => handleTaxiSelect(taxi)}
        activeOpacity={0.7}
      >
         {/* Header with selection */}
         <View style={dynamicStyles.cardHeader}>
           <View style={dynamicStyles.taxiInfo}>
             <Text style={dynamicStyles.taxiName}>
               {taxi.name || `${t('taxiInfo:driver')} ${index + 1}`}
             </Text>
             <Text style={dynamicStyles.vehicleText}>
               {taxi.vehicleModel} • {taxi.vehicleRegistration}
             </Text>
           </View>
           
           <View style={dynamicStyles.selectionContainer}>
             <Ionicons 
               name={isSelected ? "checkmark-circle" : "radio-button-off"} 
               size={24} 
               color={isSelected ? theme.primary : theme.textSecondary} 
             />
           </View>
         </View>

        {/* Distance and call button */}
        <View style={dynamicStyles.cardFooter}>
          {isEnhanced && (
            <View style={dynamicStyles.distanceInfo}>
              <Ionicons name="location" size={16} color={theme.primary} />
              <Text style={dynamicStyles.distanceText}>
                {taxi.distanceToOrigin.toFixed(1)}{t('taxiInfo:km')} away
              </Text>
            </View>
          )}

          {taxi.phoneNumber && (
            <TouchableOpacity
              style={dynamicStyles.callButton}
              onPress={() => handleCallDriver(taxi.phoneNumber)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={theme.primary} />
              <Text style={dynamicStyles.callButtonText}>{t('taxiInfo:call')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      opacity: 0.8,
      lineHeight: 20,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    taxiList: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 20,
      textAlign: 'center',
    },
    sectionHeader: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    taxiCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.15 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    selectedTaxiCard: {
      borderColor: theme.primary,
      borderWidth: 2,
      shadowOpacity: isDark ? 0.25 : 0.12,
      elevation: 6,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    taxiInfo: {
      flex: 1,
      marginRight: 12,
    },
    taxiName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    vehicleText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
     selectionContainer: {
       alignItems: 'flex-end',
     },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    distanceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    distanceText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.primary,
    },
    callButton: {
      backgroundColor: isDark ? `${theme.primary}15` : `${theme.primary}08`,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    callButtonText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    noTaxisContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginTop: 40,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.15 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    noTaxisIcon: {
      marginBottom: 16,
      opacity: 0.6,
    },
    noTaxisTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    noTaxisText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 8,
    },
    noTaxisSubtext: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      opacity: 0.8,
    },
    bookButtonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      paddingBottom: 34,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    bookButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 6,
    },
    bookButtonText: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerRow}>
          <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={dynamicStyles.headerTitle}>Available Taxis</Text>
        </View>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView 
          style={dynamicStyles.taxiList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Destination Box - Route info only shown here */}
          <DestinationBox
            startLocation={{
              name: currentName || 'Current Location',
              latitude: parseFloat(currentLat || '0'),
              longitude: parseFloat(currentLng || '0'),
            }}
            endLocation={{
              name: destinationName || 'Destination',
              latitude: parseFloat(destinationLat || '0'),
              longitude: parseFloat(destinationLng || '0'),
            }}
            availableTaxisCount={nearbyTaxis.length}
            estimatedDuration={nearbyTaxis[0]?.routeInfo?.estimatedDuration}
            routeInfo={routeMatchData?.matchingRoutes?.[0] || nearbyTaxis[0]?.routeInfo}
          />

          {/* Taxi List Section */}
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>
              {isLoadingTaxis ? 'Finding Taxis...' : 'Select Your Driver'}
            </Text>
          </View>

          {isLoadingTaxis ? (
            <View style={dynamicStyles.loadingContainer}>
              <LoadingSpinner size="large" />
              <Text style={dynamicStyles.loadingText}>
                {t('taxiInfo:findingAvailableTaxis')}
              </Text>
            </View>
          ) : nearbyTaxis.length > 0 ? (
            nearbyTaxis.map((taxi, index) => renderTaxiCard(taxi, index))
          ) : (
            <View style={dynamicStyles.noTaxisContainer}>
              <Ionicons 
                name="car" 
                size={48} 
                color={theme.textSecondary} 
                style={dynamicStyles.noTaxisIcon}
              />
              <Text style={dynamicStyles.noTaxisTitle}>
                {t('taxiInfo:noAvailableTaxis')}
              </Text>
              <Text style={dynamicStyles.noTaxisText}>
                {routeMatchData?.message || t('taxiInfo:noTaxisMessage')}
              </Text>
              <Text style={dynamicStyles.noTaxisSubtext}>
                {t('taxiInfo:tryAdjustingLocation')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Book Ride Button */}
      {selectedTaxi && (
        <Animated.View 
          style={{ 
            opacity: buttonOpacity,
            ...dynamicStyles.bookButtonContainer
          }}
        >
          <TouchableOpacity
            style={dynamicStyles.bookButton}
            onPress={handleBookRide}
            disabled={isBooking}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.bookButtonText}>
              {isBooking 
                ? t('taxiInfo:bookingRide') 
                : t('taxiInfo:bookRideWith').replace('{name}', selectedTaxi.name)
              }
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}