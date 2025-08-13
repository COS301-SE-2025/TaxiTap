import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useMapContext, createRouteKey } from '../../contexts/MapContext';
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

const GOOGLE_MAPS_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

export default function HomeScreen() {
  const { user } = useUser();
  const { userId: navId } = useLocalSearchParams<{ userId?: string }>();
  const userId = user?.id || navId || '';
  const role = user?.role || user?.accountType || 'passenger';

  const storeRouteForPassenger = useMutation(api.functions.routes.storeRecentRoutes.storeRouteForPassenger);
  const shouldRunQuery = !!userId;

  const recentRoutes = useQuery(
    api.functions.routes.getRecentRoutes.getPassengerTopRoutes,
    shouldRunQuery ? { passengerId: userId as Id<"taxiTap_users"> } : "skip"
  );

  const [detectedLocation, setDetectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required to find nearby taxis.");
        setIsLoadingCurrentLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setDetectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

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
        name: 'Current Location'
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
        name: 'Current Location'
      });
    }
  }, [detectedLocation, origin]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!detectedLocation && isLoadingCurrentLocation) {
        setIsLoadingCurrentLocation(false);
        Alert.alert(
          'Location Error', 
          'Unable to get your current location. Please enter your address manually.',
          [{ text: 'OK' }]
        );
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [detectedLocation, isLoadingCurrentLocation]);

  const routes = useQuery(api.functions.routes.displayRoutes.displayRoutes);
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);

  const { notifications, markAsRead } = useNotifications();

  const fullRecentRoutes = React.useMemo(() => {
    if (!recentRoutes || !routes) return [];

    return recentRoutes.map(recent => {
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
        routeName: 'Unknown Route',
        destinationLat: null,
        destinationLng: null,
        startName: recent.startName,
        startLat: recent.startLat,
        startLng: recent.startLng,
        isManualRoute: false,
      };
    }).filter(route => route !== null);
  }, [recentRoutes, routes, manualDestinations]);

  const displayRoutes = fullRecentRoutes.filter(
    (r): r is NonNullable<typeof r> => r !== null
  );

  // FIXED: Only clear state on first load, not every focus - this was causing the taxi search issue
  useFocusEffect(
    React.useCallback(() => {
      if (isFirstLoad) {
        // Only clear state on the very first load
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
      // Don't clear state on subsequent focuses - this preserves taxi search results
    }, [isFirstLoad, setRouteLoaded, setOrigin, setDestination, setRouteCoordinates])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Home' });
  }, [navigation]);

  // Geocoding function
  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number; name: string } | null> => {
    if (!GOOGLE_MAPS_API_KEY) {
      Alert.alert('Error', 'Google Maps API key is not configured');
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
      Alert.alert('Error', 'Could not find the address. Please try again.');
      return null;
    }
  };

  // Enhanced function to search for available taxis using the actual enhanced matching
  const searchForAvailableTaxis = async (
    origin: { latitude: number; longitude: number; name: string },
    dest: { latitude: number; longitude: number; name: string }
  ) => {
    if (!userId) {
      return;
    }

    // FIXED: Reset previous search results before starting new search
    setAvailableTaxis([]);
    setRouteMatchResults(null);
    setIsSearchingTaxis(true);
    
    try {
      // Trigger the enhanced taxi search by setting search parameters
      setTaxiSearchParams({
        originLat: origin.latitude,
        originLng: origin.longitude,
        destinationLat: dest.latitude,
        destinationLng: dest.longitude,
      });
      
    } catch (error) {
      setIsSearchingTaxis(false);
      Alert.alert(
        'Search Error', 
        'Unable to find available taxis. Please try again.',
        [{ text: 'OK' }]
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
        
        // Update the snapshot drivers to show available taxis instead of all nearby
        const taxiLocations = taxiSearchResult.availableTaxis.map((taxi: any) => ({
          _id: taxi.driverId,
          latitude: taxi.currentLocation.latitude,
          longitude: taxi.currentLocation.longitude,
          name: taxi.name,
          vehicle: taxi.vehicleModel,
          registration: taxi.vehicleRegistration,
          distance: taxi.distanceToOrigin,
          routeName: taxi.routeInfo.routeName
        }));
      } else {
        setAvailableTaxis([]);
        setRouteMatchResults(taxiSearchResult);
      }
    }
  }, [taxiSearchResult]);

  // Handle origin address submission
  const handleOriginSubmit = async () => {
    if (!originAddress.trim()) return;
    
    setIsGeocodingOrigin(true);
    const result = await geocodeAddress(originAddress);
    setIsGeocodingOrigin(false);

    if (result) {
      setOrigin(result);
      // Animate map to origin
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

  // Updated destination submission with proper routeId generation and user input preservation
  const handleDestinationSubmit = async () => {
    if (!destinationAddress.trim()) return;
    
    setIsGeocodingDestination(true);
    const result = await geocodeAddress(destinationAddress);
    setIsGeocodingDestination(false);

    if (result) {
      const uniqueRouteId = `manual-${result.latitude.toFixed(5)}-${result.longitude.toFixed(5)}`;
      
      // Create destination object with user input as name, not geocoded address
      const destinationWithUserName = {
        ...result,
        name: destinationAddress.trim(), // Use original user input as display name
      };
      
      setDestination(destinationWithUserName);
      setSelectedRouteId(uniqueRouteId);
      
      await storeManualDestination(uniqueRouteId, destinationWithUserName);
    }
  };

  const handleReserveSeat = async () => {
    if (!destination || !origin) {
      Alert.alert('Error', 'Please enter both origin and destination addresses');
      return;
    }

    if (!selectedRouteId) {
      Alert.alert('Error', 'Route not selected');
      return;
    }

    if (availableTaxis.length === 0) {
      Alert.alert(
        'No Taxis Available', 
        'No taxis are currently available on routes that connect your origin and destination. Please try a different route or check again later.',
        [{ text: 'OK' }]
      );
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
      Alert.alert('Route Error', err instanceof Error ? err.message : 'Unknown error');
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
    // Add these new properties for start location
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

    // For manual routes, use the stored name (user input), for predetermined routes use destination
    const displayName = route.routeId.startsWith("manual-") 
      ? route.routeName || route.destination  // routeName contains the user input for manual routes
      : route.destination;

    const dest = {
      latitude: route.destinationCoords.latitude,
      longitude: route.destinationCoords.longitude,
      name: displayName, // This will show user input for manual routes
    };

    // Set destination
    setDestination(dest);
    setDestinationAddress(displayName); // Update the input field with the stored name
    
    // Set origin/start location if available
    if (route.startLat && route.startLng && route.startName) {
      const startLocation = {
        latitude: route.startLat,
        longitude: route.startLng,
        name: route.startName,
      };
      
      setOrigin(startLocation);
      setOriginAddress(route.startName); // Update the origin input field
    } else if (detectedLocation) {
      // Fallback to current location if no start location is stored
      setOrigin({
        latitude: detectedLocation.latitude,
        longitude: detectedLocation.longitude,
        name: 'Current Location'
      });
      setOriginAddress('Current Location');
    }
    
    const routeIdToUse = route.routeId.startsWith("manual-") ? route.routeId : route._id;
    setSelectedRouteId(routeIdToUse);
  };

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, backgroundColor: theme.background
    },
    map: { 
      height: '40%'
    },
    bottomSheet: {
      flex: 1,
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: 16,
      paddingTop: 24,
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
      marginBottom: 36,
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

  // Fix: Improved initial region logic
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
    // Default to Johannesburg coordinates
    return {
      latitude: -26.2041,
      longitude: 28.0473,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  return (
    <View style={dynamicStyles.container}>
      {/* Live Location Streaming Status */}
      <View style={{ padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center' }}>
        {locationStreamError ? (
          <Text style={{ color: 'red' }}>Location Streaming Error: {locationStreamError}</Text>
        ) : streamedLocation ? (
          <Text style={{ color: 'green' }}>Live Location Streaming: {streamedLocation.latitude.toFixed(5)}, {streamedLocation.longitude.toFixed(5)}</Text>
        ) : (
          <Text>Streaming location...</Text>
        )}
      </View>
      {isLoadingCurrentLocation ? (
        <View style={[dynamicStyles.map, { justifyContent: 'center', alignItems: 'center' }]}>
          <Image source={loading} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>Getting your location...</Text>
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

      <View style={dynamicStyles.bottomSheet}>
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
            <TextInput
              style={[dynamicStyles.addressInput, dynamicStyles.originInput]}
              placeholder={origin ? origin.name : "Enter origin address..."}
              value={originAddress}
              onChangeText={setOriginAddress}
              onSubmitEditing={handleOriginSubmit}
              returnKeyType="search"
              placeholderTextColor={isDark ? theme.textSecondary : "#A66400"}
              editable={!isLoadingCurrentLocation}
            />
            {isGeocodingOrigin && (
              <Text style={dynamicStyles.geocodingText}>Finding address...</Text>
            )}
            {isLoadingCurrentLocation && (
              <Text style={dynamicStyles.geocodingText}>Getting current location...</Text>
            )}
            
            <View style={dynamicStyles.locationSeparator} />
            
            <TextInput
              style={[dynamicStyles.addressInput, dynamicStyles.destinationInput]}
              placeholder="Enter destination address..."
              value={destinationAddress}
              onChangeText={setDestinationAddress}
              onSubmitEditing={handleDestinationSubmit}
              returnKeyType="search"
              placeholderTextColor={theme.textSecondary}
            />
            {isGeocodingDestination && (
              <Text style={dynamicStyles.geocodingText}>Finding address...</Text>
            )}
            
            {isLoadingRoute && (
              <Text style={dynamicStyles.routeLoadingText}>
                Loading route...
              </Text>
            )}
            {routeLoaded && !isLoadingRoute && !isSearchingTaxis && (
              <Text style={[dynamicStyles.routeLoadingText, { color: theme.primary }]}>
                Route loaded ✓
              </Text>
            )}
            {isSearchingTaxis && (
              <Text style={dynamicStyles.routeLoadingText}>
                Searching for available taxis...
              </Text>
            )}
          </View>
        </View>

        {/* Journey Status */}
        {routeMatchResults && (
          <View style={dynamicStyles.searchResultsContainer}>
            <Text style={dynamicStyles.searchResultsTitle}>
              Journey Status
            </Text>
            <View style={dynamicStyles.searchResultsCard}>
              <Text style={dynamicStyles.searchResultsText}>
                📍 Available taxis: {routeMatchResults.availableTaxis?.length || 0}
              </Text>
              <Text style={dynamicStyles.searchResultsText}>
                🛣 Matching routes: {routeMatchResults.matchingRoutes?.length || 0}
              </Text>
              {(routeMatchResults.availableTaxis?.length || 0) > 0 && (
                <Text style={[dynamicStyles.searchResultsText, { color: theme.primary }]}>
                  ✅ Ready to book your ride!
                </Text>
              )}
              {(routeMatchResults.availableTaxis?.length || 0) === 0 && (
                <Text style={[dynamicStyles.searchResultsText, { color: theme.textSecondary }]}>
                  ⚠ No taxis available on this route
                </Text>
              )}
            </View>
          </View>
        )}

        <Text style={dynamicStyles.savedRoutesTitle}>Recently Used Taxi Ranks</Text>
        <ScrollView style={{ marginTop: 10 }}>
          {displayRoutes.length > 0 ? (
            displayRoutes.map((route, index) => (
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
                      : route.routeName || 'Saved Route'
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
              No recently used routes yet.
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Reserve a Seat Button */}
      {routeLoaded && !isLoadingRoute && (
        <Animated.View style={{ opacity: buttonOpacity }}>
          <TouchableOpacity style={dynamicStyles.reserveButton} onPress={handleReserveSeat}>
            <Text style={dynamicStyles.reserveButtonText}>
              {isSearchingTaxis 
                ? 'Finding Taxis...' 
                : availableTaxis.length > 0 
                  ? `Reserve a Seat (${availableTaxis.length} taxis available)`
                  : 'Reserve a Seat'
              }
            </Text>
            {isSearchingTaxis && (
              <Text style={dynamicStyles.reserveButtonSubtext}>
                Searching for available drivers...
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
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