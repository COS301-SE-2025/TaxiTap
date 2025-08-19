import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Image,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
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

export default function TaxiInformation() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const { t } = useLanguage();
  const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();

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
          showGlobalError('Error', 'Phone calls are not supported on this device', {
            duration: 4000,
            position: 'top',
            animation: 'slide-down',
          });
        }
      })
      .catch((err) => {
        console.error('Error opening phone app:', err);
        showGlobalError('Error', 'Could not open phone app', {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        });
      });
  };

  // Handle ride booking
  const handleBookRide = async () => {
    if (!selectedTaxi || !user?.id) {
      showGlobalError('Error', 'Please select a taxi and ensure you are logged in', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
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
            position: 'top',
            animation: 'slide-down',
          }
        );
      }
    } catch (error) {
      console.error('❌ Error creating ride request:', error);
      showGlobalError(
        'Booking Error',
        'Failed to send ride request. Please try again.',
        {
          duration: 0,
          actions: [
            {
              label: 'OK',
              onPress: () => console.log('Booking error acknowledged'),
              style: 'default',
            }
          ],
          position: 'top',
          animation: 'slide-down',
        }
      );
    } finally {
      setIsBooking(false);
    }
  };

  // Enhanced taxi card rendering with improved styling
  const renderTaxiCard = (taxi: any, index: number) => {
    const isEnhanced = taxi.routeInfo;
    const isSelected = selectedTaxi?._id === taxi._id;
    const fare = isEnhanced ? (taxi.routeInfo.calculatedFare || taxi.routeInfo.fare || 0).toFixed(2) : "0.00";
    
    return (
      <TouchableOpacity
        key={taxi._id || index}
        style={[
          dynamicStyles.taxiCard,
          isSelected && dynamicStyles.selectedTaxiCard
        ]}
        onPress={() => handleTaxiSelect(taxi)}
      >
        {/* Left side - Taxi details */}
        <View style={dynamicStyles.taxiInfo}>
          <View style={dynamicStyles.taxiHeader}>
            <View style={dynamicStyles.nameAndFareRow}>
              <Text style={dynamicStyles.taxiName}>
                {taxi.name || `${t('taxiInfo:driver')} ${index + 1}`}
              </Text>
              {isEnhanced && (
                <View style={dynamicStyles.fareDisplay}>
                  <Icon name="cash" size={16} color={theme.primary} />
                  <Text style={dynamicStyles.fareAmount}>R{fare}</Text>
                </View>
              )}
            </View>
            {isEnhanced && (
              <View style={dynamicStyles.distanceBadge}>
                <Text style={dynamicStyles.distanceText}>
                  {taxi.distanceToOrigin.toFixed(1)}{t('taxiInfo:km')}
                </Text>
              </View>
            )}
          </View>
          
          <View style={dynamicStyles.taxiDetails}>
            <View style={dynamicStyles.detailRow}>
              <Icon name="car" size={18} color={theme.textSecondary} />
              <Text style={dynamicStyles.taxiDetailText}>
                {taxi.vehicleModel || t('taxiInfo:vehicleInfoNotAvailable')}
              </Text>
            </View>
            
            <View style={dynamicStyles.detailRow}>
              <Icon name="card" size={18} color={theme.textSecondary} />
              <Text style={dynamicStyles.taxiDetailText}>
                {taxi.vehicleRegistration || t('taxiInfo:registrationNotAvailable')}
              </Text>
            </View>
            
            {isEnhanced && taxi.routeInfo && (
              <>
                <View style={dynamicStyles.detailRow}>
                  <Icon name="navigate" size={18} color={theme.primary} />
                  <Text style={dynamicStyles.routeInfoText}>
                    {t('taxiInfo:route')} {taxi.routeInfo.routeName}
                  </Text>
                </View>
                
                <View style={dynamicStyles.detailRow}>
                  <Icon name="speedometer" size={18} color={theme.textSecondary} />
                  <Text style={dynamicStyles.routeInfoText}>
                    {t('taxiInfo:distance')} {(taxi.routeInfo.passengerDisplacement || 0).toFixed(1)}{t('taxiInfo:km')}
                  </Text>
                </View>
                
                {taxi.routeInfo.closestStartStop && (
                  <View style={dynamicStyles.detailRow}>
                    <Icon name="location" size={18} color={theme.textSecondary} />
                    <Text style={dynamicStyles.stopInfoText}>
                      {t('taxiInfo:pickupNear')} {taxi.routeInfo.closestStartStop.name}
                      ({(taxi.routeInfo.closestStartStop.distanceFromOrigin || 0).toFixed(1)}{t('taxiInfo:km')})
                    </Text>
                  </View>
                )}
                
                {taxi.routeInfo.closestEndStop && (
                  <View style={dynamicStyles.detailRow}>
                    <Icon name="flag" size={18} color={theme.textSecondary} />
                    <Text style={dynamicStyles.stopInfoText}>
                      {t('taxiInfo:dropOffNear')} {taxi.routeInfo.closestEndStop.name}
                      ({(taxi.routeInfo.closestEndStop.distanceFromDestination || 0).toFixed(1)}{t('taxiInfo:km')})
                    </Text>
                  </View>
                )}
              </>
            )}
            
            {taxi.phoneNumber && (
              <TouchableOpacity
                style={dynamicStyles.callButton}
                onPress={() => handleCallDriver(taxi.phoneNumber)}
              >
                <Icon name="call" size={18} color={theme.primary} />
                <Text style={dynamicStyles.callButtonText}>{t('taxiInfo:callDriver')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Right side - Radio button centered */}
        <View style={dynamicStyles.taxiRightSection}>
          <View style={dynamicStyles.selectionContainer}>
            <Icon 
              name={isSelected ? "checkmark-circle" : "radio-button-off"} 
              size={32} 
              color={isSelected ? theme.primary : theme.textSecondary} 
            />
          </View>
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
      paddingTop: 10,
      paddingBottom: 20,
      backgroundColor: theme.primary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.buttonText || '#FFFFFF',
      opacity: 0.9,
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
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 20,
    },
    matchSummaryCard: {
      backgroundColor: isDark ? theme.surface : `${theme.primary}15`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    matchSummaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    matchSummaryText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    taxiCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      flexDirection: 'row',
    },
    selectedTaxiCard: {
      borderColor: theme.primary,
      borderWidth: 2,
      shadowOpacity: isDark ? 0.3 : 0.12,
      elevation: 4,
    },
    taxiInfo: {
      flex: 1,
    },
    taxiHeader: {
      marginBottom: 12,
    },
    nameAndFareRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    taxiName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    fareDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    fareAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.primary,
    },
    distanceBadge: {
      backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}15`,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    distanceText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    taxiDetails: {
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    taxiDetailText: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
    },
    routeInfoText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
      flex: 1,
    },
    fareText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
      flex: 1,
    },
    stopInfoText: {
      fontSize: 13,
      color: theme.textSecondary,
      flex: 1,
    },
    callButton: {
      backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}10`,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginTop: 8,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    callButtonText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    taxiRightSection: {
      width: 60,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      paddingVertical: 8,
    },
    selectionContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    noTaxisContainer: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      marginTop: 20,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    noTaxisTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    noTaxisText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 20,
    },
    noTaxisSubtext: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    bookButton: {
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    bookButtonText: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      position: 'absolute',
      top: 20,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      shadowColor: '#000',
      shadowOpacity: 0.2,
    },
    bookButtonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 15,
      paddingBottom: 5,
      backgroundColor: isDark ? theme.surface : '#FFFFFF',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      shadowColor: theme.shadow,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: -3 },
      shadowRadius: 6,
      elevation: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    backButton2: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle2: {
      fontSize: 22,
      fontWeight: '600',
      color: 'black',
      flex: 1,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable style={dynamicStyles.backButton2} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={dynamicStyles.headerTitle2}>{t('taxiInfo:availableTaxis')}</Text>
        </View>
        <Text style={dynamicStyles.headerSubtitle}>
          {currentName && currentName !== 'Current Location' ? currentName : t('common:currentLocation')}
          {' → '}
          {destinationName}
        </Text>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView 
          style={dynamicStyles.taxiList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {isLoadingTaxis ? (
            <View style={dynamicStyles.loadingContainer}>
              <LoadingSpinner size="large" />
              <Text style={dynamicStyles.loadingText}>{t('taxiInfo:findingAvailableTaxis')}</Text>
            </View>
          ) : nearbyTaxis.length > 0 ? (
            <>
              {/* Route match summary */}
              {routeMatchData && (
                <View style={dynamicStyles.matchSummaryCard}>
                  <Text style={dynamicStyles.matchSummaryTitle}>
                    {t('taxiInfo:foundTaxisOnRoutes').replace('{count}', routeMatchData.availableTaxis.length.toString())}
                  </Text>
                  <Text style={dynamicStyles.matchSummaryText}>
                    {t('taxiInfo:onMatchingRoutes').replace('{count}', routeMatchData.matchingRoutes.length.toString())}
                  </Text>
                  {estimatedFare && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Icon name="cash-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                      <Text style={[dynamicStyles.matchSummaryText, { color: theme.primary, fontWeight: '600' }]}>
                        Estimated Fare: R{parseFloat(estimatedFare).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Taxi cards */}
              {nearbyTaxis.map((taxi, index) => renderTaxiCard(taxi, index))}
            </>
          ) : (
            <View style={dynamicStyles.noTaxisContainer}>
              <Text style={dynamicStyles.noTaxisTitle}>{t('taxiInfo:noAvailableTaxis')}</Text>
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
          >
            <Text style={dynamicStyles.bookButtonText}>
              {isBooking ? t('taxiInfo:bookingRide') : t('taxiInfo:bookRideWith').replace('{name}', selectedTaxi.name)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}