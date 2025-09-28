import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Icon from 'react-native-vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
// @ts-ignore - No types available for @mapbox/polyline
import { decode } from '@mapbox/polyline';
import { useThrottledLocationStreaming } from './hooks/useLocationStreaming';
import { useAlertHelpers } from '../components/AlertHelpers';
import { AlertType } from '@/contexts/AlertContext';

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

interface RouteStop {
  id: string;
  name: string;
  coordinates: [number, number];
  order: number;
}

interface DriverRoute {
  _id: string;
  routeId: string;
  name: string;
  geometry: string;
  stops: RouteStop[];
  fare: number;
  estimatedDuration: number;
  estimatedDistance?: number;
  isActive: boolean;
  taxiAssociation: string;
  taxiAssociationRegistrationNumber: string;
}

export default function DriverOnline({ 
  onGoOffline, 
  todaysEarnings,
  currentRoute,
}: DriverOnlineProps) {
  const { width, height } = Dimensions.get('window');

  const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);
  const updateSeats = useMutation(api.functions.taxis.updateAvailableSeatsDirectly.updateAvailableSeatsDirectly);
  const copyDriverPinToRide = useMutation(api.functions.rides.getDriverPin.copyDriverPinToRide);

  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { t } = useLanguage();
  const userId = user?.id;
  
  // Set default route if not provided
  const displayRoute = currentRoute || t("driverOnline.notSet");
  const role: "passenger" | "driver" | "both" = (user?.role as "passenger" | "driver" | "both") || (user?.accountType as "passenger" | "driver" | "both") || 'driver';
  
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  const [processedRouteCoordinates, setProcessedRouteCoordinates] = useState<{latitude: number, longitude: number}[]>([]);
  
  const mapRef = useRef<MapView | null>(null);
  const { notifications, markAsRead } = useNotifications();
  const { showGlobalAlert, showGlobalError, showGlobalSuccess } = useAlertHelpers();
  
  const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(userId || '', role, true);
  
  // Get driver PIN from profile (this will always work)
  const getOrCreateDriverPin = useMutation(api.functions.rides.getDriverPin.getOrCreateDriverPin);

  const [driverPinData, setDriverPinData] = useState<{ pin: string; isNew: boolean } | null>(null);

  useEffect(() => {
    if (user?.id) {
      (async () => {
        try {
          const result = await getOrCreateDriverPin({ driverId: user.id as Id<"taxiTap_users"> });
          setDriverPinData(result);
        } catch (e) {
          console.error(t("driverOnline.failedToGetDriverPin"), e);
        }
      })();
    }
  }, [user?.id, getOrCreateDriverPin]);

  const taxiInfo = useQuery(
    api.functions.taxis.getTaxiForDriver.getTaxiForDriver,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  const activeRide = useQuery(
    api.functions.rides.getActiveRideByDriver.getActiveRideByDriver,
    user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  const earnings = useQuery(
    api.functions.earnings.earnings.getWeeklyEarnings,
    user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  const driverRoute = useQuery(
    api.functions.routes.queries.getDriverAssignedRoute,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  ) as DriverRoute | null;

  const acceptRide = useMutation(api.functions.rides.acceptRide.acceptRide);
  const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
  const declineRide = useMutation(api.functions.rides.declineRide.declineRide);

  // Get driver PIN from the query result
  const driverPin = driverPinData?.pin || '';

  // Google Maps API key - you'll need to add this to your environment
  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  // Location setup
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) return;

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;
        
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;
        if (latitude === 0 && longitude === 0) return;

        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        const placeName = `${place.name || ''} ${place.street || ''}, ${place.city || place.region || ''}`.trim();

        const currentLoc: LocationData = {
          latitude,
          longitude,
          name: placeName || t("driverOnline.unknownLocation"),
        };

        setCurrentLocation(currentLoc);
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getCurrentLocation();
  }, []);

  // Track route coordinates as driver moves
  useEffect(() => {
    if (streamedLocation) {
      const newCoordinate = {
        latitude: streamedLocation.latitude,
        longitude: streamedLocation.longitude,
      };

      setRouteCoordinates(prev => {
        // Limit to last 100 coordinates to avoid performance issues
        const updated = [...prev, newCoordinate];
        return updated.slice(-100);
      });
    }
  }, [streamedLocation]);

  // Process route coordinates only when driverRoute changes
  useEffect(() => {
    if (driverRoute && driverRoute.stops && driverRoute.stops.length > 0) {
      // Create route polyline from stops coordinates
      const stopCoordinates = driverRoute.stops
        .sort((a, b) => a.order - b.order)
        .map((stop: RouteStop) => ({
          latitude: stop.coordinates[0],
          longitude: stop.coordinates[1],
        }));

      // Try to decode geometry if available
      let geometryCoordinates: {latitude: number, longitude: number}[] = [];
      if (driverRoute.geometry) {
        try {
          const decodedCoordinates = decode(driverRoute.geometry) as [number, number][];
          geometryCoordinates = decodedCoordinates.map(([lat, lng]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }));
        } catch (error) {
          console.error('Error decoding route geometry:', error);
        }
      }

      // Use geometry coordinates if available, otherwise connect the stops
      const finalCoordinates = geometryCoordinates.length > 0 ? geometryCoordinates : stopCoordinates;
      setProcessedRouteCoordinates(finalCoordinates);
    } else {
      setProcessedRouteCoordinates([]);
    }
  }, [driverRoute]);

  // Update current location when streamed location changes
  useEffect(() => {
    if (streamedLocation) {
      const newLocation: LocationData = {
        latitude: streamedLocation.latitude,
        longitude: streamedLocation.longitude,
        name: t("driverOnline.currentLocation"),
      };
      setCurrentLocation(newLocation);

      // Animate map to new location if map is visible (throttled)
      if (showMap && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: streamedLocation.latitude,
          longitude: streamedLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500); // Reduced animation time
      }
    }
  }, [streamedLocation, showMap]);

  // Handle notifications
  const shownRequests = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    
    const rideRequest = notifications.find(n => n.type === "ride_request" && !n.isRead);
    if (rideRequest && !shownRequests.current.has(rideRequest._id)) {
      shownRequests.current.add(rideRequest._id);
      showGlobalAlert({
        title: t("driverOnline.newRideRequest"),
        message: rideRequest.message,
        position: 'top',
        animation: 'slide-down',
        duration: 0,
        type: 'info',
        actions: [
          {
            label: t("driverOnline.decline"),
            style: 'destructive',
            onPress: async () => {
              try {
                await declineRide({ rideId: rideRequest.metadata?.rideId, driverId: user.id as Id<'taxiTap_users'> });
              } catch (error) {
                showGlobalError(t("common.error"), t("driverOnline.failedToDeclineRide"), { position: 'top', animation: 'slide-down', duration: 5000 });
              }
              markAsRead(rideRequest._id);
            },
          },
          {
            label: t("driverOnline.accept"),
            style: 'default',
            onPress: async () => {
              try {
                // Accept the ride first
                await acceptRide({ rideId: rideRequest.metadata?.rideId, driverId: user.id as Id<"taxiTap_users"> });
                
                // Copy driver PIN to the ride
                await copyDriverPinToRide({ 
                  rideId: rideRequest.metadata?.rideId, 
                  driverId: user.id as Id<"taxiTap_users"> 
                });
                
                // Update taxi seat availability
                await updateTaxiSeatAvailability({ rideId: rideRequest.metadata?.rideId, action: "decrease" });
                
                markAsRead(rideRequest._id);
              } catch (error) {
                showGlobalError(t("common.error"), t("driverOnline.failedToAcceptRide"), { position: 'top', animation: 'slide-down', duration: 5000 });
              }
            },
          },
        ],
      });
    }
  }, [notifications, user, acceptRide, copyDriverPinToRide, updateTaxiSeatAvailability, declineRide, showGlobalAlert, showGlobalError, markAsRead]);

  const handleEmergency = () => {
    showGlobalAlert({
      title: 'Emergency Alert',
      message: 'This will contact emergency services (112)',
      type: 'Emergency Alert' as AlertType,
      position: 'top',
      animation: 'slide-down',
      duration: 0,
      actions: [
        {
          label: 'Yes, Get Help',
          style: 'destructive',
          onPress: () => {
            showGlobalSuccess('Emergency Alert Sent', 'Emergency services contacted.', { position: 'top', animation: 'slide-down', duration: 3000 });
          },
        },
        { label: 'Cancel', style: 'cancel', onPress: () => {} },
      ],
    });
  };

  const increaseSeats = async () => {
    if (!user) return;
    try {
      await updateSeats({ userId: user.id as Id<"taxiTap_users">, action: "increase" });
    } catch (e) {
      console.error(e);
    }
  };

  const decreaseSeats = async () => {
    if (!user) return;
    try {
      await updateSeats({ userId: user.id as Id<"taxiTap_users">, action: "decrease" });
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { icon: "person", title: "Profile", onPress: () => router.push('/DriverProfile') },
    { icon: "time", title: "Earnings", onPress: () => router.push('/EarningsPage') },
    { icon: "star", title: "Feedback", onPress: () => router.push('/FeedbackHistoryScreen') },
    { icon: "help-circle", title: "Help", onPress: () => navigation.navigate('HelpPage' as never) },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    pinText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.primary,
      fontFamily: 'monospace',
      marginRight: 4,
    },
    offlineButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    // Main Content
    mainContent: {
      flex: 1,
      paddingHorizontal: 20,
    },
    
    // Stats Row
    statsContainer: {
      flexDirection: 'row',
      paddingVertical: 20,
      gap: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    earningsValue: {
      color: '#22C55E',
    },
    
    // Seat Control
    seatControlContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    seatCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderRadius: 20,
      padding: 32,
      alignItems: 'center',
      width: '100%',
      maxWidth: 280,
      borderWidth: 1,
      borderColor: theme.border,
    },
    seatTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    seatSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    seatDisplay: {
      fontSize: 64,
      fontWeight: '800',
      color: theme.primary,
      marginVertical: 20,
    },
    seatControls: {
      flexDirection: 'row',
      gap: 20,
    },
    seatButton: {
      width: 60,
      height: 60,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
    },
    decreaseButton: {
      borderColor: '#EF4444',
      backgroundColor: '#EF4444' + '10',
    },
    increaseButton: {
      borderColor: '#22C55E',
      backgroundColor: '#22C55E' + '10',
    },
    buttonText: {
      fontSize: 24,
      fontWeight: '600',
    },
    decreaseText: { color: '#EF4444' },
    increaseText: { color: '#22C55E' },
    
    // Bottom Actions
    bottomActions: {
      padding: 20,
      gap: 12,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      gap: 8,
    },
    emergencyButton: {
      backgroundColor: '#EF4444' + '15',
      borderWidth: 1,
      borderColor: '#EF4444' + '30',
    },
    emergencyButtonText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '600',
    },
    mapButton: {
      backgroundColor: theme.primary + '15',
      borderWidth: 1,
      borderColor: theme.primary + '30',
    },
    mapButtonText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButton: {
      height: 52,
      backgroundColor: theme.primary,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    
    // Map View
    mapContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
    },
    map: {
      flex: 1,
    },
    mapCloseButton: {
      position: 'absolute',
      top: 60,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 101,
    },
    
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-start',
      paddingTop: 100,
      paddingHorizontal: 40,
    },
    menuModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 280,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    menuHeader: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)',
      alignItems: 'center',
    },
    menuHeaderText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.3,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(71, 85, 105, 0.1)' : 'rgba(226, 232, 240, 0.3)',
    },
    menuItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark 
        ? 'rgba(245, 158, 11, 0.15)' 
        : 'rgba(245, 158, 11, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    menuItemText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
      letterSpacing: -0.2,
    },
    
    pinModal: {
      margin: 20,
      backgroundColor: theme.background,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
    },
    pinModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 20,
    },
    pinDisplay: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    pinDigit: {
      width: 48,
      height: 56,
      backgroundColor: theme.primary,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pinDigitText: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: 'monospace',
    },
    pinInfo: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    closeButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
    },
  });

  if (!currentLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
            <Icon name="menu" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('driver.driverOnline')}</Text>
        </View>
        
        <View style={styles.headerRight}>
          {driverPin && (
            <TouchableOpacity style={styles.pinButton} onPress={() => setShowPinModal(true)}>
              <Text style={styles.pinText}>{driverPin}</Text>
              <Icon name="information-circle-outline" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.offlineButton} onPress={onGoOffline}>
            <Icon name="power" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('driver.todaysEarnings')}</Text>
            <Text style={[styles.statValue, styles.earningsValue]}>
              R{(earnings?.[0]?.todayEarnings ?? 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('driver.availableSeats')}</Text>
            <Text style={styles.statValue}>
              {taxiInfo?.capacity?.toString() ?? "0"}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('driver.currentRoute')}</Text>
            <Text style={[styles.statValue, { fontSize: 12, textAlign: 'center' }]}>
              {driverRoute?.name ?? t('driver.notAssigned')}
            </Text>
          </View>
        </View>

        {/* Seat Control */}
        <View style={styles.seatControlContainer}>
          <View style={styles.seatCard}>
            <Text style={styles.seatTitle}>{t('driver.seatManagement')}</Text>
            <Text style={styles.seatSubtitle}>
              {t('driver.adjustAvailableSeats')}
            </Text>
            
            <Text style={styles.seatDisplay}>
              {taxiInfo?.capacity?.toString() ?? "0"}
            </Text>
            
            <View style={styles.seatControls}>
              <TouchableOpacity
                style={[styles.seatButton, styles.decreaseButton]}
                onPress={decreaseSeats}
              >
                <Text style={[styles.buttonText, styles.decreaseText]}>−</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.seatButton, styles.increaseButton]}
                onPress={increaseSeats}
              >
                <Text style={[styles.buttonText, styles.increaseText]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, styles.emergencyButton]} onPress={handleEmergency}>
            <Icon name="warning" size={18} color="#EF4444" />
            <Text style={styles.emergencyButtonText}>{t('driver.emergency')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.mapButton]} onPress={() => setShowMap(true)}>
            <Icon name="map" size={18} color={theme.primary} />
            <Text style={styles.mapButtonText}>{t('driver.viewMap')}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/StatsPage')}>
          <Text style={styles.primaryButtonText}>{t('driver.viewStatistics')}</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      {showMap && currentLocation && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            followsUserLocation={true}
          >
            {/* Driver's current location marker */}
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Your Location"
              pinColor="blue"
            />

            {/* Show driver's assigned route */}
            {driverRoute && driverRoute.stops && driverRoute.stops.length > 0 && (
              <>
                {/* Route polyline connecting stops */}
                {processedRouteCoordinates.length > 1 && (
                  <Polyline
                    coordinates={processedRouteCoordinates}
                    strokeColor={theme.primary}
                    strokeWidth={5}
                  />
                )}

                {/* Route stops as markers */}
                {driverRoute.stops.map((stop: RouteStop, index: number) => (
                  <Marker
                    key={stop.id}
                    coordinate={{
                      latitude: stop.coordinates[0],
                      longitude: stop.coordinates[1],
                    }}
                    title={stop.name}
                    description={`Stop ${stop.order + 1} on ${driverRoute.name}`}
                    pinColor={index === 0 ? 'green' : index === driverRoute.stops.length - 1 ? 'red' : 'orange'}
                  />
                ))}

                {/* Driver's traveled path on the route */}
                {routeCoordinates.length > 1 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#007AFF"
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                  />
                )}
              </>
            )}

            {/* If no route assigned, just show the driver's traveled path */}
            {!driverRoute && routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#007AFF"
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}
          </MapView>
          
          <TouchableOpacity style={styles.mapCloseButton} onPress={() => setShowMap(false)}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.menuModal}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuHeaderText}>Menu</Text>
              </View>
              
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    item.onPress();
                    setShowMenu(false);
                  }}
                >
                  <View style={styles.menuItemIcon}>
                    <Icon name={item.icon} size={20} color={theme.primary} />
                  </View>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowPinModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.pinModal}>
              <Text style={styles.pinModalTitle}>Your Driver PIN</Text>
              
              <View style={styles.pinDisplay}>
                {driverPin.split('').map((digit, index) => (
                  <View key={index} style={styles.pinDigit}>
                    <Text style={styles.pinDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.pinInfo}>
                Show this PIN to passengers for secure verification.
                {driverPinData?.isNew && " (PIN was just generated)"}
              </Text>
              
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowPinModal(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}