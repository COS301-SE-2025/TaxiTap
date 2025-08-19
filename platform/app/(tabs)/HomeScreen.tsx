import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useMapContext, createRouteKey } from '../../contexts/MapContext';
import { useLanguage } from '../../contexts/LanguageContext';
import loading from '../../assets/images/loading4.png';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../../contexts/NotificationContext';
import * as Location from "expo-location";
import { useThrottledLocationStreaming } from '../hooks/useLocationStreaming';
import { Id } from "../../convex/_generated/dataModel";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlertHelpers } from '../../components/AlertHelpers';

const GOOGLE_MAPS_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

// Interface for autocomplete suggestions
interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function HomeScreen() {
  const { user } = useUser();
  const { userId: navId } = useLocalSearchParams<{ userId?: string }>();
  const userId = user?.id || navId || '';
  const role = user?.role || user?.accountType || 'passenger';
  const { t } = useLanguage();

  const storeRouteForPassenger = useMutation(api.functions.routes.storeRecentRoutes.storeRouteForPassenger);
  const shouldRunQuery = !!userId;

  const recentRoutes = useQuery(
    api.functions.routes.getRecentRoutes.getPassengerTopRoutes,
    shouldRunQuery ? { passengerId: userId as Id<"taxiTap_users"> } : "skip"
  );

  const { showGlobalError, showGlobalAlert } = useAlertHelpers();

  const [detectedLocation, setDetectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(t('home:permissionDenied'), t('home:locationPermissionRequired'));
          showGlobalError(
            "Permission denied", 
            "Location permission is required to find nearby taxis.",
            {
              duration: 5000,
              position: 'top',
              animation: 'slide-down',
            }
          );
          setIsLoadingCurrentLocation(false);
          return;
        }

        // Check if location services are enabled
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
          showGlobalError(
            "Location services disabled", 
            "Please enable location services in your device settings.",
            {
              duration: 5000,
              position: 'top',
              animation: 'slide-down',
            }
          );
          setIsLoadingCurrentLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Use balanced accuracy to avoid spoofer detection
        });

        const { latitude, longitude } = location.coords;
        
        // Validate location coordinates
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          console.warn('Invalid location coordinates received');
          setIsLoadingCurrentLocation(false);
          return;
        }
        
        // Check for suspicious coordinates (0,0 is common for mock locations)
        if (latitude === 0 && longitude === 0) {
          console.warn('Suspicious location coordinates (0,0) detected');
          setIsLoadingCurrentLocation(false);
          return;
        }

        setDetectedLocation({
          latitude: latitude,
          longitude: longitude,
        });
      } catch (error: any) {
        console.error('Error getting location:', error);
        
        // Handle specific location errors
        if (error.message?.includes('spoofer') || error.message?.includes('mock')) {
          showGlobalError(
            "Location spoofer detected", 
            "Please disable any location spoofing apps and use real GPS location.",
            {
              duration: 5000,
              position: 'top',
              animation: 'slide-down',
            }
          );
        } else {
          showGlobalError(
            "Location error", 
            "Unable to get your current location. Please enter your address manually.",
            {
              duration: 5000,
              position: 'top',
              animation: 'slide-down',
            }
          );
        }
        
        setIsLoadingCurrentLocation(false);
      }
    })();
  }, [showGlobalError]);

  const nearbyDrivers = useQuery(
    api.functions.locations.getNearbyTaxis.getNearbyDrivers,
    detectedLocation
      ? {
          latitude: detectedLocation.latitude,
          longitude: detectedLocation.longitude,
        }
      : "skip"
  );

  // Address input states
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isGeocodingOrigin, setIsGeocodingOrigin] = useState(false);
  const [isGeocodingDestination, setIsGeocodingDestination] = useState(false);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(true);

  // NEW: Autocomplete states
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [isLoadingOriginSuggestions, setIsLoadingOriginSuggestions] = useState(false);
  const [isLoadingDestinationSuggestions, setIsLoadingDestinationSuggestions] = useState(false);
  const [justSelectedOrigin, setJustSelectedOrigin] = useState(false);
  const [justSelectedDestination, setJustSelectedDestination] = useState(false);

  // NEW: Keyboard handling states
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Enhanced taxi matching states
  const [availableTaxis, setAvailableTaxis] = useState<any[]>([]);
  const [isSearchingTaxis, setIsSearchingTaxis] = useState(false);
  const [routeMatchResults, setRouteMatchResults] = useState<any>(null);

  // Enhanced state to trigger taxi search
  const [taxiSearchParams, setTaxiSearchParams] = useState<{
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
  } | null>(null);

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [manualDestinations, setManualDestinations] = useState<Record<string, any>>({});

  // NEW: Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // NEW: Google Places Autocomplete function
  const fetchPlaceSuggestions = async (input: string, location?: { latitude: number; longitude: number }): Promise<PlaceSuggestion[]> => {
    if (!GOOGLE_MAPS_API_KEY || input.trim().length < 2) {
      return [];
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}`;
      
      // Add location bias if available
      if (location) {
        url += `&location=${location.latitude},${location.longitude}&radius=10000`; // 10km radius
      }
      
      // Add components to bias results to South Africa
      url += `&components=country:za`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions;
      } else {
        console.warn('Places API error:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      return [];
    }
  };

  // NEW: Get place details from place_id
  const getPlaceDetails = async (placeId: string): Promise<{ latitude: number; longitude: number; name: string } | null> => {
    if (!GOOGLE_MAPS_API_KEY) {
      showGlobalError(
        t('common:error'), 
        'Google Maps API key is not configured',
        {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        }
      );
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        return {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          name: data.result.formatted_address,
        };
      } else {
        throw new Error('Place details not found');
      }
    } catch (error) {
      Alert.alert(t('common:error'), 'Could not get place details. Please try again.');
      return null;
    }
  };

  // NEW: Debounced autocomplete for origin
  useEffect(() => {
    if (justSelectedOrigin) return;
    
    const timeoutId = setTimeout(async () => {
      if (originAddress.trim().length >= 2) {
        setIsLoadingOriginSuggestions(true);
        const suggestions = await fetchPlaceSuggestions(originAddress, detectedLocation || undefined);
        setOriginSuggestions(suggestions);
        setShowOriginSuggestions(true);
        setIsLoadingOriginSuggestions(false);
      } else {
        setOriginSuggestions([]);
        setShowOriginSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [originAddress, detectedLocation, justSelectedOrigin]);

  // NEW: Debounced autocomplete for destination
  useEffect(() => {
    if (justSelectedDestination) return;
    
    const timeoutId = setTimeout(async () => {
      if (destinationAddress.trim().length >= 2) {
        setIsLoadingDestinationSuggestions(true);
        const suggestions = await fetchPlaceSuggestions(destinationAddress, detectedLocation || undefined);
        setDestinationSuggestions(suggestions);
        setShowDestinationSuggestions(true);
        setIsLoadingDestinationSuggestions(false);
      } else {
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [destinationAddress, detectedLocation, justSelectedDestination]);

  // NEW: Handle origin suggestion selection
  const handleOriginSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    setJustSelectedOrigin(true);
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
    
    setOriginAddress(suggestion.description);
    setIsGeocodingOrigin(true);

    const placeDetails = await getPlaceDetails(suggestion.place_id);
    setIsGeocodingOrigin(false);

    if (placeDetails) {
      setOrigin(placeDetails);
      mapRef.current?.animateToRegion(
        {
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  // NEW: Handle destination suggestion selection
  const handleDestinationSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    setJustSelectedDestination(true);
    setShowDestinationSuggestions(false);
    setDestinationSuggestions([]);
    
    setDestinationAddress(suggestion.description);
    setIsGeocodingDestination(true);

    const placeDetails = await getPlaceDetails(suggestion.place_id);
    setIsGeocodingDestination(false);

    if (placeDetails) {
      const uniqueRouteId = `manual-${placeDetails.latitude.toFixed(5)}-${placeDetails.longitude.toFixed(5)}`;
      
      const destinationWithUserName = {
        ...placeDetails,
        name: suggestion.description,
      };
      
      setDestination(destinationWithUserName);
      setSelectedRouteId(uniqueRouteId);
      
      await storeManualDestination(uniqueRouteId, destinationWithUserName);
    }
  };

  // Query for enhanced taxi matching - only runs when we have search params
  const taxiSearchResult = useQuery(
    api.functions.routes.enhancedTaxiMatching.findAvailableTaxisForJourney,
    taxiSearchParams ? {
      ...taxiSearchParams,
      maxOriginDistance: 3.0,      // 3km radius from origin
      maxDestinationDistance: 3.0, // 3km radius from destination
      maxTaxiDistance: 3.0,        // 3km radius for taxi proximity
      maxResults: 10
    } : "skip"
  );
  
  const {
    currentLocation,
    origin,
    destination,
    routeCoordinates,
    isLoadingRoute,
    routeLoaded,
    setCurrentLocation,
    setOrigin,
    setDestination,
    setRouteCoordinates,
    setIsLoadingRoute,
    setRouteLoaded,
    getCachedRoute,
    setCachedRoute,
  } = useMapContext();

  // Integrate live location streaming
  const validRoles = ["passenger", "driver", "both"] as const;

  const safeRole = validRoles.includes(role as any)
    ? (role as "passenger" | "driver" | "both")
    : "passenger";

  const { location: streamedLocation, error: locationStreamError } =
    useThrottledLocationStreaming(userId, safeRole, true);

  const storeManualDestination = async (
    routeId: string, 
    destination: any, 
    origin?: any
  ) => {
    try {
      const existingData = await AsyncStorage.getItem('manualDestinations');
      const destinations = existingData ? JSON.parse(existingData) : {};
      
      destinations[routeId] = {
        latitude: destination.latitude,
        longitude: destination.longitude,
        name: destination.name,
        timestamp: Date.now(),
        ...(origin && {
          originLatitude: origin.latitude,
          originLongitude: origin.longitude,
          originName: origin.name,
        })
      };
      
      await AsyncStorage.setItem('manualDestinations', JSON.stringify(destinations));
      
      setManualDestinations(prev => ({
        ...prev,
        [routeId]: destinations[routeId]
      }));
    } catch (error) {
      console.error('Failed to store manual destination:', error);
    }
  };

  const getManualDestinations = async (): Promise<Record<string, any>> => {
    try {
      const data = await AsyncStorage.getItem('manualDestinations');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get manual destinations:', error);
      return {};
    }
  };

  const migrateOldManualDestination = async () => {
    try {
      const oldData = await AsyncStorage.getItem('lastManualDestination');
      if (oldData) {
        const parsed = JSON.parse(oldData);
        if (parsed?.latitude && parsed?.longitude && parsed?.name) {
          const routeId = `manual-${parsed.latitude.toFixed(5)}-${parsed.longitude.toFixed(5)}`;
          
          const destinationToStore = {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            name: parsed.name,
          };
          
          await storeManualDestination(routeId, destinationToStore);
          await AsyncStorage.removeItem('lastManualDestination');
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  useEffect(() => {
    const loadManualDestinations = async () => {
      await migrateOldManualDestination();
      const destinations = await getManualDestinations();
      setManualDestinations(destinations);
    };
    
    loadManualDestinations();
  }, []);

  useEffect(() => {
    if (detectedLocation && (!currentLocation || currentLocation.name === '')) {
      setCurrentLocation({
        latitude: detectedLocation.latitude,
        longitude: detectedLocation.longitude,
        name: t('common:currentLocation')
      });
      setIsLoadingCurrentLocation(false);
    }
  }, [detectedLocation, currentLocation]);

  // Auto-set origin to current location when detected
  useEffect(() => {
    if (detectedLocation && !origin) {
      setOrigin({
        latitude: detectedLocation.latitude,
        longitude: detectedLocation.longitude,
        name: t('common:currentLocation')
      });
    }
  }, [detectedLocation, origin]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!detectedLocation && isLoadingCurrentLocation) {
        setIsLoadingCurrentLocation(false);
        showGlobalError(
          'Location Error', 
          'Unable to get your current location. Please enter your address manually.',
          {
            duration: 0,
            actions: [
              {
                label: 'OK',
                onPress: () => console.log('Location error acknowledged'),
                style: 'default',
              }
            ],
            position: 'top',
            animation: 'slide-down',
          }
        );
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [detectedLocation, isLoadingCurrentLocation, t, showGlobalError]);

  const routes = useQuery(api.functions.routes.displayRoutes.displayRoutes);
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);

  const { notifications, markAsRead } = useNotifications();

  const fullRecentRoutes = React.useMemo(() => {
    if (!recentRoutes || !routes) return [];

    return recentRoutes.map((recent: any) => {
      if (recent.routeId.startsWith("manual-")) {
        const manualDestination = manualDestinations[recent.routeId];
        
        if (manualDestination) {
          return {
            ...recent,
            _id: recent._id,
            routeName: manualDestination.name,
            destinationLat: manualDestination.latitude,
            destinationLng: manualDestination.longitude,
            startName: recent.startName || 'Current Location',
            startLat: recent.startLat,
            startLng: recent.startLng,
            isManualRoute: true,
          };
        } else {
          return {
            ...recent,
            _id: recent._id,
            routeName: 'Location Unavailable',
            destinationLat: null,
            destinationLng: null,
            startName: recent.startName,
            startLat: recent.startLat,
            startLng: recent.startLng,
            isManualRoute: true,
          };
        }
      }

      const fullRoute = routes.find(r => r.routeId === recent.routeId);
      if (fullRoute && fullRoute.destinationCoords) {
        return {
          ...recent,
          _id: fullRoute._id,
          routeName: fullRoute.destination,
          routeDisplayName: `${fullRoute.start} → ${fullRoute.destination}`,
          destinationLat: fullRoute.destinationCoords.latitude,
          destinationLng: fullRoute.destinationCoords.longitude,
          startName: recent.startName || fullRoute.start,
          startLat: recent.startLat || fullRoute.startCoords?.latitude,
          startLng: recent.startLng || fullRoute.startCoords?.longitude,
          isManualRoute: false,
        };
      }

      return {
        ...recent,
        _id: recent._id,
        routeName: t('home:unknownRoute'),
        destinationLat: null,
        destinationLng: null,
        startName: recent.startName,
        startLat: recent.startLat,
        startLng: recent.startLng,
        isManualRoute: false,
      };
    }).filter((route: any) => route !== null);
  }, [recentRoutes, routes, manualDestinations]);

  const displayRoutes = fullRecentRoutes.filter(
    (r: any): r is NonNullable<typeof r> => r !== null
  );

  // Only clear state on first load, not every focus
  useFocusEffect(
    React.useCallback(() => {
      if (isFirstLoad) {
        setRouteLoaded(false);
        setOrigin(null);
        setDestination(null);
        setRouteCoordinates([]);
        setSelectedRouteId(null);
        setOriginAddress('');
        setDestinationAddress('');
        setAvailableTaxis([]);
        setRouteMatchResults(null);
        setIsSearchingTaxis(false);
        setIsFirstLoad(false);
      }
    }, [isFirstLoad, setRouteLoaded, setOrigin, setDestination, setRouteCoordinates])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('navigation:home') });
  }, [navigation, t]);

  // Geocoding function (fallback for manual entry)
  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number; name: string } | null> => {
    if (!GOOGLE_MAPS_API_KEY) {
      showGlobalError(
        t('common:error'), 
        'Google Maps API key is not configured',
        {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        }
      );
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          name: result.formatted_address,
        };
      } else {
        throw new Error('Address not found');
      }
    } catch (error) {
      Alert.alert(t('common:error'), 'Could not find the address. Please try again.');
      return null;
    }
  };

  // Enhanced function to search for available taxis
  const searchForAvailableTaxis = async (
    origin: { latitude: number; longitude: number; name: string },
    dest: { latitude: number; longitude: number; name: string }
  ) => {
    if (!userId) {
      return;
    }

    setAvailableTaxis([]);
    setRouteMatchResults(null);
    setIsSearchingTaxis(true);
    
    try {
      setTaxiSearchParams({
        originLat: origin.latitude,
        originLng: origin.longitude,
        destinationLat: dest.latitude,
        destinationLng: dest.longitude,
      });
      
    } catch (error) {
      setIsSearchingTaxis(false);
      Alert.alert(
        t('home:searchError'), 
        t('home:unableToFindTaxis'),
        [{ text: t('common:ok') }]
      );
      setAvailableTaxis([]);
      setRouteMatchResults(null);
    }
  };

  // Handle taxi search results
  useEffect(() => {
    if (taxiSearchResult) {
      setIsSearchingTaxis(false);
      
      if (taxiSearchResult.success) { 
        setAvailableTaxis(taxiSearchResult.availableTaxis);
        setRouteMatchResults(taxiSearchResult);
      } else {
        setAvailableTaxis([]);
        setRouteMatchResults(taxiSearchResult);
      }
    }
  }, [taxiSearchResult]);

  // Handle origin address submission (fallback for manual entry)
  const handleOriginSubmit = async () => {
    if (!originAddress.trim()) return;
    
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
    setIsGeocodingOrigin(true);
    
    const result = await geocodeAddress(originAddress);
    setIsGeocodingOrigin(false);

    if (result) {
      setOrigin(result);
      mapRef.current?.animateToRegion(
        {
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  // Handle destination address submission (fallback for manual entry)
  const handleDestinationSubmit = async () => {
    if (!destinationAddress.trim()) return;
    
    setShowDestinationSuggestions(false);
    setDestinationSuggestions([]);
    setIsGeocodingDestination(true);
    
    const result = await geocodeAddress(destinationAddress);
    setIsGeocodingDestination(false);

    if (result) {
      const uniqueRouteId = `manual-${result.latitude.toFixed(5)}-${result.longitude.toFixed(5)}`;
      
      const destinationWithUserName = {
        ...result,
        name: destinationAddress.trim(),
      };
      
      setDestination(destinationWithUserName);
      setSelectedRouteId(uniqueRouteId);
      
      await storeManualDestination(uniqueRouteId, destinationWithUserName);
    }
  };

  const handleReserveSeat = async () => {
    if (!destination || !origin) {
      showGlobalError(
        t('common:error'), 
        t('home:pleaseEnterAddresses'),
        {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        }
      );
      return;
    }

    if (!selectedRouteId) {
      showGlobalError(
        t('common:error'), 
        t('home:routeNotSelected'),
        {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        }
      );
      return;
    }

    if (availableTaxis.length === 0) {
      Alert.alert(
        t('home:noTaxisAvailableAlert'), 
        t('home:noTaxisAvailableMessage'),
        [{ text: t('common:ok') }]
      );
      showGlobalAlert({
        title: 'No Taxis Available',
        message: 'No taxis are currently available on routes that connect your origin and destination. Please try a different route or check again later.',
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: 'OK',
            onPress: () => console.log('No taxis acknowledged'),
            style: 'default',
          }
        ],
        position: 'top',
        animation: 'slide-down',
      });
      return;
    }

    try {
      let routeIdToStore = selectedRouteId;
      
      if (selectedRouteId.startsWith('manual-')) {
        await storeManualDestination(selectedRouteId, destination, origin);
        routeIdToStore = selectedRouteId;
      }

      await storeRouteForPassenger({
        passengerId: userId as Id<"taxiTap_users">,
        routeId: routeIdToStore,
        name: destination.name,
        startName: origin.name,
        startLat: origin.latitude,
        startLng: origin.longitude,
        destinationLat: destination.latitude,
        destinationLng: destination.longitude,
      });
    } catch (err) {
      console.error("Failed to store route:", err);
    }

    router.push({
      pathname: './TaxiInformation',
      params: {
        destinationName: destination.name,
        destinationLat: destination.latitude.toString(),
        destinationLng: destination.longitude.toString(),
        currentName: origin.name,
        currentLat: origin.latitude.toString(),
        currentLng: origin.longitude.toString(),
        routeId: selectedRouteId,
        availableTaxisCount: availableTaxis.length.toString(),
        routeMatchData: JSON.stringify(routeMatchResults),
      },
    });
  };

  useEffect(() => {
    if (routeLoaded) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      buttonOpacity.setValue(0);
    }
  }, [routeLoaded]);

  useEffect(() => {
    if (origin && destination) {
      getRoute(origin, destination);
    }
  }, [origin, destination]);

  const getRoute = async (
    originParam: { latitude: number; longitude: number; name: string },
    dest: { latitude: number; longitude: number; name: string }
  ) => {
    if (!GOOGLE_MAPS_API_KEY) {
      return;
    }

    const cacheKey = createRouteKey(
      { ...originParam, name: '' },
      { ...dest, name: '' }
    );

    const cached = getCachedRoute(cacheKey);
    if (cached) {
      setRouteCoordinates(cached);
      setRouteLoaded(true);
      searchForAvailableTaxis(originParam, dest);
      return;
    }

    setIsLoadingRoute(true);
    setRouteLoaded(false);
    setIsSearchingTaxis(false);
    setAvailableTaxis([]);
    setRouteMatchResults(null);

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originParam.latitude},${originParam.longitude}&destination=${dest.latitude},${dest.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'OK') throw new Error(data.error_message || data.status);

      const points = decodePolyline(data.routes[0].overview_polyline.points);
      setCachedRoute(cacheKey, points);
      setRouteCoordinates(points);

      mapRef.current?.fitToCoordinates([originParam, dest, ...points], {
        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
      setRouteLoaded(true);
      
      searchForAvailableTaxis(originParam, dest);
      
    } catch (err) {
      showGlobalError(
        t('home:routeError'), 
        err instanceof Error ? err.message : t('home:unknownError'),
        {
          duration: 5000,
          position: 'top',
          animation: 'slide-down',
        }
      );
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const decodePolyline = (encoded: string) => {
    let idx = 0,
      lat = 0,
      lng = 0,
      pts: { latitude: number; longitude: number }[] = [];

    while (idx < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(idx++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(idx++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return pts;
  };

  const handleDestinationSelect = async (route: {
    _id: Id<"routes">;
    routeId: string;
    destination: string;
    destinationCoords: { latitude: number; longitude: number } | null;
    routeName?: string;
    startName?: string;
    startLat?: number;
    startLng?: number;
  }) => {
    if (
      !route.destinationCoords || 
      typeof route.destinationCoords.latitude !== 'number' ||
      typeof route.destinationCoords.longitude !== 'number' ||
      !userId
    ) return;

    const displayName = route.routeId.startsWith("manual-") 
      ? route.routeName || route.destination
      : route.destination;

    const dest = {
      latitude: route.destinationCoords.latitude,
      longitude: route.destinationCoords.longitude,
      name: displayName,
    };

    setDestination(dest);
    setDestinationAddress(displayName);
    
    if (route.startLat && route.startLng && route.startName) {
      const startLocation = {
        latitude: route.startLat,
        longitude: route.startLng,
        name: route.startName,
      };
      
      setOrigin(startLocation);
      setOriginAddress(route.startName);
    } else if (detectedLocation) {
      setOrigin({
        latitude: detectedLocation.latitude,
        longitude: detectedLocation.longitude,
        name: 'Current Location'
      });
      setOriginAddress('Current Location');
    }
    
    const routeIdToUse = route.routeId.startsWith("manual-") ? route.routeId : route._id;
    setSelectedRouteId(routeIdToUse);

    // Clear autocomplete suggestions and flags
    setShowOriginSuggestions(false);
    setShowDestinationSuggestions(false);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setJustSelectedOrigin(true);
    setJustSelectedDestination(true);
    
    // Reset flags after a short delay to allow route calculation
    setTimeout(() => {
      setJustSelectedOrigin(false);
      setJustSelectedDestination(false);
    }, 100);
  };

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, backgroundColor: theme.background
    },
    map: { 
      height: keyboardVisible ? '30%' : '40%'
    },
    bottomSheet: {
      flex: 1,
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 16,
      paddingTop: 24,
      paddingBottom: keyboardVisible ? Math.max(keyboardHeight - 100, 16) : 16,
    },
    locationBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? theme.surface : "#ECD9C3",
      borderColor: isDark ? theme.border : "#D4A57D",
      borderRadius: 20,
      borderWidth: 1,
      paddingVertical: 11,
      paddingHorizontal: 13,
      marginBottom: keyboardVisible ? 16 : 36,
      width: '100%',
      alignSelf: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    locationIndicator: {
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 5,
    },
    currentLocationCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: '#FFB84D',
      marginBottom: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    currentLocationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    dottedLineContainer: {
      height: 35,
      width: 1,
      marginBottom: 8,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dottedLineDot: {
      width: 2,
      height: 3,
      backgroundColor: theme.primary,
      borderRadius: 1,
    },
    locationTextContainer: {
      flex: 1,
      position: 'relative',
    },
    inputContainer: {
      marginBottom: 6,
      position: 'relative',
    },
    addressInput: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
      backgroundColor: 'transparent',
      padding: 0,
      margin: 0,
    },
    originInput: {
      color: isDark ? theme.primary : "#A66400",
      marginBottom: 17,
    },
    destinationInput: {
      marginLeft: 2,
    },
    locationSeparator: {
      height: 1,
      backgroundColor: isDark ? theme.border : "#D4A57D",
      marginBottom: 19,
      marginHorizontal: 2,
    },
    geocodingText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: 4,
    },
    // Autocomplete suggestion styles
    inputSuggestionsContainer: {
      position: 'absolute',
      top: '100%',
      left: -13,
      right: -13,
      backgroundColor: theme.card,
      borderRadius: 12,
      maxHeight: 200,
      zIndex: 1000,
      elevation: 10,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
      marginTop: 8,
    },
    suggestionScrollView: {
      maxHeight: 200,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : '#F0F0F0',
      minHeight: 56,
    },
    suggestionItemLast: {
      borderBottomWidth: 0,
    },
    suggestionIcon: {
      marginRight: 12,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: isDark ? theme.surface : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    suggestionTextContainer: {
      flex: 1,
    },
    suggestionMainText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 2,
    },
    suggestionSecondaryText: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    searchResultsContainer: {
      marginBottom: 20,
    },
    searchResultsTitle: {
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 8,
      color: theme.text,
    },
    searchResultsCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    searchResultsText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 4,
    },
    savedRoutesTitle: {
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 8,
      color: theme.text,
    },
    routeCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    routeTitle: {
      fontWeight: 'bold',
      fontSize: 14,
      color: theme.text,
    },
    routeSubtitle: {
      color: theme.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    routeLoadingText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: 4,
    },
    reserveButton: {
      position: 'absolute',
      bottom: 80,
      left: 20,
      right: 20,
      backgroundColor: availableTaxis.length > 0 ? theme.primary : theme.textSecondary,
      borderRadius: 25,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 5,
      minHeight: 50,
    },
    reserveButtonText: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    reserveButtonSubtext: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 12,
      marginTop: 4,
    },
  });

  const getInitialRegion = () => {
    if (detectedLocation) {
      return {
        latitude: detectedLocation.latitude,
        longitude: detectedLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (origin) {
      return {
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: -26.2041,
      longitude: 28.0473,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  return (
    <KeyboardAvoidingView 
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Live Location Streaming Status */}
      <View style={{ padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center' }}>
        {locationStreamError ? (
          <Text style={{ color: 'red' }}>{t('home:locationStreamingError')} {locationStreamError}</Text>
        ) : streamedLocation ? (
          <Text style={{ color: 'green' }}>{t('home:liveLocationStreaming')} {streamedLocation.latitude.toFixed(5)}, {streamedLocation.longitude.toFixed(5)}</Text>
        ) : (
          <Text>{t('home:streamingLocation')}</Text>
        )}
      </View>
      
      {isLoadingCurrentLocation ? (
        <View style={[dynamicStyles.map, { justifyContent: 'center', alignItems: 'center' }]}>
          <Image source={loading} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>{t('home:gettingLocation')}</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={dynamicStyles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={getInitialRegion()}
          customMapStyle={isDark ? darkMapStyle : []}
        >
          {origin && 
            typeof origin.latitude === 'number' &&
            typeof origin.longitude === 'number' &&(
              <Marker coordinate={origin} title="Origin" pinColor="blue" />
          )}

          {destination &&
            typeof destination.latitude === 'number' &&
            typeof destination.longitude === 'number' && (
              <Marker coordinate={destination} title={destination.name} pinColor="orange" />
          )}
          
          {(availableTaxis.length > 0 ? availableTaxis : nearbyDrivers || [])
            .filter(driver => 
              typeof driver.latitude === 'number' && 
              typeof driver.longitude === 'number'
            )
            .map((driver, index) => (
              <Marker
                key={`${driver._id}_${availableTaxis.length > 0 ? 'available' : 'nearby'}_${index}`}
                coordinate={{
                  latitude: driver.latitude,
                  longitude: driver.longitude,
                }}
                title={driver.name || "Available Driver"}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="car" size={36} color="green" />
                </View>
              </Marker>
          ))}

          {routeLoaded && routeCoordinates.length > 0 && (
            <Polyline coordinates={routeCoordinates} strokeColor={theme.primary} strokeWidth={4} />
          )}
        </MapView>
      )}

      <ScrollView 
        style={dynamicStyles.bottomSheet}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ 
          paddingBottom: keyboardVisible ? 20 : 100,
          flexGrow: 1 
        }}
      >
        <View style={dynamicStyles.locationBox}>
          <View style={dynamicStyles.locationIndicator}>
            <View style={dynamicStyles.currentLocationCircle}>
              <View style={dynamicStyles.currentLocationDot} />
            </View>
            <View style={dynamicStyles.dottedLineContainer}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={dynamicStyles.dottedLineDot} />
              ))}
            </View>
            <Icon
              name="location"
              size={18}
              color={isDark ? theme.text : "#121212"}
            />
          </View>
          <View style={dynamicStyles.locationTextContainer}>
            {/* Origin Input with Autocomplete */}
            <View style={dynamicStyles.inputContainer}>
              <TextInput
                style={[dynamicStyles.addressInput, dynamicStyles.originInput]}
                placeholder={origin ? origin.name : t('home:enterOriginAddress')}
                value={originAddress}
                onChangeText={(text) => {
                  setOriginAddress(text);
                  setJustSelectedOrigin(false);
                }}
                onSubmitEditing={handleOriginSubmit}
                onFocus={() => {
                  setJustSelectedOrigin(false);
                  if (originSuggestions.length > 0) {
                    setShowOriginSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowOriginSuggestions(false);
                  }, 200);
                }}
                returnKeyType="search"
                placeholderTextColor={isDark ? theme.textSecondary : "#A66400"}
                editable={!isLoadingCurrentLocation}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {isGeocodingOrigin && (
                <Text style={dynamicStyles.geocodingText}>{t('home:findingAddress')}</Text>
              )}
              {isLoadingOriginSuggestions && (
                <Text style={dynamicStyles.geocodingText}>Loading suggestions...</Text>
              )}
              {isLoadingCurrentLocation && (
                <Text style={dynamicStyles.geocodingText}>{t('home:gettingCurrentLocation')}</Text>
              )}

              {/* Origin Suggestions */}
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <View style={dynamicStyles.inputSuggestionsContainer}>
                  <ScrollView 
                    style={dynamicStyles.suggestionScrollView}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled={true}
                  >
                    {originSuggestions.map((item, index) => (
                      <TouchableOpacity 
                        key={item.place_id}
                        style={[
                          dynamicStyles.suggestionItem, 
                          index === originSuggestions.length - 1 && dynamicStyles.suggestionItemLast
                        ]} 
                        onPress={() => handleOriginSuggestionSelect(item)}
                        activeOpacity={0.7}
                      >
                        <View style={dynamicStyles.suggestionIcon}>
                          <Icon name="location-outline" size={14} color={theme.primary} />
                        </View>
                        <View style={dynamicStyles.suggestionTextContainer}>
                          <Text style={dynamicStyles.suggestionMainText} numberOfLines={1}>
                            {item.structured_formatting.main_text}
                          </Text>
                          <Text style={dynamicStyles.suggestionSecondaryText} numberOfLines={1}>
                            {item.structured_formatting.secondary_text}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            
            <View style={dynamicStyles.locationSeparator} />
            
            {/* Destination Input with Autocomplete */}
            <View style={dynamicStyles.inputContainer}>
              <TextInput
                style={[dynamicStyles.addressInput, dynamicStyles.destinationInput]}
                placeholder={t('home:enterDestinationAddress')}
                value={destinationAddress}
                onChangeText={(text) => {
                  setDestinationAddress(text);
                  setJustSelectedDestination(false);
                }}
                onSubmitEditing={handleDestinationSubmit}
                onFocus={() => {
                  setJustSelectedDestination(false);
                  if (destinationSuggestions.length > 0) {
                    setShowDestinationSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowDestinationSuggestions(false);
                  }, 200);
                }}
                returnKeyType="search"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {isGeocodingDestination && (
                <Text style={dynamicStyles.geocodingText}>{t('home:findingAddress')}</Text>
              )}
              {isLoadingDestinationSuggestions && (
                <Text style={dynamicStyles.geocodingText}>Loading suggestions...</Text>
              )}
              
              {isLoadingRoute && (
                <Text style={dynamicStyles.routeLoadingText}>
                  {t('home:loadingRoute')}
                </Text>
              )}
              {routeLoaded && !isLoadingRoute && !isSearchingTaxis && (
                <Text style={[dynamicStyles.routeLoadingText, { color: theme.primary }]}>
                  {t('home:routeLoaded')} ✓
                </Text>
              )}
              {isSearchingTaxis && (
                <Text style={dynamicStyles.routeLoadingText}>
                  {t('home:searchingTaxis')}
                </Text>
              )}

              {/* Destination Suggestions */}
              {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                <View style={dynamicStyles.inputSuggestionsContainer}>
                  <ScrollView 
                    style={dynamicStyles.suggestionScrollView}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled={true}
                  >
                    {destinationSuggestions.map((item, index) => (
                      <TouchableOpacity 
                        key={item.place_id}
                        style={[
                          dynamicStyles.suggestionItem, 
                          index === destinationSuggestions.length - 1 && dynamicStyles.suggestionItemLast
                        ]} 
                        onPress={() => handleDestinationSuggestionSelect(item)}
                        activeOpacity={0.7}
                      >
                        <View style={dynamicStyles.suggestionIcon}>
                          <Icon name="location-outline" size={14} color={theme.primary} />
                        </View>
                        <View style={dynamicStyles.suggestionTextContainer}>
                          <Text style={dynamicStyles.suggestionMainText} numberOfLines={1}>
                            {item.structured_formatting.main_text}
                          </Text>
                          <Text style={dynamicStyles.suggestionSecondaryText} numberOfLines={1}>
                            {item.structured_formatting.secondary_text}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Journey Status */}
        {routeMatchResults && !keyboardVisible && (
          <View style={dynamicStyles.searchResultsContainer}>
            <Text style={dynamicStyles.searchResultsTitle}>
              {t('home:journeyStatus')}
            </Text>
            <View style={dynamicStyles.searchResultsCard}>
              <Text style={dynamicStyles.searchResultsText}>
                📍 {t('home:availableTaxis')} {routeMatchResults.availableTaxis?.length || 0}
              </Text>
              <Text style={dynamicStyles.searchResultsText}>
                🛣 {t('home:matchingRoutes')} {routeMatchResults.matchingRoutes?.length || 0}
              </Text>
              {routeMatchResults.availableTaxis?.length > 0 && routeMatchResults.availableTaxis[0]?.routeInfo?.calculatedFare && (
                <Text style={[dynamicStyles.searchResultsText, { color: theme.primary, fontWeight: 'bold' }]}>
                  💰 Estimated Fare: R{routeMatchResults.availableTaxis[0].routeInfo.calculatedFare.toFixed(2)}
                </Text>
              )}
              {(routeMatchResults.availableTaxis?.length || 0) > 0 && (
                <Text style={[dynamicStyles.searchResultsText, { color: theme.primary }]}>
                  ✅ {t('home:readyToBook')}
                </Text>
              )}
              {(routeMatchResults.availableTaxis?.length || 0) === 0 && (
                <Text style={[dynamicStyles.searchResultsText, { color: theme.textSecondary }]}>
                  ⚠ {t('home:noTaxisAvailable')}
                </Text>
              )}
            </View>
          </View>
        )}

        {!keyboardVisible && (
          <>
            <Text style={dynamicStyles.savedRoutesTitle}>{t('home:recentlyUsedRanks')}</Text>
            <View style={{ marginTop: 10 }}>
              {displayRoutes.length > 0 ? (
                displayRoutes.map((route: any, index: number) => (
                  <TouchableOpacity
                    key={`${route.routeId}-${index}`}
                    style={dynamicStyles.routeCard}
                    onPress={() =>
                      handleDestinationSelect({
                        _id: route._id as any,
                        routeId: route.routeId,
                        destination: route.routeName || 'Saved Destination',
                        destinationCoords: {
                          latitude: route.destinationLat!,
                          longitude: route.destinationLng!,
                        },
                        routeName: route.routeName,
                        startName: route.startName,
                        startLat: route.startLat,
                        startLng: route.startLng,
                      })
                    }
                  >
                    <Icon
                      name="location-sharp"
                      size={20}
                      color={theme.primary}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.routeTitle}>
                        {route.startName && route.routeName 
                          ? `${route.startName} → ${route.routeName}`
                          : 'Unknown Route'
                        }
                      </Text>
                    </View>
                    <Icon
                      name="chevron-forward"
                      size={16}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ textAlign: 'center', marginTop: 8, color: theme.textSecondary }}>
                  {t('home:noRecentRoutes')}
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Reserve a Seat Button */}
      {routeLoaded && !isLoadingRoute && !keyboardVisible && (
        <Animated.View style={{ opacity: buttonOpacity }}>
          <TouchableOpacity style={dynamicStyles.reserveButton} onPress={handleReserveSeat}>
            <Text style={dynamicStyles.reserveButtonText}>
              {isSearchingTaxis 
                ? t('home:findingTaxis')
                : availableTaxis.length > 0 
                  ? t('home:reserveSeatWithCount').replace('{count}', availableTaxis.length.toString())
                  : t('home:reserveSeat')
              }
            </Text>
            {isSearchingTaxis && (
              <Text style={dynamicStyles.reserveButtonSubtext}>
                {t('home:searchingDrivers')}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];