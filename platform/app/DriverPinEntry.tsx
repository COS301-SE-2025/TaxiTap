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
import Icon from 'react-native-vector-icons/Ionicons';

export default function DriverPinEntry() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  
  const [pin, setPin] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
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

  const verifyPin = useMutation(api.functions.rides.verifyPin.verifyRidePin);

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

  const handleNumberPress = (number: string) => {
    const emptyIndex = pin.findIndex(digit => digit === '');
    if (emptyIndex !== -1) {
      const newPin = [...pin];
      newPin[emptyIndex] = number;
      setPin(newPin);

      // Auto-verify when all 4 digits are entered
      if (emptyIndex === 3) {
        verifyPinCode(newPin.join(''));
      }
    }
  };

  const handleBackspace = () => {
    const lastFilledIndex = pin.map((digit, index) => digit !== '' ? index : -1)
      .filter(index => index !== -1)
      .pop();
    
    if (lastFilledIndex !== undefined) {
      const newPin = [...pin];
      newPin[lastFilledIndex] = '';
      setPin(newPin);
    }
  };

  const verifyPinCode = async (enteredPin: string) => {
    if (!user || !ride) {
      Alert.alert('Error', 'User or ride information not available.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyPin({
        rideId: ride._id,
        driverId: user.id as Id<'taxiTap_users'>,
        enteredPin: enteredPin,
      });

      if (result.success) {
        // Show map with route after successful PIN verification
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
        Alert.alert('Invalid PIN', 'Please check with the passenger.');
        setPin(['', '', '', '']);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
      setPin(['', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderNumberPad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];
    
    return (
      <View style={dynamicStyles.numberPad}>
        {numbers.map((item, index) => {
          if (item === '') {
            return <View key={index} style={dynamicStyles.numberButtonEmpty} />;
          }
          
          if (item === 'backspace') {
            return (
              <TouchableOpacity
                key={index}
                style={dynamicStyles.numberButton}
                onPress={handleBackspace}
                activeOpacity={0.7}
              >
                <Icon name="backspace-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={dynamicStyles.numberButton}
              onPress={() => handleNumberPress(item)}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.numberButtonText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
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
    pinDisplay: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 40,
    },
    pinDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.border,
      marginHorizontal: 8,
      backgroundColor: 'transparent',
    },
    pinDotFilled: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    numberPad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: 240,
      marginBottom: 30,
    },
    numberButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: isDark ? theme.surface : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      margin: 5,
    },
    numberButtonEmpty: {
      width: 70,
      height: 70,
      margin: 5,
    },
    numberButtonText: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.text,
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
    verifyingText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '500',
      marginTop: 20,
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
    routeInfoContainer: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 20,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    routeInfoTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    routeInfoText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
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
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.content}>
          <Text style={dynamicStyles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If PIN is verified and map should be shown
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
            <Text style={dynamicStyles.title}>PIN Verified!</Text>
            <Text style={dynamicStyles.subtitle}>
              Ride started successfully
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

  // Original PIN entry screen
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
            <Text style={dynamicStyles.title}>Enter Passenger PIN</Text>
            <Text style={dynamicStyles.subtitle}>
              Ask passenger for verification code
            </Text>
          </View>

          {passenger && (
            <Text style={dynamicStyles.passengerName}>
              {passenger.name || 'Passenger'}
            </Text>
          )}

          <View style={dynamicStyles.pinDisplay}>
            {pin.map((digit, index) => (
              <View
                key={index}
                style={[
                  dynamicStyles.pinDot,
                  digit !== '' && dynamicStyles.pinDotFilled,
                ]}
              />
            ))}
          </View>

          {renderNumberPad()}

          {isVerifying && (
            <Text style={dynamicStyles.verifyingText}>Verifying...</Text>
          )}

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