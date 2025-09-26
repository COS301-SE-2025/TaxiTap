import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
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
import { LoadingSpinner } from '../../components/LoadingSpinner';
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
import type { MultiLegJourneyResult } from "../../convex/functions/routes/enhancedTaxiMatching";
import { MultiLegJourneyPreview, type MultiLegJourneyOption } from './MultiLegJourneyPreview';

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
  const forceCancelStuckRides = useMutation(api.functions.rides.forceCancelStuckRides.forceCancelStuckRides);
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

  // NEW: Route programmatically selected state
  const [routeProgrammaticallySelected, setRouteProgrammaticallySelected] = useState(false);

  // NEW: Keyboard handling states
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Enhanced taxi matching states
  const [availableTaxis, setAvailableTaxis] = useState<any[]>([]);
  const [isSearchingTaxis, setIsSearchingTaxis] = useState(false);
  const [routeMatchResults, setRouteMatchResults] = useState<any>(null);

  // Multi-leg journey states
  const [showMultiLegPreview, setShowMultiLegPreview] = useState(false);
  const [multiLegOptions, setMultiLegOptions] = useState<MultiLegJourneyResult["multiLegOptions"] | null>(null);
  const [userPreference, setUserPreference] = useState('shortest_time');

  // States for progressive radius expansion
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [radiusExpansionTimer, setRadiusExpansionTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [currentSearchRadius, setCurrentSearchRadius] = useState<number>(1.0);
  const [radiusExpansionInfo, setRadiusExpansionInfo] = useState<any>(null);
  const [nextExpansionCountdown, setNextExpansionCountdown] = useState<number>(0);

  // Enhanced state to trigger taxi search
  const [taxiSearchParams, setTaxiSearchParams] = useState<{
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    searchStartTime?: number;
    _pollTime?: number; // Internal timestamp to force re-queries
  } | null>(null);

  // Use ref to prevent infinite loops
  const expansionInProgress = useRef(false);
  const hasResetOnFocus = useRef(false);
  
  // State to track if we're in a reset state to prevent automatic actions
  const [isResetting, setIsResetting] = useState(false);
  
  // Ref to track if we've manually reset to prevent auto-origin setting
  const hasManuallyReset = useRef(false);

  // Update countdown from Convex function's radiusInfo
  useEffect(() => {
    if (radiusExpansionInfo && radiusExpansionInfo.nextExpansionTime && isSearchingTaxis) {
      const interval = setInterval(() => {
        const timeUntilNext = Math.max(0, radiusExpansionInfo.nextExpansionTime - Date.now());
        const countdownValue = Math.ceil(timeUntilNext / 1000);
        setNextExpansionCountdown(countdownValue);

        // Stop countdown when it reaches 0
        if (countdownValue <= 0) {
          setNextExpansionCountdown(0);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setNextExpansionCountdown(0);
    }
  }, [radiusExpansionInfo, isSearchingTaxis]);

  const lastProcessedSearchTime = useRef<number | null>(null);

  const [manualDestinations, setManualDestinations] = useState<Record<string, any>>({});

  // Query for enhanced taxi matching - only runs when we have search params
  const taxiSearchResult = useQuery(
    api.functions.routes.enhancedTaxiMatching.findAvailableTaxisForJourney,
    taxiSearchParams ? {
      originLat: taxiSearchParams.originLat,
      originLng: taxiSearchParams.originLng,
      destinationLat: taxiSearchParams.destinationLat,
      destinationLng: taxiSearchParams.destinationLng,
      searchStartTime: taxiSearchParams.searchStartTime,
      maxOriginDistance: 3.0,      // 3km radius from origin
      maxDestinationDistance: 3.0, // 3km radius from destination
      // Remove maxTaxiDistance to let function handle dynamic radius expansion
      maxResults: 10
    } : "skip"
  );

  // NEW: Query for multi-leg journey analysis - only runs when we have search params
  const journeyAnalysisResult = useQuery(
    api.functions.routes.enhancedTaxiMatching.analyzeMultiLegJourneyOptions,
    taxiSearchParams ? {
      originLat: taxiSearchParams.originLat,
      originLng: taxiSearchParams.originLng,
      destinationLat: taxiSearchParams.destinationLat,
      destinationLng: taxiSearchParams.destinationLng,
      optimizationPreference: userPreference || 'shortest_time'
    } : "skip"
  );

  // Check for active rides to prevent duplicate requests
  const activeRide = useQuery(
    api.functions.rides.getActiveRideByPassenger.getActiveRideByPassenger,
    user?.id ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
  );

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
    if (!GOOGLE_MAPS_API_KEY || input.trim().length < 3) {
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
    if (justSelectedOrigin || routeProgrammaticallySelected) return;
    
    const timeoutId = setTimeout(async () => {
      if (originAddress.trim().length >= 3) {
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
  }, [originAddress, detectedLocation, justSelectedOrigin, routeProgrammaticallySelected]);

  // NEW: Debounced autocomplete for destination
  useEffect(() => {
    if (justSelectedDestination || routeProgrammaticallySelected) return;
    
    const timeoutId = setTimeout(async () => {
      if (destinationAddress.trim().length >= 3) {
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
  }, [destinationAddress, detectedLocation, justSelectedDestination, routeProgrammaticallySelected]);

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
      // Clear manual reset flag when user selects origin
      hasManuallyReset.current = false;
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
      // Clear manual reset flag when user selects destination
      hasManuallyReset.current = false;
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
    clearMapContext,
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

  // Auto-set origin to current location when detected (only on initial load, not after resets)
  // DISABLED: Let user manually set origin to prevent automatic taxi searches
  // useEffect(() => {
  //   if (detectedLocation && !origin && !isResetting && !hasManuallyReset.current) {
  //     setOrigin({
  //       latitude: detectedLocation.latitude,
  //       longitude: detectedLocation.longitude,
  //       name: t('common:currentLocation')
  //     });
  //     setOriginAddress(t('common:currentLocation'));
  //   }
  // }, [detectedLocation, origin, isResetting]);

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
            routeName: t('home:locationUnavailable'),
            destinationLat: null,
            destinationLng: null,
            startName: recent.startName,
            startLat: recent.startLat,
            startLng: recent.startLng,
            isManualRoute: true,
          };
        }
      }

      // Try to find the route by routeId first
      let fullRoute = routes.find(r => r.routeId === recent.routeId);
      
      // If not found by routeId, try to find by _id
      if (!fullRoute) {
        fullRoute = routes.find(r => r._id === recent.routeId);
      }
      
      // If still not found, try to find by matching the stored name with route destination
      if (!fullRoute && recent.name) {
        fullRoute = routes.find(r => 
          r.destination?.toLowerCase().includes(recent.name.toLowerCase()) ||
          recent.name.toLowerCase().includes(r.destination?.toLowerCase() || '')
        );
      }
      
      // Additional fallback: try to find by matching start and destination names
      if (!fullRoute && recent.startName && recent.name) {
        fullRoute = routes.find(r => 
          (r.start?.toLowerCase().includes(recent.startName?.toLowerCase() || '') ||
           recent.startName?.toLowerCase().includes(r.start?.toLowerCase() || '')) &&
          (r.destination?.toLowerCase().includes(recent.name.toLowerCase()) ||
           recent.name.toLowerCase().includes(r.destination?.toLowerCase() || ''))
        );
      }
      
      if (fullRoute) {
        console.log('🔍 Found route for recent route:', {
          recentRouteId: recent.routeId,
          recentName: recent.name,
          foundRoute: {
            _id: fullRoute._id,
            routeId: fullRoute.routeId,
            start: fullRoute.start,
            destination: fullRoute.destination,
            hasDestinationCoords: !!fullRoute.destinationCoords
          }
        });
        
        return {
          ...recent,
          _id: fullRoute._id,
          routeName: fullRoute.destination,
          routeDisplayName: `${fullRoute.start} → ${fullRoute.destination}`,
          destinationLat: fullRoute.destinationCoords?.latitude || null,
          destinationLng: fullRoute.destinationCoords?.longitude || null,
          startName: recent.startName || fullRoute.start,
          startLat: recent.startLat || fullRoute.startCoords?.latitude,
          startLng: recent.startLng || fullRoute.startCoords?.longitude,
          isManualRoute: false,
        };
      }

      console.log('❌ No route found for recent route:', {
        recentRouteId: recent.routeId,
        recentName: recent.name,
        recentStartName: recent.startName,
        availableRoutes: routes.map(r => ({ _id: r._id, routeId: r.routeId, start: r.start, destination: r.destination }))
      });

      // Use the stored names if available, otherwise show unknown route
      const displayName = recent.name || t('home:unknownRoute');
      const startDisplayName = recent.startName || t('home:currentLocation');

      return {
        ...recent,
        _id: recent._id,
        routeName: displayName,
        routeDisplayName: `${startDisplayName} → ${displayName}`,
        destinationLat: recent.destinationLat || null,
        destinationLng: recent.destinationLng || null,
        startName: startDisplayName,
        startLat: recent.startLat || null,
        startLng: recent.startLng || null,
        isManualRoute: false,
      };
    }).filter((route: any) => route !== null);
  }, [recentRoutes, routes, manualDestinations]);

  const displayRoutes = fullRecentRoutes.filter(
    (r: any): r is NonNullable<typeof r> => 
      r !== null && 
      r.startName && 
      r.routeName
  );

  // Reset state on component mount
  useEffect(() => {
    setIsResetting(true);
    hasManuallyReset.current = true;
    
    // Clear MapContext state first
    clearMapContext();
    
    // Reset local state
    setSelectedRouteId(null);
    setOriginAddress('');
    setDestinationAddress('');
    setAvailableTaxis([]);
    setRouteMatchResults(null);
    setIsSearchingTaxis(false);
    setSearchStartTime(null);
    setCurrentSearchRadius(1.0);
    setRadiusExpansionInfo(null);
    setNextExpansionCountdown(0);
    
    // Clear any existing expansion timer
    if (radiusExpansionTimer) {
      clearTimeout(radiusExpansionTimer);
      setRadiusExpansionTimer(null);
    }
    
    // Reset expansion flag
    expansionInProgress.current = false;
    lastProcessedSearchTime.current = null;
    
    // Reset taxi search params
    setTaxiSearchParams(null);
    
    // Reset autocomplete states
    setShowOriginSuggestions(false);
    setShowDestinationSuggestions(false);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setJustSelectedOrigin(false);
    setJustSelectedDestination(false);
    setRouteProgrammaticallySelected(false);
    
    // Reset geocoding states
    setIsGeocodingOrigin(false);
    setIsGeocodingDestination(false);
    
    // Reset location loading state
    setIsLoadingCurrentLocation(false);
    
    // Reset the resetting flag after a short delay
    setTimeout(() => {
      setIsResetting(false);
      hasManuallyReset.current = false;
    }, 100);
  }, []); // Empty dependency array - only run on mount

  // Reset state when screen comes into focus (e.g., after ending a ride)
  // Using a ref to track if we've already reset on this focus to prevent infinite loops
  useFocusEffect(
    useCallback(() => {
      // Only reset if we haven't already reset on this focus
      if (!hasResetOnFocus.current) {
        hasResetOnFocus.current = true;
        console.log('🎯 HomeScreen focused - resetting state');
        
        setIsResetting(true);
        hasManuallyReset.current = true;
        
        // Clear MapContext state first
        clearMapContext();
        
        // Reset local state
        setSelectedRouteId(null);
        setOriginAddress('');
        setDestinationAddress('');
        setAvailableTaxis([]);
        setRouteMatchResults(null);
        setIsSearchingTaxis(false);
        setSearchStartTime(null);
        setCurrentSearchRadius(1.0);
        setRadiusExpansionInfo(null);
        setNextExpansionCountdown(0);
        
        // Clear any existing expansion timer
        if (radiusExpansionTimer) {
          clearTimeout(radiusExpansionTimer);
          setRadiusExpansionTimer(null);
        }
        
        // Reset expansion flag
        expansionInProgress.current = false;
        lastProcessedSearchTime.current = null;
        
        // Reset taxi search params
        setTaxiSearchParams(null);
        
        // Reset autocomplete states
        setShowOriginSuggestions(false);
        setShowDestinationSuggestions(false);
        setOriginSuggestions([]);
        setDestinationSuggestions([]);
        setJustSelectedOrigin(false);
        setJustSelectedDestination(false);
        setRouteProgrammaticallySelected(false);
        
        // Reset geocoding states
        setIsGeocodingOrigin(false);
        setIsGeocodingDestination(false);
        
        // Reset location loading state
        setIsLoadingCurrentLocation(false);
        
        // Reset the resetting flag after a short delay
        setTimeout(() => {
          setIsResetting(false);
          hasManuallyReset.current = false;
        }, 100);
      }
      
      // Reset the flag when component unmounts or loses focus
      return () => {
        hasResetOnFocus.current = false;
        // Clear taxi search when screen loses focus (e.g., when navigating to ride details)
        console.log('🚫 HomeScreen lost focus - clearing taxi search');
        setTaxiSearchParams(null);
        setIsSearchingTaxis(false);
        setAvailableTaxis([]);
        setRouteMatchResults(null);
        
        // Clear any existing expansion timer
        if (radiusExpansionTimer) {
          clearTimeout(radiusExpansionTimer);
          setRadiusExpansionTimer(null);
        }
      };
    }, []) // Empty dependency array to prevent infinite loops
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


  // Removed old radius expansion monitoring - now handled by Convex function

  // Enhanced function to search for available taxis with radius expansion
  const searchForAvailableTaxis = async (
    origin: { latitude: number; longitude: number; name: string },
    dest: { latitude: number; longitude: number; name: string }
  ) => {
    if (!userId) {
      return;
    }

    // Clear previous search state
    setAvailableTaxis([]);
    setRouteMatchResults(null);
    setIsSearchingTaxis(true);

    // Clear any existing timer and reset expansion flag
    if (radiusExpansionTimer) {
      clearTimeout(radiusExpansionTimer);
      setRadiusExpansionTimer(null);
    }
    expansionInProgress.current = false;
    lastProcessedSearchTime.current = null;

    // Initialize search with timestamp for radius expansion
    const startTime = Date.now();
    setSearchStartTime(startTime);
    setCurrentSearchRadius(1.0);

    try {
      // Set up taxi search parameters - let Convex function handle radius expansion
      setTaxiSearchParams({
        originLat: origin.latitude,
        originLng: origin.longitude,
        destinationLat: dest.latitude,
        destinationLng: dest.longitude,
        searchStartTime: startTime,
      });

    } catch (error) {
      console.error('Error in searchForAvailableTaxis:', error);
      setIsSearchingTaxis(false);
      setSearchStartTime(null);
      Alert.alert(
        t('home:searchError'),
        t('home:unableToFindTaxis'),
        [{ text: t('common:ok') }]
      );
      setAvailableTaxis([]);
      setRouteMatchResults(null);
    }
  };

  // NEW: Handle journey analysis results for multi-leg journeys
  useEffect(() => {
    if (journeyAnalysisResult) {
      console.log('🔍 Journey analysis result:', journeyAnalysisResult);
      
      if (journeyAnalysisResult.requiresMultiLeg && journeyAnalysisResult.multiLegOptions) {
        console.log('🔄 Multi-leg journey required, showing preview');
        setShowMultiLegPreview(true);
        setMultiLegOptions(journeyAnalysisResult.multiLegOptions);
        setIsSearchingTaxis(false);
        setSearchStartTime(null);
        
        // Clear any existing expansion timer
        if (radiusExpansionTimer) {
          clearTimeout(radiusExpansionTimer);
          setRadiusExpansionTimer(null);
        }
      } else if (journeyAnalysisResult.directRoute && journeyAnalysisResult.directRoute.success) {
        console.log('✅ Direct route available, proceeding with single-leg search');
        // Continue with normal taxi search flow
      }
    }
  }, [journeyAnalysisResult]);

  // Handle taxi search results - simplified to avoid infinite loops
  useEffect(() => {
    if (taxiSearchResult) {
      const { radiusInfo } = taxiSearchResult;

      // Update radius info from Convex function
      if (radiusInfo) {
        setRadiusExpansionInfo(radiusInfo);
        setCurrentSearchRadius(radiusInfo.currentRadius);
      }

      if (taxiSearchResult.success) {
        setAvailableTaxis(taxiSearchResult.availableTaxis);
        setRouteMatchResults(taxiSearchResult);

        // If we found taxis or reached max radius, stop searching
        if (taxiSearchResult.availableTaxis.length > 0 ||
           (radiusInfo && radiusInfo.currentRadius >= radiusInfo.maxRadius)) {
          console.log(`✅ Search complete: ${taxiSearchResult.availableTaxis.length} taxis found`);
          setIsSearchingTaxis(false);
          setSearchStartTime(null);
          if (radiusExpansionTimer) {
            clearTimeout(radiusExpansionTimer);
            setRadiusExpansionTimer(null);
          }
        }
        // Continue searching - set up polling to check for radius expansion
        else if (radiusInfo && radiusInfo.currentRadius < radiusInfo.maxRadius) {
          console.log(`🔍 No taxis found at ${radiusInfo.currentRadius}km, will check again in 5 seconds`);

          // Set up a timer to poll the Convex function again
          if (!radiusExpansionTimer) {
            const expansionTimer = setTimeout(() => {
              setRadiusExpansionTimer(null);

              // Force re-query by updating poll timestamp
              if (taxiSearchParams && isSearchingTaxis) {
                console.log(`🔄 Checking for updates...`);
                setTaxiSearchParams({
                  ...taxiSearchParams,
                  _pollTime: Date.now(), // Add poll timestamp to force re-query
                });
              }
            }, 5000); // Check every 5 seconds

            setRadiusExpansionTimer(expansionTimer);
          }
        }
      } else {
        console.log(`❌ Search failed: ${taxiSearchResult.message || 'Unknown error'}`);
        setAvailableTaxis([]);
        setRouteMatchResults(taxiSearchResult);
        setIsSearchingTaxis(false);
        setSearchStartTime(null);
        if (radiusExpansionTimer) {
          clearTimeout(radiusExpansionTimer);
          setRadiusExpansionTimer(null);
        }
      }
    }
  }, [taxiSearchResult]);

  // NEW: Handle address changes with programmatic flag reset
  const handleOriginAddressChange = (text: string) => {
    setOriginAddress(text);
    setJustSelectedOrigin(false);
    
    // If user is manually typing, allow autocomplete again
    if (routeProgrammaticallySelected) {
      setRouteProgrammaticallySelected(false);
    }
    
    // Clear manual reset flag when user starts typing
    if (text.length > 0) {
      hasManuallyReset.current = false;
    }
  };

  const handleDestinationAddressChange = (text: string) => {
    setDestinationAddress(text);
    setJustSelectedDestination(false);
    
    // If user is manually typing, allow autocomplete again
    if (routeProgrammaticallySelected) {
      setRouteProgrammaticallySelected(false);
    }
    
    // Clear manual reset flag when user starts typing
    if (text.length > 0) {
      hasManuallyReset.current = false;
    }
  };

  // Handle origin address submission (fallback for manual entry)
  const handleOriginSubmit = async () => {
    if (!originAddress.trim()) return;
    
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
    setIsGeocodingOrigin(true);
    
    const result = await geocodeAddress(originAddress);
    setIsGeocodingOrigin(false);

    if (result) {
      // Clear manual reset flag when user submits origin
      hasManuallyReset.current = false;
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
      // Clear manual reset flag when user submits destination
      hasManuallyReset.current = false;
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
    // Only get route if both origin and destination are set AND we're not in a reset state
    // AND we haven't manually reset (to prevent automatic searches after ride completion)
    if (origin && destination && !isResetting && !hasManuallyReset.current) {
      console.log('🛣️ Auto-triggering route calculation:', { origin: origin.name, destination: destination.name });
      getRoute(origin, destination);
    } else if (origin && destination && (isResetting || hasManuallyReset.current)) {
      console.log('🚫 Skipping route calculation due to reset state:', { 
        isResetting, 
        hasManuallyReset: hasManuallyReset.current,
        origin: origin?.name, 
        destination: destination?.name 
      });
    }
  }, [origin, destination, isResetting]);

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

    // Set the flag to prevent autocomplete
    setRouteProgrammaticallySelected(true);

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
    
    // Always try to use the stored start location first
    if (route.startLat && route.startLng && route.startName) {
      const startLocation = {
        latitude: route.startLat,
        longitude: route.startLng,
        name: route.startName,
      };
      
      setOrigin(startLocation);
      setOriginAddress(route.startName);
      console.log('📍 Using stored start location:', startLocation);
    } else if (detectedLocation) {
      // Only fall back to current location if no stored start location
      setOrigin({
        latitude: detectedLocation.latitude,
        longitude: detectedLocation.longitude,
        name: t('home:currentLocation')
      });
      setOriginAddress(t('home:currentLocation'));
      console.log('📍 Using current location as fallback');
    }
    
    const routeIdToUse = route.routeId.startsWith("manual-") ? route.routeId : route._id;
    setSelectedRouteId(routeIdToUse);

    console.log('🎯 Route selected:', {
      routeId: routeIdToUse,
      destination: displayName,
      startName: route.startName || t('home:currentLocation'),
      hasStartCoords: !!(route.startLat && route.startLng)
    });

    // Clear autocomplete suggestions and flags
    setShowOriginSuggestions(false);
    setShowDestinationSuggestions(false);
    setOriginSuggestions([]);
    setDestinationSuggestions([]);
    setJustSelectedOrigin(true);
    setJustSelectedDestination(true);
  };

  // Show loading spinner if essential data is loading
  if (!user || recentRoutes === undefined || routes === undefined) {
    return <LoadingSpinner />;
  }

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.background 
    },
    map: { 
      height: keyboardVisible ? '30%' : '40%'
    },
    bottomSheet: {
      flex: 1,
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)',
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 24,
      paddingTop: 32,
      paddingBottom: keyboardVisible ? Math.max(keyboardHeight - 100, 24) : 24,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    locationBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59)' 
        : 'rgba(255, 255, 255)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
      paddingVertical: 20,
      paddingHorizontal: 20,
      marginBottom: keyboardVisible ? 10 : 10,
      width: '100%',
      alignSelf: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 8,
      elevation: 6,
    },
    locationIndicator: {
      marginRight: 16,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 8,
    },
    currentLocationCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      borderWidth: 2,
      borderColor: '#F59E0B',
      marginBottom: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
    },
    currentLocationDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    dottedLineContainer: {
      height: 40,
      width: 1,
      marginBottom: 12,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dottedLineDot: {
      width: 3,
      height: 4,
      backgroundColor: theme.primary,
      borderRadius: 1.5,
    },
    locationTextContainer: {
      flex: 1,
      position: 'relative',
    },
    inputContainer: {
      marginBottom: 8,
      position: 'relative',
    },
    addressInput: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      backgroundColor: 'transparent',
      padding: 0,
      margin: 0,
      letterSpacing: -0.2,
    },
    originInput: {
      color: isDark ? theme.primary : "#F59E0B",
      marginBottom: 20,
    },
    destinationInput: {
      marginLeft: 2,
    },
    locationSeparator: {
      height: 2,
      backgroundColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
      marginBottom: 24,
      marginHorizontal: 4,
      borderRadius: 1,
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
      left: 0,
      right: 0,
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      maxHeight: 200,
      zIndex: 1000,
      elevation: 12,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.5 : 0.2,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.4)' 
        : 'rgba(226, 232, 240, 0.9)',
      marginTop: 12,
    },
    suggestionScrollView: {
      maxHeight: 200,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: isDark 
        ? 'rgba(71, 85, 105, 0.2)' 
        : 'rgba(226, 232, 240, 0.5)',
      minHeight: 64,
    },
    suggestionItemLast: {
      borderBottomWidth: 0,
    },
    suggestionIcon: {
      marginRight: 16,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark 
        ? 'rgba(245, 158, 11, 0.1)' 
        : 'rgba(245, 158, 11, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(245, 158, 11, 0.2)' 
        : 'rgba(245, 158, 11, 0.1)',
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
      marginBottom: 24,
    },
    searchResultsTitle: {
      fontWeight: '700',
      fontSize: 18,
      marginBottom: 16,
      color: theme.text,
      letterSpacing: -0.5,
    },
    searchResultsCard: {
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59)' 
        : 'rgba(255, 255, 255)',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    },
    searchResultsText: {
      fontSize: 15,
      color: theme.text,
      marginBottom: 8,
      fontWeight: '500',
      letterSpacing: -0.2,
    },
    savedRoutesTitle: {
      fontWeight: '700',
      fontSize: 18,
      marginBottom: 16,
      color: theme.text,
      letterSpacing: -0.5,
    },
    routeCard: {
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59)' 
        : 'rgba(255, 255, 255)',
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(25, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    routeTitle: {
      fontWeight: '600',
      fontSize: 16,
      color: theme.text,
      letterSpacing: -0.3,
    },
    routeSubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      marginTop: 4,
      fontWeight: '500',
      opacity: 0.8,
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
      left: 24,
      right: 24,
      backgroundColor: availableTaxis.length > 0 ? '#F59E0B' : theme.textSecondary,
      borderRadius: 28,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: 0.4,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 8,
      minHeight: 56,
      borderWidth: 2,
      borderColor: availableTaxis.length > 0 ? '#D97706' : 'transparent',
    },
    reserveButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    reserveButtonSubtext: {
      color: '#FFFFFF',
      fontSize: 13,
      marginTop: 6,
      fontWeight: '500',
      opacity: 0.9,
    },
    activeRideWarning: {
      padding: 12,
      margin: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    activeRideWarningText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      marginRight: 8,
    },
    cancelRideButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    cancelRideButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
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

  const handleMultiLegJourneyConfirm = (selectedOption: MultiLegJourneyOption, preference: string) => {
    console.log('🚀 Confirming multi-leg journey:', selectedOption, preference);
    
    // Hide the multi-leg preview
    setShowMultiLegPreview(false);
    setMultiLegOptions(null);
    
    // Update user preference
    setUserPreference(preference);
    
    // TODO: Implement multi-leg journey creation
    // This would typically involve:
    // 1. Creating a multi-leg journey record in the database
    // 2. Starting the first leg of the journey
    // 3. Navigating to the appropriate screen for multi-leg journey management
    
    // For now, show an alert and proceed with the first leg
    Alert.alert(
      'Multi-Leg Journey Started',
      `Starting ${selectedOption.totalLegs}-leg journey. Total estimated time: ${Math.round(selectedOption.estimatedTotalDuration / 60)} minutes, Total fare: R${selectedOption.estimatedTotalFare.toFixed(2)}`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to the first leg or journey management screen
            // This would be implemented based on your app's navigation structure
            console.log('Proceeding with multi-leg journey...');
          }
        }
      ]
    );
  };

  const handleForceCancelStuckRides = async () => {
    if (!user?.id) return;
    
    try {
      const result = await forceCancelStuckRides({
        passengerId: user.id as Id<"taxiTap_users">,
        reason: "Cancelled by user due to stuck state"
      });
      
      showGlobalAlert({
        title: 'Rides Cancelled',
        message: `Successfully cancelled ${result.cancelledRides} stuck ride(s). You can now request a new ride.`,
        type: 'success',
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
    } catch (error: any) {
      showGlobalError('Error', error?.message || 'Failed to cancel stuck rides', {
        duration: 4000,
        position: 'top',
        animation: 'slide-down',
      });
    }
  };

  return (
    <KeyboardAvoidingView 
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Show active ride warning if user has a stuck ride */}
      {activeRide && (
        <View style={[dynamicStyles.activeRideWarning, { backgroundColor: '#ff9800' }]}>
          <Text style={dynamicStyles.activeRideWarningText}>
            You have an active ride ({activeRide.status}). Please complete or cancel it before requesting a new one.
          </Text>
          <TouchableOpacity 
            style={dynamicStyles.cancelRideButton}
            onPress={handleForceCancelStuckRides}
          >
            <Text style={dynamicStyles.cancelRideButtonText}>Cancel Stuck Ride</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoadingCurrentLocation ? (
        <View style={[dynamicStyles.map, { 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: isDark 
            ? 'rgba(30, 41, 59, 0.1)' 
            : 'rgba(255, 255, 255, 0.1)'
        }]}>
          <View style={{
            backgroundColor: isDark 
              ? 'rgba(30, 41, 59, 0.9)' 
              : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 24,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark 
              ? 'rgba(71, 85, 105, 0.3)' 
              : 'rgba(226, 232, 240, 0.8)',
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 16,
            elevation: 8,
          }}>
            <LoadingSpinner />
            <Text style={{ 
              color: theme.text, 
              marginTop: 16, 
              fontSize: 16, 
              fontWeight: '600',
              letterSpacing: -0.2
            }}>
              {t('home:gettingLocation')}
            </Text>
          </View>
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
            typeof origin.longitude === 'number' && (
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                  style={[dynamicStyles.addressInput, dynamicStyles.originInput, { flex: 1 }]}
                placeholder={origin ? origin.name : t('home:enterOriginAddress')}
                value={originAddress}
                onChangeText={handleOriginAddressChange}
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
              </View>
              {isGeocodingOrigin && (
                <Text style={dynamicStyles.geocodingText}>{t('home:findingAddress')}</Text>
              )}
              {isLoadingOriginSuggestions && (
                <Text style={dynamicStyles.geocodingText}>{t('home:loadingSuggestions')}</Text>
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
                onChangeText={handleDestinationAddressChange}
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
                <Text style={dynamicStyles.geocodingText}>{t('home:loadingSuggestions')}</Text>
              )}
              
              {isLoadingRoute && (
                <Text style={[dynamicStyles.routeLoadingText, { 
                  color: '#F59E0B', 
                  fontWeight: '600',
                  fontSize: 13
                }]}>
                  {t('home:loadingRoute')}
                </Text>
              )}
              {routeLoaded && !isLoadingRoute && !isSearchingTaxis && (
                <Text style={[dynamicStyles.routeLoadingText, { 
                  color: '#10B981', 
                  fontWeight: '600',
                  fontSize: 13
                }]}>
                  {t('home:routeLoaded')}
                </Text>
              )}
              {isSearchingTaxis && (
                <Text style={[dynamicStyles.routeLoadingText, {
                  color: '#3B82F6',
                  fontWeight: '600',
                  fontSize: 13
                }]}>
                  {`Searching at ${currentSearchRadius}km radius`}
                  {currentSearchRadius < 3.0 && nextExpansionCountdown > 0 &&
                    ` • Expanding in ${nextExpansionCountdown}s`
                  }
                </Text>
              )}

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

        {detectedLocation && !origin && (
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 24,
              marginBottom: 15,
              marginTop: 10,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: theme.shadow,
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
              elevation: 4,
              width: "100%",
            }}
            onPress={() => {
              // Clear the manual reset flag when user manually sets origin
              hasManuallyReset.current = false;
              
              const currentLocationOrigin = {
                latitude: detectedLocation.latitude,
                longitude: detectedLocation.longitude,
                name: t('home:currentLocation')
              };
              
              // Set origin and address
              setOrigin(currentLocationOrigin);
              setOriginAddress(t('home:currentLocation'));
              
              // Animate map to current location to show the user where they are
              mapRef.current?.animateToRegion(
                {
                  latitude: detectedLocation.latitude,
                  longitude: detectedLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                },
                1000
              );
            }}
            activeOpacity={0.8}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Icon 
                name="location" 
                size={14} 
                color="#FFFFFF" 
                style={{ marginRight: 6 }} 
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: 0.2,
              }}>
                {t('home:currentLocation')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Radius Expansion Status */}
        {isSearchingTaxis && !keyboardVisible && searchStartTime && (
          <View style={dynamicStyles.searchResultsContainer}>
            <Text style={dynamicStyles.searchResultsTitle}>
              🎯 Search Radius Status
            </Text>
            <View style={dynamicStyles.searchResultsCard}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: isDark
                  ? 'rgba(71, 85, 105, 0.2)'
                  : 'rgba(226, 232, 240, 0.5)',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: currentSearchRadius >= 3.0 ? '#EF4444' : '#3B82F6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Icon name="radio" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[dynamicStyles.searchResultsText, {
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 4
                  }]}>
                    Current Radius: {currentSearchRadius}km
                  </Text>
                  <Text style={[dynamicStyles.searchResultsText, {
                    fontSize: 13,
                    opacity: 0.8
                  }]}>
                    {currentSearchRadius >= 3.0
                      ? 'Maximum radius reached'
                      : `Expanding to ${currentSearchRadius + 0.5}km`
                    }
                  </Text>
                </View>
              </View>

              {currentSearchRadius < 3.0 && nextExpansionCountdown > 0 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  backgroundColor: isDark
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'rgba(59, 130, 246, 0.05)',
                  borderRadius: 12,
                }}>
                  <Icon name="time" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={{
                    color: '#3B82F6',
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                    Next expansion in {nextExpansionCountdown}s
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Journey Status - REMOVED for better usability */}

        {!keyboardVisible && !routeLoaded && (
          <>
            <Text style={dynamicStyles.savedRoutesTitle}>
              {t('home:recentlyUsedRoutes')}
            </Text>
            <View style={{ marginTop: 16 }}>
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
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isDark 
                        ? 'rgba(245, 158, 11, 0.1)' 
                        : 'rgba(245, 158, 11, 0.05)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 16,
                      borderWidth: 1,
                      borderColor: isDark 
                        ? 'rgba(245, 158, 11, 0.2)' 
                        : 'rgba(245, 158, 11, 0.1)',
                    }}>
                      <Icon
                        name="location-sharp"
                        size={24}
                        color="#F59E0B"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dynamicStyles.routeTitle}>
                        {route.startName && route.routeName 
                          ? `${route.startName} → ${route.routeName}`
                          : 'Unknown Route'
                        }
                      </Text>

                    </View>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: isDark 
                        ? 'rgba(71, 85, 105, 0.2)' 
                        : 'rgba(226, 232, 240, 0.5)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Icon
                        name="chevron-forward"
                        size={16}
                        color={theme.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{
                  backgroundColor: isDark 
                    ? 'rgba(30, 41, 59, 0.5)' 
                    : 'rgba(255, 255, 255, 0.5)',
                  borderRadius: 20,
                  padding: 32,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark 
                    ? 'rgba(71, 85, 105, 0.2)' 
                    : 'rgba(226, 232, 240, 0.5)',
                }}>
                  <Icon
                    name="location-outline"
                    size={48}
                    color={theme.textSecondary}
                    style={{ marginBottom: 16, opacity: 0.5 }}
                  />
                  <Text style={{ 
                    textAlign: 'center', 
                    color: theme.textSecondary,
                    fontSize: 16,
                    fontWeight: '500',
                    opacity: 0.8
                  }}>
                    {t('home:noRecentRoutes')}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Reserve a Seat Button */}
      {routeLoaded && !isLoadingRoute && !keyboardVisible && (
        <Animated.View style={{ opacity: buttonOpacity }}>
          <TouchableOpacity 
            style={dynamicStyles.reserveButton} 
            onPress={handleReserveSeat}
            activeOpacity={0.9}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isSearchingTaxis ? (
                <Icon name="search" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              ) : (
                <Icon name="location" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              )}
              <Text style={dynamicStyles.reserveButtonText}>
                {isSearchingTaxis
                  ? `Finding Taxis (${currentSearchRadius}km radius)`
                  : availableTaxis.length > 0
                    ? t('home:reserveSeatWithCount').replace('{count}', availableTaxis.length.toString())
                    : t('home:reserveSeat')
                }
              </Text>
            </View>
            {isSearchingTaxis && (
              <Text style={dynamicStyles.reserveButtonSubtext}>
                {currentSearchRadius < 3.0 && nextExpansionCountdown > 0
                  ? `Expanding to ${currentSearchRadius + 0.5}km in ${nextExpansionCountdown}s`
                  : currentSearchRadius >= 3.0
                    ? 'Searching at maximum radius (3km)'
                    : t('home:searchingDrivers')
                }
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* I think this is where Unathi's code comes in; import your page? Not sure..? */}
      {/* Annie: the issues were due to a variable using anytype so i changed it to infer the types. it should work now im just unsure about the imports*/}
      {showMultiLegPreview && multiLegOptions && (
        <MultiLegJourneyPreview
          options={multiLegOptions.map((opt: any) => ({
            ...opt,
            journeyId: opt.journeyId ?? opt.optionId ?? '',
            estimatedTotalFare: opt.estimatedTotalFare ?? opt.estimatedTotalCost ?? 0,
            estimatedTotalDuration: opt.estimatedTotalDuration ?? opt.estimatedTotalTime ?? 0,
            optimizationPreference: opt.optimizationPreference ?? opt.optimizationCriteria ?? '',
          }))}
          onConfirm={handleMultiLegJourneyConfirm}
          onCancel={() => setShowMultiLegPreview(false)}
        />
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