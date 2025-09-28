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
  Dimensions,
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

  // Hide header and tab bar like FeedbackHistoryScreen
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' }
    });
  }, [navigation]);
  const { user } = useUser();
  const { currentLanguage } = useLanguage();
  const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();

  // Hardcoded translations
  const translations = {
    en: {
      km: "km",
      away: "away",
      driver: "Driver",
      findingAvailableTaxis: "Finding Available Taxis",
      selectYourDriver: "Select Your Driver",
      noAvailableTaxis: "No Available Taxis",
      noTaxisMessage: "No taxis are currently available for this route. Please try again later.",
      bookingRide: "Booking Ride...",
      bookRideWith: "Book Ride with {name}",
      rideRequestSent: "Ride Request Sent!",
      rideRequestMessage: "Your ride request has been sent to {name}. They will contact you shortly.",
      ok: "OK",
      error: "Error",
      pleaseSelectTaxi: "Please select a taxi and ensure you are logged in",
      bookingError: "Booking Error",
      bookingFailed: "Failed to send ride request. Please try again.",
      phoneCallsNotSupported: "Phone calls are not supported on this device",
      couldNotOpenPhoneApp: "Could not open phone app",
      journeyCancelled: "Journey Cancelled",
      journeyCancelledMessage: "Your multi-leg journey has been cancelled. You can start a new journey from the home screen.",
      multiLegJourney: "Multi-Leg Journey: Leg",
      of: "of",
      availableTaxis: "Available Taxis",
      legBooked: "Booked!",
      legBookedMessage: "Your {routeName} for leg {legIndex} has been booked with {driverName}.",
      currentLocation: "Current Location",
      destination: "Destination",
      taxisAvailable: "taxi{s} available"
    },
    tn: {
      km: "km",
      away: "kgakala",
      driver: "Mokgweetsi",
      findingAvailableTaxis: "Go Batla Ditekisi tse di Leng teng",
      selectYourDriver: "Kgetha Mokgweetsi wa Gago",
      noAvailableTaxis: "Ga go na Ditekisi tse di Leng teng",
      noTaxisMessage: "Ga go na ditekisi tse di leng teng mo tseleng e. Ka kopo leka gape morago.",
      bookingRide: "Go Boka Leeto...",
      bookRideWith: "Boka Leeto le {name}",
      rideRequestSent: "Kopo ya Leeto e Romilwe!",
      rideRequestMessage: "Kopo ya gago ya leeto e romilwe go {name}. Ba tla go kgokaganya ka nakwana.",
      ok: "Sentle",
      error: "Phoso",
      pleaseSelectTaxi: "Ka kopo kgetha tekisi mme o netefatse gore o tsene",
      bookingError: "Phoso ya Go Boka",
      bookingFailed: "Go hlolekile go roma kopo ya leeto. Ka kopo leka gape.",
      phoneCallsNotSupported: "Dikgopolo tsa mogala ga di tshegediwe mo sedirisweng seno",
      couldNotOpenPhoneApp: "Ga go kgonege go bulela app ya mogala",
      journeyCancelled: "Leeto le Khanselwe",
      journeyCancelledMessage: "Leeto la gago la maleg a le mmalwa le khanselwe. O ka simolola leeto le lešwa go tswa mo skrineng ya gae.",
      multiLegJourney: "Leeto la Maleg a le Mmalwa: Lege",
      of: "ya",
      availableTaxis: "Ditekisi tse di Leng teng",
      legBooked: "Lebokwe!",
      legBookedMessage: "Leeto la gago la {routeName} la lege {legIndex} le bokwe le {driverName}.",
      currentLocation: "Lefelo la Jaanong",
      destination: "Mafelo a Go Ya Go One",
      taxisAvailable: "tekisi{s} e leng teng"
    },
    zu: {
      km: "km",
      away: "kude",
      driver: "Umshayeli",
      findingAvailableTaxis: "Kutholwa AmaTekisi Atholakalayo",
      selectYourDriver: "Khetha Umshayeli Wakho",
      noAvailableTaxis: "Awukho AmaTekisi Atholakalayo",
      noTaxisMessage: "Awukho amaTekisi atholakalayo ngalesi sikhathi kulendlela. Sicela uzame futhi kamuva.",
      bookingRide: "Kubhuka Uhambo...",
      bookRideWith: "Bhuka Uhambo no{name}",
      rideRequestSent: "Isicelo Sohambo Sithunyelwe!",
      rideRequestMessage: "Isicelo sakho sohambo sithunyelwe ku{name}. Bazokuxhumana naye maduzane.",
      ok: "Kulungile",
      error: "Iphutha",
      pleaseSelectTaxi: "Sicela ukhethe itekisi futhi uqinisekise ukuthi ungene",
      bookingError: "Iphutha Lokubhuka",
      bookingFailed: "Kuhlulekile ukuthumela isicelo sohambo. Sicela uzame futhi.",
      phoneCallsNotSupported: "Ocingo alusekelwa kule divayisi",
      couldNotOpenPhoneApp: "Akukwazanga ukuvula i-app yocingo",
      journeyCancelled: "Uhambo Lukhanseliwe",
      journeyCancelledMessage: "Uhambo lwakho lwemilenze eminingi lukhanseliwe. Ungaqala uhambo olusha esikrinini sasekhaya.",
      multiLegJourney: "Uhambo Lwemilenze Eminingi: Umilenze",
      of: "we",
      availableTaxis: "AmaTekisi Atholakalayo",
      legBooked: "Kubhukwe!",
      legBookedMessage: "Uhambo lwakho lwe{routeName} lwemilenze {legIndex} lubhukwe no{driverName}.",
      currentLocation: "Indawo Yamanje",
      destination: "Indawo Eyihloswe",
      taxisAvailable: "itekisi{s} itholakalayo"
    },
    af: {
      km: "km",
      away: "weg",
      driver: "Bestuurder",
      findingAvailableTaxis: "Vind Beskikbare Taxis",
      selectYourDriver: "Kies Jou Bestuurder",
      noAvailableTaxis: "Geen Beskikbare Taxis",
      noTaxisMessage: "Geen taxis is tans beskikbaar vir hierdie roete. Probeer asseblief later weer.",
      bookingRide: "Bespreek Rit...",
      bookRideWith: "Bespreek Rit met {name}",
      rideRequestSent: "Rit Versoek Gestuur!",
      rideRequestMessage: "Jou rit versoek is gestuur na {name}. Hulle sal jou binnekort kontak.",
      ok: "OK",
      error: "Fout",
      pleaseSelectTaxi: "Kies asseblief 'n taxi en maak seker jy is ingeteken",
      bookingError: "Bespreking Fout",
      bookingFailed: "Kon nie rit versoek stuur nie. Probeer asseblief weer.",
      phoneCallsNotSupported: "Telefoon oproepe word nie ondersteun op hierdie toestel nie",
      couldNotOpenPhoneApp: "Kon nie telefoon app oopmaak nie",
      journeyCancelled: "Reis Gekanselleer",
      journeyCancelledMessage: "Jou multi-been reis is gekanselleer. Jy kan 'n nuwe reis van die tuisskerm begin.",
      multiLegJourney: "Multi-Been Reis: Been",
      of: "van",
      availableTaxis: "Beskikbare Taxis",
      legBooked: "Geboek!",
      legBookedMessage: "Jou {routeName} vir been {legIndex} is geboek met {driverName}.",
      currentLocation: "Huidige Ligging",
      destination: "Bestemming",
      taxisAvailable: "taxi{s} beskikbaar"
    }
  };
  
  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };

  // Screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;

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
          averageRating: taxi.averageRating ?? taxi.routeInfo?.calculatedRating ?? 0,
          displayName: `${taxi.name} - ${taxi.vehicleModel}`,
          displayDistance: `${taxi.distanceToOrigin}${t('km')} ${t('away')}`,
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
          displayDistance: `${driver.distanceToOrigin}${t('km')} ${t('away')}`,
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
          showGlobalError(t('error'), t('phoneCallsNotSupported'), {
            duration: 4000,
            position: 'top',
            animation: 'slide-down',
          });
        }
      })
      .catch((err) => {
        console.error('Error opening phone app:', err);
        showGlobalError(t('error'), t('couldNotOpenPhoneApp'), {
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
      t('journeyCancelled'),
      t('journeyCancelledMessage'),
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
      showGlobalError(t('error'), t('pleaseSelectTaxi'), {
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
            ? `${t('multiLegJourney')} ${currentLegIndex + 1} ${t('of')} ${totalLegsCount} ${t('legBooked')}`
            : t('rideRequestSent'),
          isMultiLegJourney
            ? t('legBookedMessage').replace('{routeName}', routeName || 'taxi').replace('{legIndex}', (currentLegIndex + 1).toString()).replace('{driverName}', selectedTaxi.name)
            : t('rideRequestMessage').replace('{name}', selectedTaxi.name),
          {
            duration: 0,
            actions: [
              {
                label: t('ok'),
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
        t('bookingError'),
        t('bookingFailed'),
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

  const renderTaxiCard = (taxi: any, index: number) => {
    const isEnhanced = taxi.routeInfo;
    const isSelected = selectedTaxi?._id === taxi._id;

    const driverRating = taxi.averageRating ?? 0;

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
              {taxi.name || `${t('driver')} ${index + 1}`}
            </Text>

            {/* Driver Rating */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              {driverRating > 0 ? [1, 2, 3, 4, 5].map((star) => {
                const full = driverRating >= star;
                const half = driverRating >= star - 0.5 && driverRating < star;
                return (
                  <Icon
                    key={star}
                    name={full ? "star" : half ? "star-half" : "star-outline"}
                    size={12}
                    color="#FFD700"
                    style={{ marginRight: 2 }}
                  />
                );
              }) : (
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>No ratings</Text>
              )}
            </View>

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
      position: 'absolute',
      bottom: 80,
      left: 24,
      right: 24,
    },
    bookButton: {
      backgroundColor: '#F59E0B',
      borderRadius: 28,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      borderWidth: 2,
      borderColor: '#D97706',
    },
    bookButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
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
              ? `${t('multiLegJourney')} ${currentLegIndex + 1} ${t('of')} ${totalLegsCount}`
              : t('availableTaxis')
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
                {effectiveCurrentName || t('currentLocation')}
              </Text>
            </View>
            <View style={dynamicStyles.routeHeader}>
              <View style={dynamicStyles.routeIndicator}>
                <View style={[dynamicStyles.routeDot, dynamicStyles.endDot]} />
              </View>
              <Text style={dynamicStyles.routeText}>
                {effectiveDestinationName || t('destination')}
              </Text>
            </View>
            <View style={dynamicStyles.routeStats}>
              <View style={dynamicStyles.statItem}>
                <Ionicons name="car-outline" size={16} color={theme.primary} />
                <Text style={dynamicStyles.statText}>
                  {nearbyTaxis.length} {t('taxisAvailable').replace('{s}', nearbyTaxis.length !== 1 ? 's' : '')}
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
            {isLoadingTaxis ? t('findingAvailableTaxis') : t('selectYourDriver')}
          </Text>

          {isLoadingTaxis ? (
            <View style={dynamicStyles.loadingContainer}>
              <LoadingSpinner size="large" />
              <Text style={dynamicStyles.loadingText}>
                {t('findingAvailableTaxis')}
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
                {t('noAvailableTaxis')}
              </Text>
              <Text style={dynamicStyles.noTaxisText}>
                {routeMatchData?.message || t('noTaxisMessage')}
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
                ? t('bookingRide')
                : t('bookRideWith').replace('{name}', selectedTaxi.name)
              }
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}