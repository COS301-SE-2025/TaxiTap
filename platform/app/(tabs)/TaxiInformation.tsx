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
import { isMultiLegJourney, isLastLeg } from '../../utils/multiLegJourneyHelpers';

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
    // Multi-leg journey parameters
    isMultiLeg,
    journeyId,
    legIndex,
    totalLegs,
    routeName,
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
    // Multi-leg journey parameters
    isMultiLeg?: string;
    journeyId?: string;
    legIndex?: string;
    totalLegs?: string;
    routeName?: string;
  }>();

  // State management
  const [selectedTaxi, setSelectedTaxi] = useState<any>(null);
  const [nearbyTaxis, setNearbyTaxis] = useState<any[]>([]);
  const [availableTaxis, setAvailableTaxis] = useState<any[]>([]);
  const [routeMatchData, setRouteMatchData] = useState<any>(null);
  const [isLoadingTaxis, setIsLoadingTaxis] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  // Multi-leg journey state
  const [currentJourneyState, setCurrentJourneyState] = useState<any>(null);

  // Coordinate state - use params if available, otherwise will be set from nextLegInfo
  const [effectiveCurrentLat, setEffectiveCurrentLat] = useState(currentLat || '');
  const [effectiveCurrentLng, setEffectiveCurrentLng] = useState(currentLng || '');
  const [effectiveCurrentName, setEffectiveCurrentName] = useState(currentName || '');
  const [effectiveDestinationLat, setEffectiveDestinationLat] = useState(destinationLat || '');
  const [effectiveDestinationLng, setEffectiveDestinationLng] = useState(destinationLng || '');
  const [effectiveDestinationName, setEffectiveDestinationName] = useState(destinationName || '');

  const isMultiLegJourney = isMultiLeg === 'true';
  const currentLegIndex = parseInt(legIndex || '0');
  const totalLegsCount = parseInt(totalLegs || '1');
  

  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Convex mutations
  const requestRide = useMutation(api.functions.rides.RequestRide.requestRide);
  const startJourneyLeg = useMutation(api.functions.journeys.journeyStateManager.startJourneyLeg);

  // Multi-leg journey query - only runs if it's a multi-leg journey
  const journeyState = useQuery(
    api.functions.journeys.journeyStateManager.getJourneyState,
    (isMultiLegJourney && journeyId) ? { journeyId } : "skip"
  );

  // Next leg information query - only runs when continuing to next leg
  const nextLegInfo = useQuery(
    api.functions.journeys.getNextLegInfo.getNextLegInfo,
    (isMultiLegJourney && journeyId) ? { 
      journeyId: journeyId,
      currentLegIndex: currentLegIndex - 1 // We're looking for the next leg after the just completed one
    } : "skip"
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

  // Handle next leg information for multi-leg journeys
  useEffect(() => {
    if (isMultiLegJourney && nextLegInfo && !routeMatchDataString) {
      console.log('🚌 Processing next leg information:', nextLegInfo);

      // Update missing coordinates from nextLegInfo if they're not provided
      if (nextLegInfo.nextLeg && (!effectiveCurrentLat || !effectiveCurrentLng || !effectiveDestinationLat || !effectiveDestinationLng)) {
        console.log('🔧 Updating missing coordinates from nextLeg data');
        const { nextLeg } = nextLegInfo;

        // Update the coordinate state if they're missing
        if (!effectiveCurrentLat || !effectiveCurrentLng) {
          setEffectiveCurrentLat(nextLeg.origin.coordinates.latitude.toString());
          setEffectiveCurrentLng(nextLeg.origin.coordinates.longitude.toString());
          setEffectiveCurrentName(nextLeg.origin.address);
        }

        if (!effectiveDestinationLat || !effectiveDestinationLng) {
          setEffectiveDestinationLat(nextLeg.destination.coordinates.latitude.toString());
          setEffectiveDestinationLng(nextLeg.destination.coordinates.longitude.toString());
          setEffectiveDestinationName(nextLeg.destination.address);
        }

        console.log('✅ Updated coordinates from nextLeg:', {
          origin: { lat: nextLeg.origin.coordinates.latitude, lng: nextLeg.origin.coordinates.longitude, name: nextLeg.origin.address },
          destination: { lat: nextLeg.destination.coordinates.latitude, lng: nextLeg.destination.coordinates.longitude, name: nextLeg.destination.address }
        });
      }

      if (nextLegInfo.hasNextLeg && nextLegInfo.availableDrivers) {
        const nextLegTaxiData = nextLegInfo.availableDrivers.map((driver: any) => ({
          _id: driver.driverId,
          userId: driver.userId,
          latitude: driver.currentLocation.latitude,
          longitude: driver.currentLocation.longitude,
          name: driver.name,
          phoneNumber: driver.phoneNumber,
          vehicleRegistration: driver.vehicleRegistration,
          vehicleModel: driver.vehicleModel,
          distanceToOrigin: driver.distanceToOrigin,
          routeInfo: driver.routeInfo,
          displayName: `${driver.name} - ${driver.vehicleModel}`,
          displayDistance: `${driver.distanceToOrigin}${t('taxiInfo:km')} ${t('taxiInfo:away')}`,
          routeName: driver.routeInfo.routeName,
          fare: driver.routeInfo.calculatedFare,
        }));
        
        setNearbyTaxis(nextLegTaxiData);
        setAvailableTaxis(nextLegInfo.availableDrivers);
        console.log(`✅ Found ${nextLegTaxiData.length} drivers for next leg`);
      } else {
        // No drivers available for next leg
        setNearbyTaxis([]);
        setAvailableTaxis([]);
        console.log('⚠️ No drivers available for next leg');
      }
      
      setIsLoadingTaxis(false);
    }
  }, [nextLegInfo, isMultiLegJourney, routeMatchDataString, t]);

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

  // Handle cancel leg for multi-leg journeys
  const handleCancelLeg = async () => {
    console.log('🚫 User cancelled multi-leg journey');
    
    // Show success notification
    showGlobalSuccess(
      'Journey Cancelled',
      'Your multi-leg journey has been cancelled. You can start a new journey from the home screen.',
      { 
        duration: 3000, 
        position: 'top', 
        animation: 'slide-down' 
      }
    );
    
    // Navigate to HomeScreen after a brief delay
    setTimeout(() => {
      router.push('/HomeScreen');
    }, 500);
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
            latitude: parseFloat(effectiveCurrentLat),
            longitude: parseFloat(effectiveCurrentLng),
          },
          address: effectiveCurrentName,
        },
        endLocation: {
          coordinates: {
            latitude: parseFloat(effectiveDestinationLat),
            longitude: parseFloat(effectiveDestinationLng),
          },
          address: effectiveDestinationName,
        },
        estimatedFare: selectedTaxi.routeInfo?.calculatedFare || selectedTaxi.routeInfo?.fare || 0,
      };

      console.log('📝 Creating ride request:', rideData);

      const result = await requestRide(rideData);

      if (result) {
        // If this is a multi-leg journey, update the journey state
        if (isMultiLegJourney && journeyId && result._id) {
          console.log(`🚗 Starting leg ${currentLegIndex + 1} of multi-leg journey ${journeyId}`);

          await startJourneyLeg({
            journeyId,
            legIndex: currentLegIndex,
            rideId: result._id,
            driverId: selectedTaxi.userId as Id<"taxiTap_users">,
          });
        }

        showGlobalSuccess(
          isMultiLegJourney
            ? `Leg ${currentLegIndex + 1}/${totalLegsCount} Booked!`
            : t('taxiInfo:rideRequestSent'),
          isMultiLegJourney
            ? `Your ${routeName || 'taxi'} for leg ${currentLegIndex + 1} has been booked with ${selectedTaxi.name}.`
            : t('taxiInfo:rideRequestMessage').replace('{name}', selectedTaxi.name),
          {
            duration: 0,
            actions: [
              {
                label: t('common:ok'),
                onPress: () => {
                  const navigationParams = {
                    currentLat: effectiveCurrentLat,
                    currentLng: effectiveCurrentLng,
                    currentName: effectiveCurrentName,
                    destinationLat: effectiveDestinationLat,
                    destinationLng: effectiveDestinationLng,
                    destinationName: effectiveDestinationName,
                    driverId: selectedTaxi.userId,
                    driverName: selectedTaxi.name,
                    fare: (selectedTaxi.routeInfo?.calculatedFare || selectedTaxi.routeInfo?.fare || 0).toString(),
                    rideId: result.rideId,
                    // Pass multi-leg journey info
                    ...(isMultiLegJourney && {
                      isMultiLeg: 'true',
                      journeyId,
                      legIndex: currentLegIndex.toString(),
                      totalLegs: totalLegs,
                      routeName,
                    }),
                  };

                  console.log('🚀 TaxiInformation DEBUG - Navigating to PassengerReservation with params:', {
                    isMultiLegJourney,
                    navigationParams,
                    multiLegConditions: {
                      isMultiLegJourney,
                      journeyId,
                      legIndex: currentLegIndex,
                      totalLegs,
                      routeName,
                    },
                  });

                  router.push({
                    pathname: './PassengerReservation',
                    params: navigationParams,
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
      backgroundColor: '#FF9900',
      borderRadius: 30,
      paddingVertical: 16,
      paddingHorizontal: 55,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      // Cross-platform shadow for button
      ...Platform.select({
        ios: {
          shadowColor: '#FF9900',
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
      color: '#000000',
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    routeInfoCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    routeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    routeIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    routeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    startDot: {
      backgroundColor: theme.primary,
    },
    endDot: {
      backgroundColor: '#FF6B6B',
    },
    routeText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 20,
    },
    routeStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    statText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
      marginLeft: 6,
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
            {isMultiLegJourney
              ? `Multi-Leg Journey: Leg ${currentLegIndex + 1} of ${totalLegsCount}`
              : 'Available Taxis'
            }
          </Text>
        </View>
        {isMultiLegJourney && (
          <View style={dynamicStyles.journeyProgressBar}>
            {Array.from({length: totalLegsCount}, (_, i) => (
              <View
                key={i}
                style={[
                  dynamicStyles.progressDot,
                  i <= currentLegIndex && dynamicStyles.progressDotActive
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView
          style={dynamicStyles.taxiList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Route Information Card */}
          <View style={dynamicStyles.routeInfoCard}>
            <View style={dynamicStyles.routeHeader}>
              <View style={dynamicStyles.routeIndicator}>
                <View style={[dynamicStyles.routeDot, dynamicStyles.startDot]} />
              </View>
              <Text style={dynamicStyles.routeText}>
                {effectiveCurrentName || 'Current Location'}
              </Text>
            </View>
            <View style={dynamicStyles.routeHeader}>
              <View style={dynamicStyles.routeIndicator}>
                <View style={[dynamicStyles.routeDot, dynamicStyles.endDot]} />
              </View>
              <Text style={dynamicStyles.routeText}>
                {effectiveDestinationName || 'Destination'}
              </Text>
            </View>
            <View style={dynamicStyles.routeStats}>
              <View style={dynamicStyles.statItem}>
                <Ionicons name="car-outline" size={16} color={theme.primary} />
                <Text style={dynamicStyles.statText}>
                  {nearbyTaxis.length} taxi{nearbyTaxis.length !== 1 ? 's' : ''} available
                </Text>
              </View>
              {nearbyTaxis[0]?.routeInfo?.calculatedFare && (
                <View style={dynamicStyles.statItem}>
                  <Ionicons name="cash-outline" size={16} color={theme.primary} />
                  <Text style={dynamicStyles.statText}>
                    R{nearbyTaxis[0].routeInfo.calculatedFare.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </View>

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