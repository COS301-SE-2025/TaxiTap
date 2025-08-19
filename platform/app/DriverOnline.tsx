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
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PanGestureHandler } from 'react-native-gesture-handler';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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

export default function DriverOnline({ 
  onGoOffline, 
  todaysEarnings,
  currentRoute = "Not Set",
}: DriverOnlineProps) {
  const { width, height } = Dimensions.get('window');

  const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);
  const updateSeats = useMutation(api.functions.taxis.updateAvailableSeatsDirectly.updateAvailableSeatsDirectly);

  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const role: "passenger" | "driver" | "both" = (user?.role as "passenger" | "driver" | "both") || (user?.accountType as "passenger" | "driver" | "both") || 'driver';
  
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [driverPin, setDriverPin] = useState<string>('');
  
  // Prevent PIN from being cleared on re-renders
  const setDriverPinStable = (pin: string) => {
    if (pin && pin !== driverPin) {
      setDriverPin(pin);
    }
  };
  const [showPinModal, setShowPinModal] = useState(false);
  
  const mapRef = useRef<MapView | null>(null);
  const { notifications, markAsRead } = useNotifications();
  const { showGlobalAlert, showGlobalError, showGlobalSuccess } = useAlertHelpers();
  
  const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(userId || '', role, true);
  
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

  const acceptRide = useMutation(api.functions.rides.acceptRide.acceptRide);
  const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
  const declineRide = useMutation(api.functions.rides.declineRide.declineRide);

  // Generate or use existing PIN - only once per session
  const pinGeneratedRef = useRef(false);
  const sessionPinRef = useRef<string>('');
  
  // Try to get PIN from AsyncStorage or generate new one
  useEffect(() => {
    const getStoredPin = async () => {
      try {
        // Check if we have a stored PIN for this user session
        const storedPin = await AsyncStorage.getItem(`driverPin_${userId}`);
        
        if (storedPin) {
          sessionPinRef.current = storedPin;
          setDriverPinStable(storedPin);
          pinGeneratedRef.current = true;
          return;
        }
        
        // If there's an active ride with a PIN, use that
        if (activeRide?.ridePin) {
          sessionPinRef.current = activeRide.ridePin;
          await AsyncStorage.setItem(`driverPin_${userId}`, activeRide.ridePin);
          setDriverPinStable(activeRide.ridePin);
          pinGeneratedRef.current = true;
        } 
        // If no active ride and we haven't generated a PIN yet, generate one
        else if (user && !pinGeneratedRef.current) {
          const newPin = Math.floor(1000 + Math.random() * 9000).toString();
          sessionPinRef.current = newPin;
          await AsyncStorage.setItem(`driverPin_${userId}`, newPin);
          setDriverPinStable(newPin);
          pinGeneratedRef.current = true;
        }
      } catch (error) {
        console.error('Error with PIN storage:', error);
      }
    };
    
    getStoredPin();
  }, [user, activeRide?.ridePin, userId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  });

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
          name: placeName || 'Unknown Location',
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

  // Handle notifications
  useEffect(() => {
    if (!user) return;
    
    const rideRequest = notifications.find(n => n.type === "ride_request" && !n.isRead);
    if (rideRequest) {
      showGlobalAlert({
        title: "New Ride Request",
        message: rideRequest.message,
        position: 'top',
        animation: 'slide-down',
        duration: 0,
        type: 'info',
        actions: [
          {
            label: 'Decline',
            style: 'destructive',
            onPress: async () => {
              try {
                await declineRide({ rideId: rideRequest.metadata.rideId, driverId: user.id as Id<'taxiTap_users'> });
              } catch (error) {
                showGlobalError('Error', 'Failed to decline ride.', { position: 'top', animation: 'slide-down', duration: 5000 });
              }
              markAsRead(rideRequest._id);
            },
          },
          {
            label: 'Accept',
            style: 'default',
            onPress: async () => {
              try {
                await acceptRide({ rideId: rideRequest.metadata.rideId, driverId: user.id as Id<"taxiTap_users"> });
                await updateTaxiSeatAvailability({ rideId: rideRequest.metadata.rideId, action: "decrease" });
                markAsRead(rideRequest._id);
              } catch (error) {
                showGlobalError('Error', 'Failed to accept ride.', { position: 'top', animation: 'slide-down', duration: 5000 });
              }
            },
          },
        ],
      });
    }
  }, [notifications, user]);

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

  // Clear PIN when going offline
  const handleGoOffline = async () => {
    try {
      // Clear the stored PIN
      if (userId) {
        await AsyncStorage.removeItem(`driverPin_${userId}`);
      }
      // Call the parent's onGoOffline function
      onGoOffline();
    } catch (error) {
      console.error('Error clearing PIN:', error);
      // Still call onGoOffline even if clearing fails
      onGoOffline();
    }
  };

  // Clear PIN when ride ends (status changes from in_progress)
  useEffect(() => {
    if (activeRide?.status === 'completed' || activeRide?.status === 'cancelled') {
      const clearRidePin = async () => {
        try {
          if (userId) {
            await AsyncStorage.removeItem(`driverPin_${userId}`);
          }
        } catch (error) {
          console.error('Error clearing ride PIN:', error);
        }
      };
      clearRidePin();
    }
  }, [activeRide?.status, userId]);

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
  });

  if (!currentLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Loading location...</Text>
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
          <Text style={styles.headerTitle}>Driver Online</Text>
        </View>
        
        <View style={styles.headerRight}>
          {driverPin && (
            <TouchableOpacity style={styles.pinButton} onPress={() => setShowPinModal(true)}>
              <Text style={styles.pinText}>{driverPin}</Text>
              <Icon name="information-circle-outline" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.offlineButton} onPress={handleGoOffline}>
            <Icon name="power" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={[styles.statValue, styles.earningsValue]}>
              R{(earnings?.[0]?.todayEarnings ?? 0).toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Available Seats</Text>
            <Text style={styles.statValue}>
              {taxiInfo?.capacity?.toString() ?? "0"}
            </Text>
          </View>
        </View>

        {/* Seat Control */}
        <View style={styles.seatControlContainer}>
          <View style={styles.seatCard}>
            <Text style={styles.seatTitle}>Seat Management</Text>
            <Text style={styles.seatSubtitle}>
              Adjust available seats for passengers
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
            <Text style={styles.emergencyButtonText}>Emergency</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.mapButton]} onPress={() => setShowMap(true)}>
            <Icon name="map" size={18} color={theme.primary} />
            <Text style={styles.mapButtonText}>View Map</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/StatsPage')}>
          <Text style={styles.primaryButtonText}>View Statistics</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      {showMap && (
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
          >
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Your Location"
            />
          </MapView>
          
          <TouchableOpacity style={styles.mapCloseButton} onPress={() => setShowMap(false)}>
            <Icon name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
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
      </Modal>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowPinModal(false)}>
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
            </Text>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowPinModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}