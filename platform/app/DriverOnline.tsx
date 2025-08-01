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
} from 'react-native';
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
  const updateSeats = useMutation(api.functions.taxis.updateAvailableSeatsDirectly.updateAvailableSeatsDirectly);

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
  
  const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(userId || '', role, true);
  
  const taxiInfo = useQuery(
    api.functions.taxis.getTaxiForDriver.getTaxiForDriver,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  const acceptRide = useMutation(api.functions.rides.acceptRide.acceptRide);
  const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
  const declineRide = useMutation(api.functions.rides.declineRide.declineRide);

  if (!user) return;

  const earnings = useQuery(api.functions.earnings.earnings.getWeeklyEarnings, { driverId: user.id as Id<"taxiTap_users">, });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  });

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

        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (typeof onGoOffline !== 'function') {
      router.replace('/DriverHomeScreen');
    }
  }, [onGoOffline, router]);

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
                
                // Navigate to PIN entry screen after accepting ride
                router.push({
                  pathname: '/DriverPinEntry',
                  params: { rideId: rideRequest.metadata.rideId }
                });
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
  }, [notifications, user]);

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
      icon: 'person-outline',
      title: 'Feedback',
      subtitle: 'Ratings & Feedback',
      onPress: () => router.push('/FeedbackHistoryScreen'),
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
      icon: "location-outline", 
      title: "Location Spoofer", 
      subtitle: "Set custom location for testing",
      onPress: () => {
        setShowMenu(false);
      }
    },
    { 
      icon: "help-outline", 
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

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      zIndex: 999,
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

  async function increaseSeats() {
    if (!user) {
      Alert.alert("You must be logged in");
      return;
    }
    try {
      await updateSeats({ userId: user.id as Id<"taxiTap_users">, action: "increase" });
    } catch (e) {
      console.error(e);
    }
  }

  async function decreaseSeats() {
    if (!user) {
      Alert.alert("You must be logged in");
      return;
    }
    try {
      await updateSeats({ userId: user.id as Id<"taxiTap_users">, action: "decrease" });
    } catch (e) {
      console.error(e);
    }
  }

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
              >
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="Your Location"
                  pinColor="#4CAF50"
                />
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
                   R{(earnings?.[0]?.todayEarnings ?? 0).toFixed(2)}
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

              <View style={dynamicStyles.bottomContainer}>
                <View style={dynamicStyles.quickStatus}>
                  {currentRoute && currentRoute !== 'Not Set' && (
                    <View style={dynamicStyles.quickStatusItem}>
                      <Text style={dynamicStyles.quickStatusValue}>{currentRoute}</Text>
                      <Text style={dynamicStyles.quickStatusLabel}>Current Route</Text>
                    </View>
                  )}
                  <View style={dynamicStyles.quickStatusItem}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await decreaseSeats();
                          } catch (error) {
                            // Optional: handle error (e.g., show a toast or log it)
                            console.error("Failed to update seat availability:", error);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 18, paddingHorizontal: 6 }}>−</Text>
                      </TouchableOpacity>

                      <Text style={dynamicStyles.quickStatusValue}>
                        {taxiInfo?.capacity === 0
                          ? "No seats available"
                          : taxiInfo?.capacity?.toString() ?? "Loading..."}
                      </Text>

                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await increaseSeats()
                          } catch (error) {
                            // Optional: handle error (e.g., show a toast or log it)
                            console.error("Failed to update seat availability:", error);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 18, paddingHorizontal: 6 }}>+</Text>
                      </TouchableOpacity>
                    </View>

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