import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { useThrottledLocationStreaming } from './hooks/useLocationStreaming';
import { useProximityTimer } from './hooks/useProximityTimer';

// Get platform-specific API key
const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios' 
  ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
  : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

interface DriverOnlineProps {
  onGoOffline: () => void;
  todaysEarnings: number;
  currentRoute?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
}

interface MenuItem {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface SafetyOption {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

export default function DriverOnline({ 
  onGoOffline, 
  todaysEarnings,
  currentRoute = "Not Set",
}: DriverOnlineProps) {
  const { width, height } = Dimensions.get('window');

  const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);
  
  const navigation = useNavigation();
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const role: "passenger" | "driver" | "both" = (user?.role as "passenger" | "driver" | "both") || (user?.accountType as "passenger" | "driver" | "both") || 'driver';
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const { notifications, markAsRead } = useNotifications();
  
  // Enhanced location streaming with backend updates
  const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(userId || '', role, true);
  
  // Proximity timer for periodic checks
  useProximityTimer(true);
  
  // Route display state
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [routeStops, setRouteStops] = useState<{id: string, name: string, coordinates: number[], order: number}[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [passengerLocations, setPassengerLocations] = useState<{latitude: number, longitude: number, name: string}[]>([]);

  const taxiInfo = useQuery(
    api.functions.taxis.getTaxiForDriver.getTaxiForDriver,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  // Get driver's assigned route
  // Integrate here: Get driver's assigned route from backend
  // const driverRoute = useQuery(
  //   api.functions.routes.queries.getDriverAssignedRoute,
  //   user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  // );

  // Mock route data for testing
  const driverRoute = {
    geometry: {
      type: "LineString",
      coordinates: [
        [28.4209142, -25.7038163],
        [28.4300000, -25.7100000],
        [28.4400000, -25.7200000],
        [28.4500000, -25.7300000]
      ]
    },
    stops: [
      {
        id: "stop_1",
        name: "Springbok BP Garage",
        coordinates: [-25.7038163, 28.4209142],
        order: 1
      },
      {
        id: "stop_2",
        name: "Paarl Station and load",
        coordinates: [-25.7200000, 28.4400000],
        order: 2
      }
    ]
  };

  // Debug log for driver route
  useEffect(() => {
    console.log('Driver route query result:', driverRoute);
  }, [driverRoute]);

  const acceptRide = useMutation(api.functions.rides.acceptRide.acceptRide);
  const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
  const declineRide = useMutation(api.functions.rides.declineRide.declineRide);

  // Location update interval for sending location to backend
  useEffect(() => {
    if (!user?.id || !streamedLocation) return;

    const updateLocationInterval = setInterval(async () => {
      try {
        // Integrate here: Call backend updateUserLocation mutation
        // await updateUserLocation({
        //   userId: user.id,
        //   latitude: streamedLocation.latitude,
        //   longitude: streamedLocation.longitude,
        //   role: user.role || 'driver'
        // });
        console.log('Driver location update sent:', streamedLocation);
      } catch (error) {
        console.log('Error updating driver location:', error);
      }
    }, 10000); // Update every 10 seconds for drivers (more frequent)

    return () => clearInterval(updateLocationInterval);
  }, [user?.id, streamedLocation]);

  // Check for passengers at their stops
  useEffect(() => {
    if (!streamedLocation || !routeStops || routeStops.length === 0) return;

    const checkPassengersAtStops = async () => {
      // Integrate here: Query passengers in current rides and check their locations
      // This would check if any passengers are within ~100m of their destination stops
      console.log('Checking if passengers are at their stops...');
      
      // Mock passenger at stop detection
      routeStops.forEach(stop => {
        const [stopLat, stopLon] = stop.coordinates;
        const distanceToStop = calculateDistance(
          streamedLocation.latitude,
          streamedLocation.longitude,
          stopLat,
          stopLon
        );
        
        if (distanceToStop < 0.1) { // Within 100m
          console.log(`Passenger appears to be at stop: ${stop.name}`);
          // Integrate here: Send notification to driver that passenger is at stop
        }
      });
    };

    const passengerCheckInterval = setInterval(checkPassengersAtStops, 30000); // Check every 30 seconds
    return () => clearInterval(passengerCheckInterval);
  }, [streamedLocation, routeStops]);

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Load and display route from backend
  useEffect(() => {
    console.log('Route loading effect triggered:', { driverRoute, isLoadingRoute, routeLoaded });
    
    if (!driverRoute || isLoadingRoute || routeLoaded) return;

    const loadDriverRoute = async () => {
      setIsLoadingRoute(true);
      console.log('Loading driver route:', driverRoute);
      
      try {
        // Check if route has geometry data
        if (driverRoute.geometry && driverRoute.geometry.coordinates) {
          console.log('Route geometry found:', driverRoute.geometry);
          // Convert GeoJSON LineString to polyline coordinates
          const coordinates = driverRoute.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          
          console.log('Converted coordinates:', coordinates);
          setRouteCoordinates(coordinates);
          
          const stops = driverRoute.stops || [];
          console.log('Route stops found:', stops);
          setRouteStops(stops);
          setRouteLoaded(true);
          
          // Fit map to show route
          if (mapRef.current && coordinates.length > 0) {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
              animated: true,
            });
          }
        } else {
          console.warn('Route geometry not available:', driverRoute);
        }
      } catch (error) {
        console.error('Error loading driver route:', error);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    loadDriverRoute();
  }, [driverRoute, isLoadingRoute, routeLoaded]);

  // Get current location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });

        const { latitude, longitude } = location.coords;
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        const placeName = `${place.name || ''} ${place.street || ''}, ${place.city || place.region || ''}`.trim();

        const currentLoc: LocationData = {
          latitude,
          longitude,
          name: placeName || 'Unknown Location',
        };

        setCurrentLocation(currentLoc);

        // Only animate to region if route is not loaded yet
        if (!routeLoaded && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getCurrentLocation();
  }, [routeLoaded]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  });

  useEffect(() => {
    if (typeof onGoOffline !== 'function') {
      router.replace('/DriverHomeScreen');
    }
  }, [onGoOffline, router]);

  // Handle ride request notifications
  useEffect(() => {
    if (!user) {
      return;
    }
    const rideRequest = notifications.find(
      n => n.type === "ride_request" && !n.isRead
    );
    if (rideRequest) {
      Alert.alert(
        "New Ride Request",
        rideRequest.message,
        [
          {
            text: "Decline",
            onPress: async () => {
              try {
                await declineRide({ rideId: rideRequest.metadata.rideId, driverId: user.id as Id<"taxiTap_users">, });
                markAsRead(rideRequest._id);
              } catch (error) {
                console.error(error);
                Alert.alert("Error", "Failed to decline ride or update seats.");
              }
              markAsRead(rideRequest._id);
            },
            style: "destructive"
          },
          {
            text: "Accept",
            onPress: async () => {
              try {
                await acceptRide({ rideId: rideRequest.metadata.rideId, driverId: user.id as Id<"taxiTap_users">, });
                await updateTaxiSeatAvailability({ rideId: rideRequest.metadata.rideId, action: "decrease" });
                markAsRead(rideRequest._id);
              } catch (error) {
                console.error(error);
                Alert.alert("Error", "Failed to accept ride or update seats.");
              }
              markAsRead(rideRequest._id);
            },
            style: "default"
          }
        ],
        { cancelable: false }
      );
    }
  }, [notifications, user, declineRide, markAsRead, acceptRide, updateTaxiSeatAvailability]);

  // Handle passenger at stop notifications
  useEffect(() => {
    const passengerAtStop = notifications.find(
      n => n.type === 'passenger_at_stop' && !n.isRead
    );
    if (passengerAtStop) {
      Alert.alert(
        'Passenger at Stop',
        passengerAtStop.message,
        [
          {
            text: 'OK',
            onPress: () => markAsRead(passengerAtStop._id),
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    }
  }, [notifications, markAsRead]);

  useEffect(() => {
    const rideCancelled = notifications.find(
      n => n.type === 'ride_cancelled' && !n.isRead
    );
    if (rideCancelled) {
      Alert.alert(
        'Ride Cancelled',
        rideCancelled.message,
        [
          {
            text: 'OK',
            onPress: () => markAsRead(rideCancelled._id),
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    }
  }, [notifications, markAsRead]);

  useEffect(() => {
    // Handle ride started notifications
    const rideStarted = notifications.find(
      n => n.type === 'ride_started' && !n.isRead
    );
    if (rideStarted) {
      Alert.alert(
        'Ride Started',
        rideStarted.message,
        [
          {
            text: 'OK',
            onPress: () => markAsRead(rideStarted._id),
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    }

    // Handle passenger at stop notifications
    const passengerAtStop = notifications.find(
      n => n.type === 'passenger_at_stop' && !n.isRead
    );
    if (passengerAtStop) {
      Alert.alert(
        'Passenger Update',
        passengerAtStop.message,
        [
          {
            text: 'OK',
            onPress: () => markAsRead(passengerAtStop._id),
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    }
  }, [notifications, markAsRead]);

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleSafetyPress = () => {
    setShowSafetyMenu(!showSafetyMenu);
  };

  const handleToggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const handleEmergency = () => {
    Alert.alert(
      "Emergency Alert",
      "This will contact emergency services (112)",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Get Help", 
          style: "destructive", 
          onPress: () => {
            Alert.alert("Emergency Alert Sent", "Emergency services contacted.");
            setShowSafetyMenu(false);
          }
        }
      ]
    );
  };

  const menuItems: MenuItem[] = [
    { 
      icon: "person-outline", 
      title: "My Profile", 
      subtitle: "Driver details & documents",
      onPress: () => {
        setShowMenu(false);
        router.push('/DriverProfile');
      }
    },
    { 
      icon: "car-outline", 
      title: "My Taxi & Route", 
      subtitle: "Vehicle info & route settings",
      onPress: () => {
        setShowMenu(false);
        router.push('/DriverRequestPage');
      }
    },
    { 
      icon: "time-outline", 
      title: "Trip History", 
      subtitle: "Past rides & routes",
      onPress: () => {
        setShowMenu(false);
        router.push('/EarningsPage');
      }
    },
    { 
      icon: "settings-outline", 
      title: "Toggle Theme", 
      subtitle: "Switch between light and dark mode",
      onPress: () => {
        setShowMenu(false);
        handleToggleTheme();
      }
    },
    { 
      icon: "settings-outline", 
      title: "Help", 
      subtitle: "App information",
      onPress: () => navigation.navigate('HelpPage' as never)
    },
  ];

  const safetyOptions: SafetyOption[] = [
    {
      icon: "call",
      title: "Emergency Call",
      subtitle: "Call 112 immediately",
      color: "#FF4444",
      onPress: handleEmergency
    },
  ];

  // Get route status text
  const getRouteStatusText = () => {
    if (isLoadingRoute) return 'Loading route...';
    if (routeLoaded && routeCoordinates.length > 0) {
      return `Route loaded: ${routeStops.length} stops`;
    }
    if (driverRoute) return 'Processing route data...';
    return 'No route assigned';
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
    },
    mapContainer: {
      flex: 1,
      position: 'relative',
    },
    map: {
      width: width,
      height: height,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      marginTop: 16,
    },
    locationStreamingStatus: {
      position: 'absolute',
      top: 120,
      left: 20,
      right: 20,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 4,
      zIndex: 998,
    },
    locationStreamingText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    locationStreamingSuccess: {
      color: '#4CAF50',
    },
    locationStreamingError: {
      color: '#F44336',
    },
    locationStreamingLoading: {
      color: theme.textSecondary,
    },
    routeStatusOverlay: {
      position: 'absolute',
      top: 170,
      left: 20,
      right: 20,
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 4,
      zIndex: 997,
    },
    routeStatusText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.primary,
    },
    menuButton: {
      position: 'absolute',
      top: 60,
      left: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
      zIndex: 1000,
    },
    darkModeToggle: {
      position: 'absolute',
      top: 60,
      right: 20,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    earningsContainer: {
      position: 'absolute',
      top: 60,
      left: 80,
      right: 80,
      alignItems: 'center',
      zIndex: 999,
    },
    earningsCard: {
      backgroundColor: theme.surface,
      borderRadius: 30,
      padding: 20,
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      minWidth: 200,
    },
    earningsAmount: {
      color: theme.primary,
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 4,
    },
    earningsTitle: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: "bold",
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 20,
      paddingVertical: 20,
      paddingBottom: 40,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: -4 },
      shadowRadius: 4,
      elevation: 8,
    },
    quickStatus: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    quickStatusItem: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    quickStatusValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 4,
    },
    quickStatusLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
      textAlign: 'center',
    },
    offlineButton: {
      width: '100%',
      height: 56,
      borderRadius: 30,
      backgroundColor: '#FF4444',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
      flexDirection: 'row',
    },
    offlineButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginLeft: 8,
    },
    safetyButton: {
      position: 'absolute',
      bottom: 200,
      left: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#FF4444',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 8,
      zIndex: 1000,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    menuModal: {
      marginTop: 120,
      marginLeft: 20,
      backgroundColor: theme.surface,
      borderRadius: 20,
      paddingVertical: 8,
      minWidth: 280,
      maxWidth: '90%',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 12,
    },
    menuModalHeader: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuModalHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    menuModalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 60,
    },
    menuModalItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    menuModalItemContent: {
      flex: 1,
    },
    menuModalItemTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 2,
    },
    menuModalItemSubtitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    safetyModal: {
      position: 'absolute',
      bottom: 270,
      left: 20,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 8,
      minWidth: 200,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 8,
    },
    safetyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 50,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    safetyItemLast: {
      borderBottomWidth: 0,
    },
    safetyItemIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    safetyItemContent: {
      flex: 1,
    },
    safetyItemTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 2,
    },
    safetyItemSubtitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.mapContainer}>
          {!currentLocation ? (
            <View style={dynamicStyles.loadingContainer}>
              <Text style={dynamicStyles.loadingText}>Loading location...</Text>
            </View>
          ) : (
            <>
              <MapView
                ref={mapRef}
                style={dynamicStyles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                showsScale={false}
                showsBuildings={true}
                showsTraffic={false}
                showsIndoors={false}
                showsPointsOfInterest={true}
                customMapStyle={isDark ? darkMapStyle : []}
              >
                {/* Driver location marker */}
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="Your Location"
                  pinColor="#4CAF50"
                />

                {/* Route polyline */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={theme.primary}
                    strokeWidth={4}
                    lineDashPattern={[10, 10]}
                  />
                )}

                {/* Route stops markers */}
                {routeStops.map((stop, index) => (
                  <Marker
                    key={stop.id}
                    coordinate={{
                      latitude: stop.coordinates[1],
                      longitude: stop.coordinates[0],
                    }}
                    title={`Stop ${stop.order}: ${stop.name}`}
                    pinColor={index === 0 ? "#FF9900" : index === routeStops.length - 1 ? "#FF4444" : "#4CAF50"}
                  />
                ))}

                {/* Passenger locations (if any) */}
                {passengerLocations.map((passenger, index) => (
                  <Marker
                    key={`passenger-${index}`}
                    coordinate={{
                      latitude: passenger.latitude,
                      longitude: passenger.longitude,
                    }}
                    title={passenger.name}
                    pinColor="#2196F3"
                  />
                ))}
              </MapView>

              <TouchableOpacity 
                style={dynamicStyles.menuButton}
                onPress={handleMenuPress}
                accessibilityLabel="Open menu"
              >
                <Icon name="menu" size={24} color={theme.primary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={dynamicStyles.darkModeToggle}
                onPress={handleToggleTheme}
                activeOpacity={0.8}
                accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                <Icon 
                  name={isDark ? 'sunny' : 'moon'} 
                  size={28} 
                />
              </TouchableOpacity>

              <View style={dynamicStyles.earningsContainer}>
                <TouchableOpacity 
                  style={dynamicStyles.earningsCard}
                  onPress={() => console.log('Earnings pressed!')}
                  activeOpacity={0.8}
                >
                  <Text style={dynamicStyles.earningsAmount}>
                   R{(todaysEarnings ?? 0).toFixed(2)}
                  </Text>
                  <Text style={dynamicStyles.earningsTitle}>Today's Earnings</Text>
                </TouchableOpacity>
              </View>

              {/* Live Location Streaming Status for Drivers */}
              <View style={dynamicStyles.locationStreamingStatus}>
                {locationStreamError ? (
                  <Text style={[dynamicStyles.locationStreamingText, dynamicStyles.locationStreamingError]}>
                    Location Error: {locationStreamError}
                  </Text>
                ) : streamedLocation ? (
                  <Text style={[dynamicStyles.locationStreamingText, dynamicStyles.locationStreamingSuccess]}>
                    Live Location: {streamedLocation.latitude.toFixed(5)}, {streamedLocation.longitude.toFixed(5)}
                  </Text>
                ) : (
                  <Text style={[dynamicStyles.locationStreamingText, dynamicStyles.locationStreamingLoading]}>
                    Starting location streaming...
                  </Text>
                )}
              </View>

              {/* Route Status Overlay */}
              <View style={dynamicStyles.routeStatusOverlay}>
                <Text style={dynamicStyles.routeStatusText}>
                  {getRouteStatusText()}
                </Text>
              </View>

              <View style={dynamicStyles.bottomContainer}>
                <View style={dynamicStyles.quickStatus}>
                  {currentRoute && currentRoute !== 'Not Set' && (
                    <View style={dynamicStyles.quickStatusItem}>
                      <Text style={dynamicStyles.quickStatusValue}>{currentRoute}</Text>
                      <Text style={dynamicStyles.quickStatusLabel}>Current Route</Text>
                    </View>
                  )}
                  <View style={dynamicStyles.quickStatusItem}>
                    <Text style={dynamicStyles.quickStatusValue}>
                      {taxiInfo?.capacity === 0
                        ? "No seats available"
                        : taxiInfo?.capacity?.toString() ?? "Loading..."}
                    </Text>
                    <Text style={dynamicStyles.quickStatusLabel}>Available Seats</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={dynamicStyles.offlineButton}
                  onPress={onGoOffline}
                  activeOpacity={0.8}
                  accessibilityLabel="Go offline"
                >
                  <Text style={dynamicStyles.offlineButtonText}>GO OFFLINE</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={dynamicStyles.safetyButton}
                onPress={handleSafetyPress}
                activeOpacity={0.8}
                accessibilityLabel="Safety and emergency options"
              >
                <Icon name="shield-checkmark" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
              >
                <TouchableOpacity 
                  style={dynamicStyles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowMenu(false)}
                >
                  <View style={dynamicStyles.menuModal}>
                    <View style={dynamicStyles.menuModalHeader}>
                      <Text style={dynamicStyles.menuModalHeaderText}>Menu</Text>
                    </View>
                    {menuItems.map((item, index) => (
                      <TouchableOpacity 
                        key={index}
                        style={dynamicStyles.menuModalItem}
                        onPress={() => {
                          item.onPress();
                          setShowMenu(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={dynamicStyles.menuModalItemIcon}>
                          <Icon name={item.icon} size={20} color={theme.primary} />
                        </View>
                        <View style={dynamicStyles.menuModalItemContent}>
                          <Text style={dynamicStyles.menuModalItemTitle}>{item.title}</Text>
                          <Text style={dynamicStyles.menuModalItemSubtitle}>{item.subtitle}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              {showSafetyMenu && (
                <TouchableOpacity 
                  style={dynamicStyles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowSafetyMenu(false)}
                >
                  <View style={dynamicStyles.safetyModal}>
                    {safetyOptions.map((option, index) => (
                      <TouchableOpacity 
                        key={index}
                        style={[
                          dynamicStyles.safetyItem,
                          index === safetyOptions.length - 1 && dynamicStyles.safetyItemLast
                        ]}
                        onPress={option.onPress}
                        activeOpacity={0.8}
                      >
                        <View style={[dynamicStyles.safetyItemIcon, { backgroundColor: `${option.color}20` }]}>
                          <Icon name={option.icon} size={16} color={option.color} />
                        </View>
                        <View style={dynamicStyles.safetyItemContent}>
                          <Text style={dynamicStyles.safetyItemTitle}>{option.title}</Text>
                          <Text style={dynamicStyles.safetyItemSubtitle}>{option.subtitle}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Dark map style for better dark mode experience
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