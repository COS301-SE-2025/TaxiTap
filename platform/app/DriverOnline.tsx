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
  Platform,
} from 'react-native';
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

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  age: number;
  phoneNumber: string;
  isVerified: boolean;
  isActive: boolean;
  accountType: "passenger" | "driver" | "both";
  currentActiveRole?: "passenger" | "driver";
  lastRoleSwitchAt?: number;
  profilePicture?: string;
  dateOfBirth?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  emergencyContact?: {
    name: string;
    phoneNumber: string;
    relationship: string;
  };
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  homeAddress?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    nickname?: string;
  };
  workAddress?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    nickname?: string;
  };
  driverPin?: string;
}

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
  const updateDriverPin = useMutation(api.functions.rides.verifyDriverPin.updateDriverPin);

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
  const [showPinModal, setShowPinModal] = useState(false);
  
  const mapRef = useRef<MapView | null>(null);
  const pinGeneratedRef = useRef<boolean>(false);
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

  // Get user's full profile including driverPin
  const userProfile = useQuery(
    api.functions.users.UserManagement.getUserById.getUserById,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  ) as UserProfile | undefined;

  const acceptRide = useMutation(api.functions.rides.acceptRide.acceptRide);
  const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
  const declineRide = useMutation(api.functions.rides.declineRide.declineRide);

  // Generate or use existing PIN
  useEffect(() => {
    if (activeRide?.ridePin) {
      setDriverPin(activeRide.ridePin);
      pinGeneratedRef.current = true;
    } else if (userProfile && !pinGeneratedRef.current) {
      // Check if user already has a stored PIN
      if (userProfile.driverPin) {
        console.log('Using existing driver PIN:', userProfile.driverPin);
        setDriverPin(userProfile.driverPin);
        pinGeneratedRef.current = true;
      } else {
        // Generate PIN only if user doesn't have one stored
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();
        console.log('Generating new driver PIN:', newPin);
        setDriverPin(newPin);
        pinGeneratedRef.current = true;
        
        // Save the new PIN to the user's profile
        if (user?.id) {
          updateDriverPin({ driverId: user.id as Id<"taxiTap_users">, newPin })
            .then(() => {
              console.log('Driver PIN saved successfully');
            })
            .catch(error => {
              console.error('Error saving driver PIN:', error);
              // Reset the flag so we can try again
              pinGeneratedRef.current = false;
            });
        }
      }
    }
  }, [userProfile, activeRide?.ridePin, updateDriverPin, user?.id]);

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

  const regeneratePin = async () => {
    if (!user?.id) return;
    
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    console.log('Regenerating driver PIN:', newPin);
    
    try {
      await updateDriverPin({ driverId: user.id as Id<"taxiTap_users">, newPin });
      setDriverPin(newPin);
      showGlobalSuccess('PIN Updated', 'Your driver PIN has been updated successfully.', { 
        position: 'top', 
        animation: 'slide-down', 
        duration: 3000 
      });
    } catch (error) {
      console.error('Error updating driver PIN:', error);
      showGlobalError('Error', 'Failed to update driver PIN. Please try again.', { 
        position: 'top', 
        animation: 'slide-down', 
        duration: 5000 
      });
    }
  };

  const menuItems = [
    { icon: "person", title: "Profile", onPress: () => router.push('/DriverProfile') },
    { icon: "time", title: "Trip History", onPress: () => router.push('/EarningsPage') },
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
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 8,
      backdropFilter: 'blur(20px)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
    },
    pinText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.primary,
      fontFamily: 'monospace',
      marginRight: 6,
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    offlineButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    
    // Main Content
    mainContent: {
      flex: 1,
      paddingHorizontal: 20,
    },
    
    // Stats Row
    statsContainer: {
      flexDirection: 'row',
      paddingVertical: 24,
      gap: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 16,
      elevation: 12,
      backdropFilter: 'blur(20px)',
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '600',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    earningsValue: {
      color: '#22C55E',
      textShadowColor: 'rgba(34,197,94,0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    
    // Seat Control
    seatControlContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    seatCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
      borderRadius: 24,
      padding: 36,
      alignItems: 'center',
      width: '100%',
      maxWidth: 300,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.5 : 0.2,
      shadowRadius: 24,
      elevation: 16,
      backdropFilter: 'blur(20px)',
    },
    seatTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 10,
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    seatSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 22,
      fontWeight: '500',
    },
    seatDisplay: {
      fontSize: 72,
      fontWeight: '900',
      color: theme.primary,
      marginVertical: 24,
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    seatControls: {
      flexDirection: 'row',
      gap: 24,
    },
    seatButton: {
      width: 64,
      height: 64,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    decreaseButton: {
      borderColor: '#EF4444',
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
    },
    increaseButton: {
      borderColor: '#22C55E',
      backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)',
    },
    buttonText: {
      fontSize: 28,
      fontWeight: '700',
    },
    decreaseText: { 
      color: '#EF4444',
      textShadowColor: 'rgba(239,68,68,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    increaseText: { 
      color: '#22C55E',
      textShadowColor: 'rgba(34,197,94,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    
    // Bottom Actions
    bottomActions: {
      padding: 24,
      gap: 16,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 16,
    },
    actionButton: {
      flex: 1,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
    },
    emergencyButton: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
      borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
    },
    emergencyButtonText: {
      color: '#EF4444',
      fontSize: 15,
      fontWeight: '700',
      textShadowColor: 'rgba(239,68,68,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    mapButton: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
      borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)',
    },
    mapButtonText: {
      color: theme.primary,
      fontSize: 15,
      fontWeight: '700',
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    primaryButton: {
      height: 56,
      backgroundColor: theme.primary,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
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
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 101,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    
    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-start',
      paddingTop: 100,
      backdropFilter: 'blur(10px)',
    },
    menuModal: {
      marginHorizontal: 20,
      backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.4,
      shadowRadius: 40,
      elevation: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
      backdropFilter: 'blur(20px)',
    },
    menuHeader: {
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)',
    },
    menuHeaderText: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    menuItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 18,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    menuItemText: {
      fontSize: 17,
      color: theme.text,
      fontWeight: '600',
    },
    
    pinModal: {
      margin: 20,
      backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.4,
      shadowRadius: 40,
      elevation: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
      backdropFilter: 'blur(20px)',
    },
    pinModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 24,
      textShadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    pinDisplay: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    pinDigit: {
      width: 52,
      height: 60,
      backgroundColor: theme.primary,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    pinDigitText: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    pinInfo: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
      fontWeight: '500',
    },
    closeButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    closeButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    pinModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 20,
    },
    regenerateButton: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
      borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 14,
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    regenerateButtonText: {
      color: '#EF4444',
      fontSize: 15,
      fontWeight: '700',
      textShadowColor: 'rgba(239,68,68,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
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
          
          <TouchableOpacity style={styles.offlineButton} onPress={onGoOffline}>
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
            
            <View style={styles.pinModalButtons}>
              <TouchableOpacity style={styles.regenerateButton} onPress={regeneratePin}>
                <Text style={styles.regenerateButtonText}>Regenerate PIN</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowPinModal(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}