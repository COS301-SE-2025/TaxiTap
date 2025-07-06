import React, { useLayoutEffect, useState } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useUser } from '../contexts/UserContext';
import { Id } from "../convex/_generated/dataModel";

export default () => {
    const params = useLocalSearchParams();
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const { user } = useUser();

    // Get rideId from navigation params
    const rideId = params.rideId as string;

    // Fetch ride data from Convex
    const ride = useQuery(api.functions.rides.getRideById.getRideById, rideId ? { rideId } : "skip");
    
    const acceptRide = useMutation(api.functions.rides.acceptRide.acceptRide);
    const declineRide = useMutation(api.functions.rides.declineRide.declineRide);
    const completeRide = useMutation(api.functions.rides.completeRide.completeRide);
    
    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    });

    const handleAction = async (action: 'accept' | 'decline' | 'complete') => {
        if (!user || !ride) {
            Alert.alert('Error', 'User or ride data is not available.');
            return;
        }

        try {
            let result;
            switch (action) {
                case 'accept':
                    result = await acceptRide({ rideId: ride.rideId, driverId: user.id as Id<"taxiTap_users"> });
                    Alert.alert('Success', 'Ride accepted! The passenger has been notified.');
                    break;
                case 'decline':
                    result = await declineRide({ rideId: ride.rideId, driverId: user.id as Id<"taxiTap_users"> });
                    Alert.alert('Success', 'Ride declined.');
                    break;
                case 'complete':
                    result = await completeRide({ rideId: ride.rideId, driverId: user.id as Id<"taxiTap_users"> });
                    Alert.alert('Success', 'Ride marked as completed!');
                    break;
            }
            router.back();
        } catch (err: any) {
            console.error(`Failed to ${action} ride:`, err);
            Alert.alert('Error', err.message || `Failed to ${action} ride. Please try again.`);
        }
    };
    
    // Styles (with additions for new buttons/states)
    const dynamicStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollView: {
            flex: 1,
            backgroundColor: theme.background,
        },
        bottomSection: {
            alignItems: "center",
            backgroundColor: theme.surface,
            borderRadius: 30,
            paddingTop: 47,
            paddingBottom: 60,
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
            width: '90%',
            alignSelf: 'center',
            shadowColor: theme.shadow,
            shadowOpacity: isDark ? 0.3 : 0.15,
            shadowOffset: {
                width: 0,
                height: 4
            },
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
            borderColor: isDark ? '#FFB84D' : '#FFB84D',
            marginBottom: 8,
            justifyContent: 'center',
            alignItems: 'center'
        },
        currentLocationDot: {
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: theme.primary
        },
        dottedLineContainer: {
            height: 35,
            width: 1,
            marginBottom: 8,
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        dottedLineDot: {
            width: 2,
            height: 3,
            backgroundColor: theme.primary,
            borderRadius: 1
        },
        locationTextContainer: {
            flex: 1,
        },
        currentLocationText: {
            color: isDark ? theme.primary : "#A66400",
            fontSize: 14,
            fontWeight: "bold",
            marginBottom: 17,
        },
        locationSeparator: {
            height: 1,
            backgroundColor: isDark ? theme.border : "#D4A57D",
            marginBottom: 19,
            marginHorizontal: 2,
        },
        destinationText: {
            color: theme.text,
            fontSize: 14,
            fontWeight: "bold",
            marginLeft: 2,
        },
        declineButton: {
            alignItems: "center",
            backgroundColor: "#dc3545", // Red
            borderRadius: 30,
            paddingVertical: 24,
            width: '90%',
        },
        declineButtonText: {
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: "bold",
        },
        acceptButton: {
            alignItems: "center",
            backgroundColor: "#28a745", // Green
            borderRadius: 30,
            paddingVertical: 24,
            width: '90%',
            marginBottom: 20,
        },
        acceptButtonText: {
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: "bold",
        },
        completeButton: {
            alignItems: "center",
            backgroundColor: theme.primary,
            borderRadius: 30,
            paddingVertical: 24,
            width: '90%',
        },
        completeButtonText: {
            color: theme.buttonText,
            fontSize: 20,
            fontWeight: "bold",
        },
        statusText: {
            fontSize: 18,
            fontWeight: 'bold',
            color: theme.textSecondary,
            padding: 20,
        },
        textBox: {
            paddingVertical: 10,
            paddingHorizontal: 15,
            borderWidth: 1,
            borderColor: '#121212',
            borderRadius: 30,
            backgroundColor: '#121212',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        textBoxText: {
            color: '#FFB84D',
            textAlign: 'center',
        },
    });
    
    // Loading and error states
    if (ride === undefined) {
        return (
            <SafeAreaView style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ color: theme.text, marginTop: 10 }}>Loading Ride Details...</Text>
            </SafeAreaView>
        );
    }

    if (ride === null) {
        return (
            <SafeAreaView style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="alert-circle-outline" size={40} color={theme.textSecondary} />
                <Text style={{ color: theme.text, marginTop: 10, fontSize: 16 }}>Ride not found.</Text>
            </SafeAreaView>
        );
    }
    
    // Ride details
	const currentLocation = {
		latitude: ride.startLocation.coordinates.latitude,
		longitude: ride.startLocation.coordinates.longitude,
		name: ride.startLocation.address
	};

	const destination = {
		latitude: ride.endLocation.coordinates.latitude,
		longitude: ride.endLocation.coordinates.longitude,
		name: ride.endLocation.address
	};

    // Render action buttons based on ride status
    const renderActionButtons = () => {
        switch (ride.status) {
            case 'requested':
                return (
                    <>
                        <TouchableOpacity style={dynamicStyles.acceptButton} onPress={() => handleAction('accept')}>
                            <Text style={dynamicStyles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={dynamicStyles.declineButton} onPress={() => handleAction('decline')}>
                            <Text style={dynamicStyles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                    </>
                );
            case 'accepted':
                return (
                    <TouchableOpacity style={dynamicStyles.completeButton} onPress={() => handleAction('complete')}>
                        <Text style={dynamicStyles.completeButtonText}>Complete Ride</Text>
                    </TouchableOpacity>
                );
            case 'completed':
                return <Text style={dynamicStyles.statusText}>Ride Completed</Text>;
            case 'cancelled':
                return <Text style={dynamicStyles.statusText}>Ride Cancelled</Text>;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={dynamicStyles.container}>
            <ScrollView style={dynamicStyles.scrollView}>
                <View>
                    {/* Map Section with Route */}
                    <View style={{ height: 300, position: 'relative' }}>
                        <MapView
                            style={{ flex: 1 }}
                            provider={PROVIDER_GOOGLE} // Force Google Maps on all platforms
                            initialRegion={{
                                latitude: (currentLocation.latitude + destination.latitude) / 2,
                                longitude: (currentLocation.longitude + destination.longitude) / 2,
                                latitudeDelta: Math.abs(currentLocation.latitude - destination.latitude) * 2 + 0.01,
                                longitudeDelta: Math.abs(currentLocation.longitude - destination.longitude) * 2 + 0.01,
                            }}
                            // Use dark map style when in dark mode
                            customMapStyle={isDark ? darkMapStyle : []}
                        >
                            <Marker
                                coordinate={currentLocation}
                                title="You are here"
                                pinColor="blue"
                            >
                            </Marker>
                            <Marker
                                coordinate={destination}
                                title={destination.name}
                                pinColor="orange"
                            >
                            </Marker>
                            <Polyline
                                coordinates={[currentLocation, destination]}
                                strokeColor="#00A591"
                                strokeWidth={4}
                            />
                        </MapView>

                        {/* Passenger Location Overlay */}
                        {/* <View style={dynamicStyles.arrivalTimeOverlay}>
                            <View style={dynamicStyles.arrivalTimeBox}>
                                <Text style={dynamicStyles.arrivalTimeText}>
                                    {vehicleInfo.time}
                                </Text>
                            </View>
                        </View> */}
                    </View>

                    <View style={dynamicStyles.bottomSection}>
                        <View style={{ width: '25%', alignItems: 'center' }}>
                            <View style={dynamicStyles.textBox}>
                                <Text style={dynamicStyles.textBoxText}>
                                R12.50
                                </Text>
                            </View>
                        </View>
                        <View style={dynamicStyles.locationBox}>
                            {/* Current Location and Destination indicators */}
                            <View style={dynamicStyles.locationIndicator}>
                                {/* Current Location Circle */}
                                <View style={dynamicStyles.currentLocationCircle}>
                                    <View style={dynamicStyles.currentLocationDot} />
                                </View>
                                
                                {/* Dotted Line Container */}
                                <View style={dynamicStyles.dottedLineContainer}>
                                    {[...Array(8)].map((_, index) => (
                                        <View key={index} style={dynamicStyles.dottedLineDot} />
                                    ))}
                                </View>
                                
                                {/* Destination Pin */}
                                <Icon name="location" size={18} color={isDark ? theme.text : "#121212"} />
                            </View>
                            
                            <View style={dynamicStyles.locationTextContainer}>
                                <Text style={dynamicStyles.currentLocationText}>
                                    {currentLocation.name}
                                </Text>
                                <View style={dynamicStyles.locationSeparator}></View>
                                <Text style={dynamicStyles.destinationText}>
                                    {destination.name}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            {renderActionButtons()}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

// Dark map style for better dark mode experience (same as HomeScreen)
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