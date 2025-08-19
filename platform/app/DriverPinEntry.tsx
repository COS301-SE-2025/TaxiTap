import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Icon from 'react-native-vector-icons/Ionicons';

export default function DriverPinEntry() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  
  const [showMap, setShowMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [driverPin, setDriverPin] = useState<string>('');
  
  const rideId = params.rideId as string;

  const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

  // Get ride information
  const ride = useQuery(
    api.functions.rides.getRideById.getRideById,
    rideId ? { rideId } : "skip"
  );

  // Get passenger information
  const passenger = useQuery(
    api.functions.users.UserManagement.getUserById.getUserById,
    ride?.passengerId ? { userId: ride.passengerId } : "skip"
  );

  // Get driver's pin from user profile
  const driverData = useQuery(
    api.functions.users.UserManagement.getUserById.getUserById,
    user?.id ? { userId: user.id as Id<'taxiTap_users'> } : "skip"
  );

  const startRide = useMutation(api.functions.rides.startRide.startRide);

  // Set driver pin when ride data is loaded
  useEffect(() => {
    if (ride?.ridePin) {
      setDriverPin(ride.ridePin);
    } else {
      // Generate a fallback PIN if none exists
      setDriverPin(Math.floor(1000 + Math.random() * 9000).toString());
    }
  }, [ride?.ridePin]);

  // Function to decode Google's polyline format
  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  // Function to get route from Google Directions API
  const getRoute = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key is not configured');
      return;
    }

    setIsLoadingRoute(true);
    
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${dest.latitude},${dest.longitude}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        if (!route.overview_polyline || !route.overview_polyline.points) {
          throw new Error('No polyline data in route');
        }
        
        const decodedCoords = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(decodedCoords);
      } else {
        throw new Error('No routes found');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      
      // Fallback: use straight line between origin and destination
      const fallbackRoute = [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: dest.latitude, longitude: dest.longitude }
      ];
      setRouteCoordinates(fallbackRoute);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleStartRide = async () => {
    if (!user || !ride) {
      Alert.alert('Error', 'User or ride information not available.');
      return;
    }

    try {
      const result = await startRide({
        rideId: ride._id,
        userId: user.id as Id<'taxiTap_users'>,
      });

      if (result._id) {
        // Show map with route after starting ride
        setShowMap(true);
        
        // Get route coordinates from ride data
        if (ride?.startLocation && ride?.endLocation) {
          const origin = {
            latitude: ride.startLocation.coordinates.latitude,
            longitude: ride.startLocation.coordinates.longitude
          };
          const destination = {
            latitude: ride.endLocation.coordinates.latitude,
            longitude: ride.endLocation.coordinates.longitude
          };
          
          // Fetch and display the route
          await getRoute(origin, destination);
        }
      } else {
        Alert.alert('Error', 'Failed to start ride. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to start ride. Please try again.');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginTop: 12,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    passengerName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    pinContainer: {
      alignItems: "center",
      marginBottom: 30,
      padding: 20,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.primary,
      width: '90%',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    pinLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 15,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    pinDisplay: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 15,
      alignItems: "center",
    },
    pinDigit: {
      width: 50,
      height: 60,
      backgroundColor: theme.primary,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: 4,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    pinDigitText: {
      fontSize: 24,
      fontWeight: "bold",
      color: isDark ? "#121212" : "#FFFFFF",
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    pinInstruction: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: "center",
      fontStyle: "italic",
    },
    startRideButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      width: '90%',
      marginBottom: 15,
    },
    startRideButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? "#121212" : "#FFFFFF",
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    cancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    cancelButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    mapContainer: {
      height: 300,
      marginBottom: 20,
      borderRadius: 16,
      overflow: 'hidden',
    },
    map: {
      flex: 1,
    },
    continueButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 10,
    },
    continueButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? "#121212" : "#FFFFFF",
    },
  });

  // Dark map style for better dark mode experience
  const darkMapStyle = [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#212121" }]
    },
    {
      "elementType": "labels.icon",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#212121" }]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#2c2c2c" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#8a8a8a" }]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [{ "color": "#373737" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#3c3c3c" }]
    },
    {
      "featureType": "road.local",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#616161" }]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#000000" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#3d3d3d" }]
    }
  ];

  if (!ride) {
    return <LoadingSpinner />;
  }

  // If ride is started and map should be shown
  if (showMap) {
    const startLocation = ride.startLocation?.coordinates;
    const endLocation = ride.endLocation?.coordinates;
    
    return (
      <SafeAreaView style={dynamicStyles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.header}>
            <Icon name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={dynamicStyles.title}>Ride Started!</Text>
            <Text style={dynamicStyles.subtitle}>
              Navigate to pickup location
            </Text>
          </View>

          {/* Map with Route */}
          {startLocation && endLocation && (
            <View style={dynamicStyles.mapContainer}>
              <MapView
                style={dynamicStyles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: (startLocation.latitude + endLocation.latitude) / 2,
                  longitude: (startLocation.longitude + endLocation.longitude) / 2,
                  latitudeDelta: Math.abs(startLocation.latitude - endLocation.latitude) * 2 + 0.01,
                  longitudeDelta: Math.abs(startLocation.longitude - endLocation.longitude) * 2 + 0.01,
                }}
                customMapStyle={isDark ? darkMapStyle : []}
              >
                <Marker
                  coordinate={startLocation}
                  title="Pickup Location"
                  pinColor="blue"
                />
                <Marker
                  coordinate={endLocation}
                  title="Destination"
                  pinColor="orange"
                />
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={theme.primary}
                    strokeWidth={4}
                  />
                )}
              </MapView>
            </View>
          )}

          <TouchableOpacity
            style={dynamicStyles.continueButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show driver's pin to passenger
  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={dynamicStyles.backButton}
        onPress={() => router.back()}
      >
        <Icon name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.header}>
            <Icon name="shield-checkmark" size={32} color={theme.primary} />
            <Text style={dynamicStyles.title}>Show Your PIN</Text>
            <Text style={dynamicStyles.subtitle}>
              Display this PIN to the passenger for verification
            </Text>
          </View>

          {passenger && (
            <Text style={dynamicStyles.passengerName}>
              Passenger: {passenger.name || 'Unknown'}
            </Text>
          )}

          {/* Driver PIN Display */}
          <View style={dynamicStyles.pinContainer}>
            <Text style={dynamicStyles.pinLabel}>Driver Verification PIN</Text>
            <View style={dynamicStyles.pinDisplay}>
              {driverPin.split('').map((digit, index) => (
                <View key={index} style={dynamicStyles.pinDigit}>
                  <Text style={dynamicStyles.pinDigitText}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={dynamicStyles.pinInstruction}>
              Ask passenger to verify and enter this PIN on their device
            </Text>
          </View>

          <TouchableOpacity
            style={dynamicStyles.startRideButton}
            onPress={handleStartRide}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.startRideButtonText}>Start Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.cancelButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}