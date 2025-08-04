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
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
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

  // NEW: Add state to track if user just selected a suggestion
  const [justSelectedOrigin, setJustSelectedOrigin] = useState(false);
  const [justSelectedDestination, setJustSelectedDestination] = useState(false);

  // NEW: Input focus states
  const [originFocused, setOriginFocused] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);

  // NEW: Keyboard handling states
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // NEW: Autocomplete states
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [isLoadingOriginSuggestions, setIsLoadingOriginSuggestions] = useState(false);
  const [isLoadingDestinationSuggestions, setIsLoadingDestinationSuggestions] = useState(false);

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

  // FIXED: Add state to track if this is the first load to prevent unnecessary state clearing
  const [isFirstLoad, setIsFirstLoad] = useState(true);

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

  const [manualDestination, setManualDestination] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('lastManualDestination').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed?.latitude && parsed?.longitude && parsed?.name) {
            setManualDestination(parsed);
          }
        } catch (err) {
          console.warn("Failed to parse manual destination", err);
        }
      }
    });
  }, []);

  const fullRecentRoutes = React.useMemo(() => {
    if (!recentRoutes || !routes) return [];

    return recentRoutes.map(recent => {
      if (recent.routeId === "manual-route") {
        return {
          ...recent,
          _id: recent._id,
          routeName: manualDestination?.name
            ? `Manual: ${manualDestination.name}`
            : "Manual Destination",
          destinationLat: manualDestination?.latitude ?? null,
          destinationLng: manualDestination?.longitude ?? null,
        };
      }

      const fullRoute = routes.find(r => r.routeId === recent.routeId);
      if (fullRoute && fullRoute.destinationCoords) {
        return {
          ...recent,
          _id: fullRoute._id,
          routeName: `${fullRoute.start} → ${fullRoute.destination}`,
          destinationLat: fullRoute.destinationCoords.latitude,
          destinationLng: fullRoute.destinationCoords.longitude,
        };
      }

      return {
        ...recent,
        routeName: 'Unknown Route',
        destinationLat: null,
        destinationLng: null,
      };
    }).filter(r => r !== null);
  }, [recentRoutes, routes, destination, manualDestination]);

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
      
      // Add components to bias results to South Africa (you can adjust this)
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
      Alert.alert('Error', 'Google Maps API key is not configured');
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
      Alert.alert('Error', 'Could not get place details. Please try again.');
      return null;
    }
  };

  // NEW: Debounced autocomplete for origin
  useEffect(() => {
    // Don't fetch suggestions if user just selected one
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
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [originAddress, detectedLocation, justSelectedOrigin]);

  // NEW: Debounced autocomplete for destination
  useEffect(() => {
    // Don't fetch suggestions if user just selected one
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
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [destinationAddress, detectedLocation, justSelectedDestination]);

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

  // NEW: Handle origin suggestion selection
  const handleOriginSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    // Mark that user just selected a suggestion
    setJustSelectedOrigin(true);
    
    // Clear suggestions immediately and prevent them from coming back
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
    
    setOriginAddress(suggestion.description);
    setIsGeocodingOrigin(true);

    const placeDetails = await getPlaceDetails(suggestion.place_id);
    setIsGeocodingOrigin(false);

    if (placeDetails) {
      setOrigin(placeDetails);
      // Animate map to origin
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
    // Mark that user just selected a suggestion
    setJustSelectedDestination(true);
    
    // Clear suggestions immediately and prevent them from coming back
    setShowDestinationSuggestions(false);
    setDestinationSuggestions([]);
    
    setDestinationAddress(suggestion.description);
    setIsGeocodingDestination(true);

    const placeDetails = await getPlaceDetails(suggestion.place_id);
    setIsGeocodingDestination(false);

    if (placeDetails) {
      setDestination(placeDetails);
      setSelectedRouteId('manual-route');
      
      await AsyncStorage.setItem(
        'lastManualDestination',
        JSON.stringify({
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          name: placeDetails.name,
        })
      );
    }
  };

  // MODIFIED: Enhanced geocoding function (fallback for manual entry)
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

  // Handle origin address submission (for manual entry when not using suggestions)
  const handleOriginSubmit = async () => {
    if (!originAddress.trim()) return;
    
    // Hide suggestions and clear them
    setShowOriginSuggestions(false);
    setOriginSuggestions([]);
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

  // Handle destination address submission (for manual entry when not using suggestions)
  const handleDestinationSubmit = async () => {
    if (!destinationAddress.trim()) return;
    
    // Hide suggestions and clear them
    setShowDestinationSuggestions(false);
    setDestinationSuggestions([]);
    setIsGeocodingDestination(true);
    
    const result = await geocodeAddress(destinationAddress);
    setIsGeocodingDestination(false);

    if (result) {
      setDestination(result);
      setSelectedRouteId('manual-route');
      
      await AsyncStorage.setItem(
        'lastManualDestination',
        JSON.stringify({
          latitude: result.latitude,
          longitude: result.longitude,
          name: result.name,
        })
      );
    }
  };

  const uniqueManualRouteId = destination
    ? `manual-${destination.latitude.toFixed(5)}-${destination.longitude.toFixed(5)}`
    : 'manual-route';

  const handleReserveSeat = async () => {
    if (!destination || !origin) {
      Alert.alert('Error', 'Please enter both origin and destination addresses');
      return;
    }

    if (!selectedRouteId) {
      Alert.alert('Error', 'Route not selected');
      return;
    }

    // Check if we have available taxis
    if (availableTaxis.length === 0) {
      Alert.alert(
        'No Taxis Available', 
        'No taxis are currently available on routes that connect your origin and destination. Please try a different route or check again later.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!routes || !selectedRouteId) return;

    try {
      await storeRouteForPassenger({
        passengerId: userId as Id<"taxiTap_users">,
        routeId: uniqueManualRouteId,
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
        // Pass the available taxis data
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

  // Auto-route loading effect
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
    // FIXED: Reset search state when starting new route
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
  }) => {
    if (
      !route.destinationCoords || 
      typeof route.destinationCoords.latitude !== 'number' ||
      typeof route.destinationCoords.longitude !== 'number' ||
      !origin || 
      !userId || 
      !route.routeId
    ) return;

    const dest = {
      latitude: route.destinationCoords.latitude,
      longitude: route.destinationCoords.longitude,
      name: route.destination,
    };

    setDestination(dest);
    setDestinationAddress(route.destination);
    setSelectedRouteId(route._id);
    // Hide suggestions when selecting from saved routes
    setShowDestinationSuggestions(false);

    try {
      await storeRouteForPassenger({
        passengerId: userId as Id<"taxiTap_users">,
        routeId: uniqueManualRouteId,
      });
    } catch (error) {
      console.error("Failed to store route:", error);
    }
  };

  // NEW: Render suggestion item
  const renderSuggestionItem = ({ item, onPress, index, isLast }: { 
    item: PlaceSuggestion; 
    onPress: () => void; 
    index: number; 
    isLast: boolean; 
  }) => (
    <TouchableOpacity 
      style={[dynamicStyles.suggestionItem, isLast && dynamicStyles.suggestionItemLast]} 
      onPress={onPress}
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
  );

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, backgroundColor: theme.background
    },
    map: { 
      height: keyboardVisible ? '25%' : '40%'
    },
    bottomSheet: {
      flex: 1,
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: keyboardVisible ? Math.max(keyboardHeight - 100, 16) : 16,
    },
    locationBox: {
      backgroundColor: isDark ? theme.card : "#FFF3E0",
      borderRadius: 24,
      marginBottom: keyboardVisible ? 8 : 16,
      width: '100%',
      alignSelf: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    locationIndicator: {
      paddingLeft: 14,
      paddingRight: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    currentLocationCircle: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: isDark ? theme.primary : "#FF9800",
      borderWidth: 2,
      borderColor: isDark ? '#FFB84D' : '#FFB74D',
      marginBottom: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    currentLocationDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#FFFFFF',
    },
    dottedLineContainer: {
      height: 20,
      width: 1,
      marginBottom: 6,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dottedLineDot: {
      width: 1,
      height: 2,
      backgroundColor: isDark ? theme.primary : "#FF9800",
      borderRadius: 0.5,
      opacity: 0.6,
    },
    destinationIcon: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#FF6B35',
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputSection: {
      flex: 1,
      paddingRight: 14,
      paddingVertical: 8,
    },
    inputContainer: {
      marginBottom: 6,
      position: 'relative',
    },
    inputLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: isDark ? theme.textSecondary : "#BF6000",
      marginBottom: 3,
      marginLeft: 2,
      textTransform: 'capitalize',
    },
    addressInput: {
      fontSize: 14,
      fontWeight: '400',
      color: theme.text,
      backgroundColor: 'transparent',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderWidth: 0,
      minHeight: 32,
    },
    addressInputFocused: {
      backgroundColor: isDark ? theme.surface : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? theme.primary : '#FF9800',
      shadowColor: isDark ? theme.primary : '#FF9800',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
      elevation: 1,
    },
    inputSeparator: {
      height: 0.5,
      backgroundColor: isDark ? theme.border : '#E8E8E8',
      marginVertical: 1,
      marginHorizontal: 8,
      opacity: 0.5,
    },
    geocodingText: {
      color: theme.textSecondary,
      fontSize: 10,
      fontStyle: 'italic',
      marginTop: 3,
      marginLeft: 2,
    },
    // NEW: Autocomplete suggestion styles
    inputSuggestionsContainer: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      borderRadius: 8,
      maxHeight: 180,
      zIndex: 1000,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.4 : 0.12,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
      marginTop: 2,
    },
    suggestionScrollView: {
      maxHeight: 180,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : '#F0F0F0',
      minHeight: 56, // Material Design touch target
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
    loadingSuggestions: {
      padding: 20,
      alignItems: 'center',
    },
    loadingSuggestionsText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontStyle: 'italic',
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
      fontSize: 12,
      color: theme.textSecondary,
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
    <KeyboardAvoidingView 
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
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

      <ScrollView 
        style={dynamicStyles.bottomSheet}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ 
          paddingBottom: keyboardVisible ? 20 : 100,
          flexGrow: 1 
        }}
      >
        {/* ENHANCED: Beautiful location input box */}
        <View style={{ position: 'relative', zIndex: 10 }}>
          <View style={dynamicStyles.locationBox}>
            <View style={{ flexDirection: 'row' }}>
              <View style={dynamicStyles.locationIndicator}>
                <View style={dynamicStyles.currentLocationCircle}>
                  <View style={dynamicStyles.currentLocationDot} />
                </View>
                <View style={dynamicStyles.dottedLineContainer}>
                  {[...Array(6)].map((_, i) => (
                    <View key={i} style={dynamicStyles.dottedLineDot} />
                  ))}
                </View>
                <View style={dynamicStyles.destinationIcon}>
                  <Icon name="location" size={8} color="#FFFFFF" />
                </View>
              </View>
              
              <View style={dynamicStyles.inputSection}>
                {/* Origin Input */}
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>From</Text>
                  <TextInput
                    style={[
                      dynamicStyles.addressInput,
                      originFocused && dynamicStyles.addressInputFocused
                    ]}
                    placeholder={origin ? origin.name : "Enter pickup location..."}
                    value={originAddress}
                    onChangeText={(text) => {
                      setOriginAddress(text);
                      setJustSelectedOrigin(false); // Reset when user types
                    }}
                    onSubmitEditing={handleOriginSubmit}
                    onFocus={() => {
                      setOriginFocused(true);
                      setJustSelectedOrigin(false); // Reset when user starts typing again
                      if (originSuggestions.length > 0) {
                        setShowOriginSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setOriginFocused(false);
                      // Longer delay to allow suggestion selection, then clear everything
                      setTimeout(() => {
                        setShowOriginSuggestions(false);
                        if (originSuggestions.length > 0) {
                          setOriginSuggestions([]);
                        }
                      }, 300);
                    }}
                    returnKeyType="search"
                    placeholderTextColor={theme.textSecondary}
                    editable={!isLoadingCurrentLocation}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  {isGeocodingOrigin && (
                    <Text style={dynamicStyles.geocodingText}>Finding address...</Text>
                  )}
                  {isLoadingOriginSuggestions && (
                    <Text style={dynamicStyles.geocodingText}>Loading suggestions...</Text>
                  )}
                  {isLoadingCurrentLocation && (
                    <Text style={dynamicStyles.geocodingText}>Getting current location...</Text>
                  )}

                  {/* Origin suggestions positioned relative to this input */}
                  {showOriginSuggestions && originSuggestions.length > 0 && (
                    <View style={dynamicStyles.inputSuggestionsContainer}>
                      <ScrollView 
                        style={dynamicStyles.suggestionScrollView}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="always"
                        nestedScrollEnabled={true}
                        bounces={false}
                        contentContainerStyle={{ flexGrow: 1 }}
                      >
                        {originSuggestions.map((item, index) => (
                          <TouchableOpacity 
                            key={item.place_id}
                            style={[
                              dynamicStyles.suggestionItem, 
                              index === originSuggestions.length - 1 && dynamicStyles.suggestionItemLast
                            ]} 
                            onPress={() => handleOriginSuggestionSelect(item)}
                            activeOpacity={0.6}
                          >
                            <View style={dynamicStyles.suggestionIcon}>
                              <Icon name="location-outline" size={12} color={isDark ? theme.primary : "#FF9800"} />
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

                <View style={dynamicStyles.inputSeparator} />

                {/* Destination Input */}
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>To</Text>
                  <TextInput
                    style={[
                      dynamicStyles.addressInput,
                      destinationFocused && dynamicStyles.addressInputFocused
                    ]}
                    placeholder="Enter destination..."
                    value={destinationAddress}
                    onChangeText={(text) => {
                      setDestinationAddress(text);
                      setJustSelectedDestination(false); // Reset when user types
                    }}
                    onSubmitEditing={handleDestinationSubmit}
                    onFocus={() => {
                      setDestinationFocused(true);
                      setJustSelectedDestination(false); // Reset when user starts typing again
                      if (destinationSuggestions.length > 0) {
                        setShowDestinationSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setDestinationFocused(false);
                      // Longer delay to allow suggestion selection, then clear everything
                      setTimeout(() => {
                        setShowDestinationSuggestions(false);
                        if (destinationSuggestions.length > 0) {
                          setDestinationSuggestions([]);
                        }
                      }, 300);
                    }}
                    returnKeyType="search"
                    placeholderTextColor={theme.textSecondary}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  {isGeocodingDestination && (
                    <Text style={dynamicStyles.geocodingText}>Finding address...</Text>
                  )}
                  {isLoadingDestinationSuggestions && (
                    <Text style={dynamicStyles.geocodingText}>Loading suggestions...</Text>
                  )}
                  
                  {isLoadingRoute && (
                    <Text style={[dynamicStyles.geocodingText, { color: theme.primary }]}>
                      Loading route...
                    </Text>
                  )}
                  {routeLoaded && !isLoadingRoute && !isSearchingTaxis && (
                    <Text style={[dynamicStyles.geocodingText, { color: theme.primary }]}>
                      Route loaded ✓
                    </Text>
                  )}
                  {isSearchingTaxis && (
                    <Text style={[dynamicStyles.geocodingText, { color: theme.primary }]}>
                      Searching for available taxis...
                    </Text>
                  )}

                  {/* Destination suggestions positioned relative to this input */}
                  {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                    <View style={dynamicStyles.inputSuggestionsContainer}>
                      <ScrollView 
                        style={dynamicStyles.suggestionScrollView}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="always"
                        nestedScrollEnabled={true}
                        bounces={false}
                        contentContainerStyle={{ flexGrow: 1 }}
                      >
                        {destinationSuggestions.map((item, index) => (
                          <TouchableOpacity 
                            key={item.place_id}
                            style={[
                              dynamicStyles.suggestionItem, 
                              index === destinationSuggestions.length - 1 && dynamicStyles.suggestionItemLast
                            ]} 
                            onPress={() => handleDestinationSuggestionSelect(item)}
                            activeOpacity={0.6}
                          >
                            <View style={dynamicStyles.suggestionIcon}>
                              <Icon name="location-outline" size={12} color={isDark ? theme.primary : "#FF9800"} />
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
          </View>
        </View>

        {/* Journey Status */}
        {routeMatchResults && !keyboardVisible && (
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

        {!keyboardVisible && (
          <>
            <Text style={dynamicStyles.savedRoutesTitle}>Recently Used Taxi Ranks</Text>
            <View style={{ marginTop: 10 }}>
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
                        {route.routeName || 'Saved Route'}
                      </Text>
                      <Text style={dynamicStyles.routeSubtitle}>
                        Used {route.usageCount} times
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ textAlign: 'center', marginTop: 8, color: theme.textSecondary }}>
                  No recently used routes yet.
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