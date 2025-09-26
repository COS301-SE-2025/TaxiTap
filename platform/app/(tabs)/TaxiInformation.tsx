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
  Platform,
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
import DestinationBox from '../../components/DestinationBox';


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
    journeyId,
    isMultiLeg,
    currentLegIndex,
    totalLegs,
    originalDestinationName,
    originalCurrentName,
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
    journeyId?: string;
    isMultiLeg?: string;
    currentLegIndex?: string;
    totalLegs?: string;
    originalDestinationName?: string;
    originalCurrentName?: string;
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
  const getNextLegStatus = useQuery(
    api.functions.journeys.automaticSecondLegHandler.getNextLegStatus,
    isMultiLeg === 'true' && journeyId && currentLegIndex 
      ? {
          journeyId: journeyId as string,
          currentLegIndex: parseInt(currentLegIndex || '0')
        }
      : "skip"
  );

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

  // Clear selected taxi when no taxis are available
  useEffect(() => {
    if (nearbyTaxis.length === 0 && selectedTaxi) {
      setSelectedTaxi(null);
    }
  }, [nearbyTaxis.length, selectedTaxi]);

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
          showGlobalError(t('common:error'), t('taxiInfo:phoneNotSupported'));
        }
      })
      .catch((err) => {
        console.error('Error opening phone app:', err);
        showGlobalError(t('common:error'), t('taxiInfo:couldNotOpenPhone'));
      });
  };

  // Handle ride booking
  const handleBookRide = async () => {
    if (!selectedTaxi || !user?.id) {
      showGlobalError(t('common:error'), t('taxiInfo:selectTaxiError'));
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
        // Multi-leg journey fields
        parentJourneyId: isMultiLeg === 'true' ? journeyId : undefined,
        legIndex: isMultiLeg === 'true' ? parseInt(currentLegIndex || '0') : undefined,
        totalLegs: isMultiLeg === 'true' ? parseInt(totalLegs || '1') : undefined,
        isMultiLegRide: isMultiLeg === 'true',
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
                      // Multi-leg journey parameters
                      journeyId: isMultiLeg === 'true' ? journeyId : undefined,
                      isMultiLeg: isMultiLeg,
                      currentLegIndex: currentLegIndex,
                      totalLegs: totalLegs,
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
      showGlobalError(t('taxiInfo:bookingError'), t('taxiInfo:bookingErrorMessage'));
    } finally {
      setIsBooking(false);
    }
  };

   // Simplified taxi card
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
        <View style={dynamicStyles.cardContent}>
          {/* Left side - Driver info */}
          <View style={dynamicStyles.driverInfo}>
            <Text style={dynamicStyles.driverName}>
              {taxi.name || `${t('taxiInfo:driver')} ${index + 1}`}
            </Text>
            <Text style={dynamicStyles.vehicleInfo}>
              {taxi.vehicleModel}
            </Text>
            {isEnhanced && (
              <View style={dynamicStyles.distanceContainer}>
                <Ionicons name="location" size={12} color={theme.textSecondary} />
                <Text style={dynamicStyles.distanceText}>
                  {taxi.distanceToOrigin.toFixed(1)}km away
                </Text>
              </View>
            )}
          </View>

          {/* Right side - Actions */}
          <View style={dynamicStyles.cardActions}>
            <View style={dynamicStyles.selectionIndicator}>
              <Ionicons 
                name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color={isSelected ? theme.primary : theme.textSecondary} 
              />
            </View>
            
            {taxi.phoneNumber && (
              <TouchableOpacity
                style={dynamicStyles.callButton}
                onPress={() => handleCallDriver(taxi.phoneNumber)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color={theme.primary} />
              </TouchableOpacity>
            )}
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
      paddingTop: 50,
      paddingBottom: 16,
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
    journeyProgressBar: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      paddingHorizontal: 20,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      marginHorizontal: 4,
    },
    progressDotActive: {
      backgroundColor: theme.primary,
    },
    secondLegInfo: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
      borderRadius: 16,
      padding: 16,
      margin: 16,
      marginBottom: 8,
    },
    secondLegHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    secondLegTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    secondLegRoute: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    secondLegDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    secondLegFare: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.primary,
    },
    secondLegStatus: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    viewNextLegButton: {
      backgroundColor: theme.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 8,
    },
    viewNextLegButtonText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
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
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 16,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
      marginTop: 8,
    },
    taxiCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      // Cross-platform shadow handling
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    selectedTaxiCard: {
      borderColor: theme.primary,
      borderWidth: 2,
      ...Platform.select({
        ios: {
          shadowOpacity: isDark ? 0.3 : 0.1,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    cardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    driverInfo: {
      flex: 1,
      marginRight: 12,
    },
    driverName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    vehicleInfo: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    distanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    distanceText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectionIndicator: {
      padding: 4,
    },
    callButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noTaxisContainer: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      marginTop: 32,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    noTaxisIcon: {
      marginBottom: 12,
      opacity: 0.5,
    },
    noTaxisTitle: {
      fontSize: 16,
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
    },
    bookButtonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: Platform.OS === 'ios' ? 32 : 20,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    bookButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      // Cross-platform shadow for button
      ...Platform.select({
        ios: {
          shadowColor: theme.primary,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    bookButtonText: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Simplified Header */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerRow}>
          <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text style={dynamicStyles.headerTitle}>
            {isMultiLeg === 'true'
              ? `Multi-Leg Journey: Leg ${parseInt(currentLegIndex || '0') + 1} of ${totalLegs}`
              : 'Available Taxis'
            }
          </Text>
        </View>
        {isMultiLeg === 'true' && (
          <View style={dynamicStyles.journeyProgressBar}>
            {Array.from({length: parseInt(totalLegs || '1')}, (_, i) => (
              <View
                key={i}
                style={[
                  dynamicStyles.progressDot,
                  i <= parseInt(currentLegIndex || '0') && dynamicStyles.progressDotActive
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Second Leg Information - Show when next leg is available */}
      {isMultiLeg === 'true' && getNextLegStatus?.nextLegInfo && (
        <View style={dynamicStyles.secondLegInfo}>
          <View style={dynamicStyles.secondLegHeader}>
            <Ionicons name="arrow-forward-circle" size={24} color={theme.primary} />
            <Text style={dynamicStyles.secondLegTitle}>Next Leg Ready</Text>
          </View>
          <Text style={dynamicStyles.secondLegRoute}>
            {getNextLegStatus.nextLegInfo.fromAddress} → {getNextLegStatus.nextLegInfo.toAddress}
          </Text>
          <View style={dynamicStyles.secondLegDetails}>
            <Text style={dynamicStyles.secondLegFare}>
              R{getNextLegStatus.nextLegInfo.estimatedFare?.toFixed(0) || '0'}
            </Text>
            <Text style={dynamicStyles.secondLegStatus}>
              {getNextLegStatus.nextLegInfo.status === "drivers_available" 
                ? `${getNextLegStatus.nextLegInfo.availableDrivers} drivers available`
                : getNextLegStatus.nextLegInfo.status === "no_drivers_found"
                ? "Searching for drivers..."
                : "Preparing next leg..."
              }
            </Text>
          </View>
          {getNextLegStatus.nextLegInfo.status === "drivers_available" && (
            <TouchableOpacity 
              style={dynamicStyles.viewNextLegButton}
              onPress={() => {
                // Navigate to next leg taxi information
                router.push({
                  pathname: './TaxiInformation',
                  params: {
                    destinationName: getNextLegStatus.nextLegInfo.toAddress,
                    destinationLat: getNextLegStatus.nextLegInfo.toCoordinates.latitude.toString(),
                    destinationLng: getNextLegStatus.nextLegInfo.toCoordinates.longitude.toString(),
                    currentName: getNextLegStatus.nextLegInfo.fromAddress,
                    currentLat: getNextLegStatus.nextLegInfo.fromCoordinates.latitude.toString(),
                    currentLng: getNextLegStatus.nextLegInfo.fromCoordinates.longitude.toString(),
                    routeId: getNextLegStatus.nextLegInfo.routeId || '',
                    estimatedFare: getNextLegStatus.nextLegInfo.estimatedFare.toString(),
                    journeyId: journeyId as string,
                    isMultiLeg: 'true',
                    currentLegIndex: getNextLegStatus.nextLegInfo.legIndex.toString(),
                    totalLegs: totalLegs as string,
                    routeMatchData: JSON.stringify({
                      availableTaxis: [],
                      matchingRoutes: [],
                      success: true,
                      message: "Next leg drivers available"
                    })
                  }
                });
              }}
            >
              <Text style={dynamicStyles.viewNextLegButtonText}>View Next Leg</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView 
          style={dynamicStyles.taxiList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Destination Box */}
          <DestinationBox
            startLocation={{
              name: originalCurrentName || currentName || 'Current Location',
              latitude: parseFloat(currentLat || '0'),
              longitude: parseFloat(currentLng || '0'),
            }}
            endLocation={{
              name: originalDestinationName || destinationName || 'Destination',
              latitude: parseFloat(destinationLat || '0'),
              longitude: parseFloat(destinationLng || '0'),
            }}
            availableTaxisCount={nearbyTaxis.length}
            estimatedDuration={nearbyTaxis[0]?.routeInfo?.estimatedDuration}
            estimatedFare={nearbyTaxis[0]?.routeInfo?.calculatedFare || nearbyTaxis[0]?.routeInfo?.fare}
            routeName={routeMatchData?.matchingRoutes?.[0]?.routeName || nearbyTaxis[0]?.routeInfo?.routeName}
            routeFare={routeMatchData?.matchingRoutes?.[0]?.fare || nearbyTaxis[0]?.routeInfo?.calculatedFare || nearbyTaxis[0]?.routeInfo?.fare}
            routeDuration={routeMatchData?.matchingRoutes?.[0]?.estimatedDuration || nearbyTaxis[0]?.routeInfo?.estimatedDuration}
          />

          {/* Taxi List Section */}
          <Text style={dynamicStyles.sectionTitle}>
            {isLoadingTaxis ? t('taxiInfo:findingAvailableTaxis') : t('taxiInfo:selectYourDriver')}
          </Text>

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
                size={40} 
                color={theme.textSecondary} 
                style={dynamicStyles.noTaxisIcon}
              />
              <Text style={dynamicStyles.noTaxisTitle}>
                {t('taxiInfo:noAvailableTaxis')}
              </Text>
              <Text style={dynamicStyles.noTaxisText}>
                {routeMatchData?.message || t('taxiInfo:noTaxisMessage')}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Book Ride Button */}
      {selectedTaxi && nearbyTaxis.length > 0 && (
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