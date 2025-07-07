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
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '../../contexts/UserContext';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../../contexts/NotificationContext';
import * as Location from "expo-location";
import { useThrottledLocationStreaming } from '../hooks/useLocationStreaming';

const GOOGLE_MAPS_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

export default function HomeScreen() {
  const { user } = useUser();
  const { userId: navId } = useLocalSearchParams<{ userId?: string }>();
  const userId = user?.id || navId || '';
  const role = user?.role || user?.accountType || 'passenger';

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
    destination,
    routeCoordinates,
    isLoadingRoute,
    routeLoaded,
    setCurrentLocation,
    setDestination,
    setRouteCoordinates,
    setIsLoadingRoute,
    setRouteLoaded,
    getCachedRoute,
    setCachedRoute,
  } = useMapContext();

  // Integrate live location streaming
  const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(userId, role, true);

  //This has our functionality but used Ati's variable, so we will change this
  useEffect(() => {
    if (detectedLocation  && (!currentLocation || currentLocation.name === '')) {
      setCurrentLocation({
        latitude: detectedLocation .latitude,
        longitude: detectedLocation .longitude,
        name: 'Current Location'
      });
      setIsLoadingCurrentLocation(false);
    } else {
    }
  }, [detectedLocation , currentLocation]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!detectedLocation  && isLoadingCurrentLocation) {
        setIsLoadingCurrentLocation(false);
        Alert.alert(
          'Location Error', 
          'Unable to get your current location. Please enter your address manually.',
          [{ text: 'OK' }]
        );
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [detectedLocation , isLoadingCurrentLocation]);

  const routes = useQuery(api.functions.routes.displayRoutes.displayRoutes);
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);

  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView | null>(null);

  const { notifications, markAsRead } = useNotifications();

  useFocusEffect(
    React.useCallback(() => {
      setRouteLoaded(false);
      setDestination(null);
      setRouteCoordinates([]);
      setSelectedRouteId(null);
      setDestinationAddress('');
      setAvailableTaxis([]);
      setRouteMatchResults(null);
      setIsSearchingTaxis(false);
    }, [setRouteLoaded, setDestination, setRouteCoordinates])
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
      setCurrentLocation(result);
      // If we have both origin and destination, get route
      if (destination) {
        getRoute(result, destination);
      }
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

  // Handle destination address submission
  const handleDestinationSubmit = async () => {
    if (!destinationAddress.trim()) return;
    
    setIsGeocodingDestination(true);
    const result = await geocodeAddress(destinationAddress);
    setIsGeocodingDestination(false);

    if (result) {
      setDestination(result);
      setSelectedRouteId('manual-route'); // Set a manual route ID
      // If we have both origin and destination, get route
      if (currentLocation) {
        getRoute(currentLocation, result);
      }
    }
  };

  const handleReserveSeat = () => {
    if (!destination || !currentLocation) {
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

    router.push({
      pathname: './TaxiInformation',
      params: {
        destinationName: destination.name,
        destinationLat: destination.latitude.toString(),
        destinationLng: destination.longitude.toString(),
        currentName: currentLocation.name,
        currentLat: currentLocation.latitude.toString(),
        currentLng: currentLocation.longitude.toString(),
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

  const getRoute = async (
    origin: { latitude: number; longitude: number; name: string },
    dest: { latitude: number; longitude: number; name: string }
  ) => {
    if (!GOOGLE_MAPS_API_KEY) {
      return;
    }

    const cacheKey = createRouteKey(
      { ...origin, name: '' },
      { ...dest, name: '' }
    );

    const cached = getCachedRoute(cacheKey);
    if (cached) {
      setRouteCoordinates(cached);
      setRouteLoaded(true);
      // Also search for available taxis when route is loaded from cache
      searchForAvailableTaxis(origin, dest);
      return;
    }

    setIsLoadingRoute(true);
    setRouteLoaded(false);

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'OK') throw new Error(data.error_message || data.status);

      const points = decodePolyline(data.routes[0].overview_polyline.points);
      setCachedRoute(cacheKey, points);
      setRouteCoordinates(points);

      mapRef.current?.fitToCoordinates([origin, dest, ...points], {
        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
      setRouteLoaded(true);
      
      // Search for available taxis on matching routes
      searchForAvailableTaxis(origin, dest);
      
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

  const handleDestinationSelect = (route: {
    routeId: string;
    destination: string;
    destinationCoords: { latitude: number; longitude: number } | null;
  }) => {
    if (!route.destinationCoords || !currentLocation) return;
    const dest = {
      latitude: route.destinationCoords.latitude,
      longitude: route.destinationCoords.longitude,
      name: route.destination,
    };
    setDestination(dest);
    setDestinationAddress(route.destination); // Update the input field
    setSelectedRouteId(route.routeId);
    getRoute(currentLocation, dest);
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
    routeSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
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

  useEffect(() => {
    const rideAccepted = notifications.find(
      (n: any) => n.type === "ride_accepted" && !n.isRead
    );
    if (rideAccepted) {
      Alert.alert(
        "Ride Accepted",
        rideAccepted.message,
        [
          {
            text: "OK",
            onPress: () => {
              markAsRead(rideAccepted._id);
              router.push({
                pathname: './PassengerReservation',
                params: currentLocation && destination ? {
                  currentLat: currentLocation.latitude.toString(),
                  currentLng: currentLocation.longitude.toString(),
                  currentName: currentLocation.name,
                  destinationLat: destination.latitude.toString(),
                  destinationLng: destination.longitude.toString(),
                  destinationName: destination.name,
                } : undefined
              });
            },
            style: "default"
          }
        ],
        { cancelable: false }
      );
    }

    const rideCancelled = notifications.find(
      (n: any) => n.type === "ride_cancelled" && !n.isRead
    );
    if (rideCancelled) {
      Alert.alert(
        "Ride Cancelled",
        rideCancelled.message,
        [
          {
            text: "OK",
            onPress: () => markAsRead(rideCancelled._id),
            style: "default"
          }
        ],
        { cancelable: false }
      );
   }
  }, [notifications, markAsRead, currentLocation, destination]);

  useEffect(() => {
    const rideDeclined = notifications.find(
      n => n.type === 'ride_declined' && !n.isRead
    );
    if (rideDeclined) {
      Alert.alert(
        'Ride Declined',
        rideDeclined.message || 'Your ride request was declined.',
        [
          {
            text: 'OK',
            onPress: () => {
              markAsRead(rideDeclined._id);
              // Optionally, navigate somewhere if needed
            },
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    }
  }, [notifications, markAsRead]);

  // Fix: Improved initial region logic
  const getInitialRegion = () => {
    if (detectedLocation ) {
      return {
        latitude: detectedLocation .latitude,
        longitude: detectedLocation .longitude,
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
          {currentLocation && (
            <Marker coordinate={currentLocation} title="Origin" pinColor="blue" />
          )}

          {destination && (
            <Marker coordinate={destination} title={destination.name} pinColor="orange" />
          )}
          
          {(availableTaxis.length > 0 ? availableTaxis : nearbyDrivers || []).map((driver) => (
            <Marker
              key={driver._id}
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
              placeholder={currentLocation ? currentLocation.name : "Enter origin address..."}
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
          {routes?.map((route: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={dynamicStyles.routeCard}
              onPress={() => handleDestinationSelect(route)}
            >
              <Icon
                name="location-sharp"
                size={20}
                color={theme.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.routeTitle}>{route.destination}</Text>
                <Text style={dynamicStyles.routeSubtitle}>Pickup: {route.start}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
