import React, { useLayoutEffect, useState, useRef, useEffect } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform, Alert } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { router } from 'expo-router';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useMapContext, createRouteKey } from '../../contexts/MapContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useThrottledLocationStreaming } from '../hooks/useLocationStreaming';
import { useProximityTimer } from '../hooks/useProximityTimer';
import * as Location from 'expo-location';

// Get platform-specific API key
const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios' 
  ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
  : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

export default function SeatReserved() {
	const [useLiveLocation, setUseLiveLocation] = useState(false);
	const params = useLocalSearchParams();
	const navigation = useNavigation();
	const { theme, isDark } = useTheme();
	const { user } = useUser();
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
		setCachedRoute
	} = useMapContext();
	const { notifications, markAsRead } = useNotifications();

	const mapRef = useRef<MapView | null>(null);
	
	// Location streaming for passenger
	const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(
		user?.id || '', 
		(user?.role as "passenger" | "driver" | "both") || 'passenger', 
		true
	);

	// Proximity timer for periodic checks
	useProximityTimer(true);

	// State for tracking current map mode
	const [mapMode, setMapMode] = useState<'initial' | 'to_driver' | 'to_destination'>('initial');
	const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
	const [lastProximityAlert, setLastProximityAlert] = useState<string | null>(null);

	// Fetch taxi and driver info for the current reservation using Convex
	let taxiInfo: { rideId?: string; status?: string; driver?: any; taxi?: any } | undefined, taxiInfoError: unknown;
	try {
		taxiInfo = useQuery(
			api.functions.taxis.viewTaxiInfo.viewTaxiInfo,
			user ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
		);
	} catch (err) {
		taxiInfoError = err;
	}

	const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
	const startRide = useMutation(api.functions.rides.startRide.startRide);
	const endRide = useMutation(api.functions.rides.endRide.endRide);

	// Helper to determine ride status
	const rideStatus = taxiInfo?.status as 'requested' | 'accepted' | 'in_progress' | 'started' | 'completed' | 'cancelled' | undefined;
	const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);

	const [hasFittedRoute, setHasFittedRoute] = useState(false);
	const [isFollowing, setIsFollowing] = useState(true);
	const [hasShownDeclinedAlert, setHasShownDeclinedAlert] = useState(false);

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
				//   role: user.role || 'passenger'
				// });
				console.log('Location update sent:', streamedLocation);
			} catch (error) {
				console.log('Error updating location:', error);
			}
		}, 15000); // Update every 15 seconds

		return () => clearInterval(updateLocationInterval);
	}, [user?.id, streamedLocation]);

	// Proximity notification listener and ETA calculator
	useEffect(() => {
		if (!streamedLocation || !driverLocation || rideStatus !== 'accepted') return;

		const calculateETA = async () => {
			try {
				// Use Google Maps Directions API for real ETA
				const origin = `${streamedLocation.latitude},${streamedLocation.longitude}`;
				const destination = `${driverLocation.latitude},${driverLocation.longitude}`;
				const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
				
				const response = await fetch(url);
				const data = await response.json();
				
				if (data.routes && data.routes.length > 0) {
					const duration = data.routes[0].legs[0].duration.value; // in seconds
					const etaMinutes = Math.round(duration / 60);
					
					// Check for proximity alerts (frontend fallback - backend handles the real notifications)
					if (etaMinutes <= 10 && lastProximityAlert !== '10min' && etaMinutes > 5) {
						setLastProximityAlert('10min');
						console.log('Driver is 10 minutes away! (Frontend check)');
					} else if (etaMinutes <= 5 && lastProximityAlert !== '5min' && etaMinutes > 1) {
						setLastProximityAlert('5min');
						console.log('Driver is 5 minutes away! (Frontend check)');
					} else if (etaMinutes <= 1 && lastProximityAlert !== 'arrived') {
						setLastProximityAlert('arrived');
						console.log('Driver has arrived! (Frontend check)');
					}
				}
			} catch (error) {
				console.log('Error calculating ETA:', error);
			}
		};

		const etaInterval = setInterval(calculateETA, 30000); // Check every 30 seconds
		return () => clearInterval(etaInterval);
	}, [streamedLocation, driverLocation, rideStatus, lastProximityAlert]);

	// Mock driver location updates (replace with real driver location query)
	useEffect(() => {
		if (rideStatus === 'accepted' && taxiInfo?.driver) {
			// Integrate here: Query driver's live location
			// const driverLiveLocation = useQuery(api.functions.locations.getDriverLocation, {
			//   driverId: taxiInfo.driver.id
			// });
			
			// Mock driver location for demonstration
			const mockDriverLocation = {
				latitude: parseFloat(getParamAsString(params.currentLat, "-25.7479")) + 0.01,
				longitude: parseFloat(getParamAsString(params.currentLng, "28.2293")) + 0.01
			};
			setDriverLocation(mockDriverLocation);
		}
	}, [rideStatus, taxiInfo]);

	// Handle map mode transitions
	useEffect(() => {
		if (rideStatus === 'accepted' && mapMode === 'initial') {
			setMapMode('to_driver');
			setUseLiveLocation(true);
		} else if ((rideStatus === 'started' || rideStatus === 'in_progress') && mapMode === 'to_driver') {
			setMapMode('to_destination');
		}
	}, [rideStatus, mapMode]);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: false
		});
	}, [navigation]);

	function getParamAsString(param: string | string[] | undefined, fallback: string = ''): string {
		if (Array.isArray(param)) {
			return param[0] || fallback;
		}
		return param || fallback;
	}

	useEffect(() => {
		setUseLiveLocation(false);
	}, []);

	// Parse location data from params and update context
	useEffect(() => {
		if (!useLiveLocation) {
			const newCurrentLocation = {
				latitude: parseFloat(getParamAsString(params.currentLat, "-25.7479")),
				longitude: parseFloat(getParamAsString(params.currentLng, "28.2293")),
				name: getParamAsString(params.currentName, "Current Location")
			};

			const newDestination = {
				latitude: parseFloat(getParamAsString(params.destinationLat, "-25.7824")),
				longitude: parseFloat(getParamAsString(params.destinationLng, "28.2753")),
				name: getParamAsString(params.destinationName, "")
			};

			if (
				isNaN(newCurrentLocation.latitude) || isNaN(newCurrentLocation.longitude) ||
				isNaN(newDestination.latitude) || isNaN(newDestination.longitude)
			) {
				console.warn('Invalid coordinates detected, skipping update');
				return;
			}

			setCurrentLocation(newCurrentLocation);
			setDestination(newDestination);
		} else if (streamedLocation) {
			// Use live location when available
			setCurrentLocation({
				latitude: streamedLocation.latitude,
				longitude: streamedLocation.longitude,
				name: "Your Live Location"
			});
		}
	}, [useLiveLocation, streamedLocation]);

	const vehicleInfo = {
		plate: getParamAsString(params.plate, "Unknown"),
		time: getParamAsString(params.time, "Unknown"),
		seats: getParamAsString(params.seats, "0"),
		price: getParamAsString(params.price, "0"),
		selectedVehicleId: getParamAsString(params.selectedVehicleId, ""),
		userId: getParamAsString(params.userId, ""),
	};

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
	const getRoute = async (origin: { latitude: number; longitude: number; name: string }, dest: { latitude: number; longitude: number; name: string }) => {
		// Validate coordinates
		if (!origin || !dest) {
			console.warn('Invalid coordinates provided to getRoute');
			return;
		}
		
		if (origin.latitude === 0 && origin.longitude === 0) {
			console.warn('Origin coordinates are (0,0) - waiting for valid location');
			return;
		}
		
		if (dest.latitude === 0 && dest.longitude === 0) {
			console.warn('Destination coordinates are (0,0) - invalid destination');
			return;
		}

		if (!GOOGLE_MAPS_API_KEY) {
			console.error('Google Maps API key is not configured');
			return;
		}

		const routeKey = `${origin.latitude},${origin.longitude}-${dest.latitude},${dest.longitude}`;
		
		// Check cache first
		const cachedRoute = getCachedRoute(routeKey);
		if (cachedRoute) {
			setRouteCoordinates(cachedRoute);
			setRouteLoaded(true);
			return;
		}

		setIsLoadingRoute(true);
		setRouteLoaded(false);
		
		try {
			const originStr = `${origin.latitude},${origin.longitude}`;
			const destinationStr = `${dest.latitude},${dest.longitude}`;
			
			const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;
			
			console.log('Fetching route from:', url);
			console.log('Platform:', Platform.OS);
			
			const response = await fetch(url);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('HTTP Error Response:', response.status, errorText);
				throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
			}
			
			const data = await response.json();
			
			console.log('Directions API response status:', data.status);
			
			if (data.status !== 'OK') {
				console.error('Directions API Error:', data);
				throw new Error(`Directions API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
			}
			
			if (data.routes && data.routes.length > 0) {
				const route = data.routes[0];
				
				if (!route.overview_polyline || !route.overview_polyline.points) {
					throw new Error('No polyline data in route');
				}
				
				const decodedCoords = decodePolyline(route.overview_polyline.points);
				console.log('Decoded coordinates count:', decodedCoords.length);
				
				// Cache the route
				setCachedRoute(routeKey, decodedCoords);
				
				setRouteCoordinates(decodedCoords);
				setRouteLoaded(true);
				
				// Fit the map to show the entire route
				const coordinates = [
					{ latitude: origin.latitude, longitude: origin.longitude },
					{ latitude: dest.latitude, longitude: dest.longitude },
					...decodedCoords
				];
				mapRef.current?.fitToCoordinates(coordinates, {
					edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
					animated: true,
				});
			} else {
				throw new Error('No routes found');
			}
		} catch (error) {
			console.error('Error fetching route:', error);
			
			// Fallback: use straight line between origin and destination
			console.log('Falling back to straight line route');
			const fallbackRoute = [
				{ latitude: origin.latitude, longitude: origin.longitude },
				{ latitude: dest.latitude, longitude: dest.longitude }
			];
			setRouteCoordinates(fallbackRoute);
			setRouteLoaded(true);
			
			// Center the map to show both points
			if (mapRef.current) {
				mapRef.current.fitToCoordinates(fallbackRoute, {
					edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
					animated: true,
				});
			}
		} finally {
			setIsLoadingRoute(false);
		}
	};

	// Dynamic route calculation based on map mode
	useEffect(() => {
		if (!currentLocation || !destination) return;

		switch (mapMode) {
			case 'initial':
				// Original route: passenger origin -> destination
				if (!routeLoaded && !isLoadingRoute) {
					getRoute(currentLocation, destination);
				}
				break;
				
			case 'to_driver':
				// Route from passenger live location to driver location
				if (driverLocation && streamedLocation) {
					const passengerLiveLocation = {
						latitude: streamedLocation.latitude,
						longitude: streamedLocation.longitude,
						name: "Your Location"
					};
					const driverLocationFormatted = {
						latitude: driverLocation.latitude,
						longitude: driverLocation.longitude,
						name: "Driver Location"
					};
					getRoute(passengerLiveLocation, driverLocationFormatted);
				}
				break;
				
			case 'to_destination':
				// Route from passenger origin to final destination
				if (streamedLocation) {
					const passengerLiveLocation = {
						latitude: streamedLocation.latitude,
						longitude: streamedLocation.longitude,
						name: "Your Location"
					};
					getRoute(passengerLiveLocation, destination);
				}
				break;
		}
	}, [mapMode, currentLocation, destination, driverLocation, streamedLocation, routeLoaded, isLoadingRoute]);

	// Initial fit to route when route or destination changes
	useEffect(() => {
		if (
			routeCoordinates.length > 0 &&
			currentLocation &&
			destination &&
			mapRef.current &&
			!hasFittedRoute
		) {
			mapRef.current.fitToCoordinates(
				[
					{ latitude: currentLocation.latitude, longitude: currentLocation.longitude },
					{ latitude: destination.latitude, longitude: destination.longitude },
					...routeCoordinates,
				],
				{
					edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
					animated: true,
				}
			);
			setHasFittedRoute(true);
			setIsFollowing(true);
		}
	}, [routeCoordinates, currentLocation, destination, hasFittedRoute]);

	// Reset fit when route or destination changes
	useEffect(() => {
		setHasFittedRoute(false);
	}, [destination, routeCoordinates]);

	// Live tracking: follow user when ride is started/in_progress and isFollowing
	useEffect(() => {
		if (
			(rideStatus === 'started' || rideStatus === 'in_progress') &&
			isFollowing &&
			mapRef.current &&
			streamedLocation
		) {
			mapRef.current.animateToRegion(
				{
					latitude: streamedLocation.latitude,
					longitude: streamedLocation.longitude,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				},
				500
			);
		}
	}, [streamedLocation, rideStatus, isFollowing]);

	// Handle notifications effect
	useEffect(() => {
		// Handle proximity notifications from backend
		const proximityNotifications = [
			{ type: 'driver_10min_away', message: 'Driver is 10 minutes away!' },
			{ type: 'driver_5min_away', message: 'Driver is 5 minutes away!' },
			{ type: 'driver_arrived', message: 'Driver has arrived at your location!' }
		];

		proximityNotifications.forEach(({ type, message }) => {
			const notification = notifications.find(n => n.type === type && !n.isRead);
			if (notification) {
				Alert.alert('Driver Update', message, [
					{ text: 'OK', onPress: () => markAsRead(notification._id) }
				]);
			}
		});

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
						onPress: () => {
							markAsRead(rideStarted._id);
						},
						style: 'default',
					},
				],
				{ cancelable: false }
			);
			return;
		} 

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
							router.push('/HomeScreen');
						},
						style: 'default',
					},
				],
				{ cancelable: false }
			);
		}
	}, [notifications, markAsRead, router]);

	useEffect(() => {
		if (taxiInfoError && !hasShownDeclinedAlert) {
			Alert.alert(
				'Ride Declined',
				'No active reservation found. Your ride may have been cancelled or declined.',
				[
					{
						text: 'OK',
						onPress: () => {
							setHasShownDeclinedAlert(true);
							router.push('/HomeScreen');
						},
						style: 'default',
					},
				],
				{ cancelable: false }
			);
		}
	}, [taxiInfoError, hasShownDeclinedAlert]);

	const handleStartRide = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		try {
			await startRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
		} catch (error: any) {
			Alert.alert('Error', error?.message || 'Failed to start ride.');
		}
	};

	const handleEndRide = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		try {
			await endRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			Alert.alert('Success', 'Ride ended!');
			router.push('/HomeScreen');
		} catch (error: any) {
			Alert.alert('Error', error?.message || 'Failed to end ride.');
		}
	};

	const handleCancelRequest = async () => { //this for when user wants to cancel the ride request
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		try {
			await cancelRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			Alert.alert('Success', 'Ride cancelled.');
			router.push('/HomeScreen');
		} catch (error: any) {
			Alert.alert('Error', error?.message || 'Failed to cancel ride.');
		}
	};

	// Create dynamic styles based on theme
	const dynamicStyles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		scrollView: {
			flex: 1,
			backgroundColor: theme.background,
		},
		loadingContainer: {
			flex: 1, 
			justifyContent: 'center', 
			alignItems: 'center'
		},
		loadingText: {
			color: theme.text
		},
		arrivalTimeOverlay: {
			position: "absolute",
			top: 50,
			left: 0,
			right: 0,
			alignItems: "center",
			flexDirection: "row",
			justifyContent: "center",
			paddingHorizontal: 20,
		},
		arrivalTimeBox: {
			backgroundColor: isDark ? theme.surface : "#121212",
			borderRadius: 30,
			paddingVertical: 16,
			paddingHorizontal: 20,
			marginRight: 10,
		},
		arrivalTimeText: {
			color: isDark ? theme.text : "#FFFFFF",
			fontSize: 13,
			fontWeight: "bold",
			textAlign: "center",
		},
		routeLoadingText: {
			color: isDark ? theme.text : "#FFFFFF",
			fontSize: 11,
			fontStyle: 'italic',
			textAlign: "center",
			marginTop: 4,
		},
		mapModeIndicator: {
			backgroundColor: "#FFFFFF",
			borderRadius: 30,
			paddingVertical: 16,
			paddingHorizontal: 20,
			shadowColor: theme.shadow,
			shadowOpacity: 0.15,
			shadowOffset: { width: 0, height: 2 },
			shadowRadius: 4,
			elevation: 4,
		},
		mapModeText: {
			fontSize: 13,
			fontWeight: "bold",
			color: "#000000",
			textAlign: "center",
		},
		locationStreamingStatus: {
			position: 'absolute',
			top: 140,
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
		},
		locationStreamingText: {
			fontSize: 11,
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
		bottomSection: {
			alignItems: "center",
			backgroundColor: theme.surface,
			borderRadius: 30,
			paddingTop: 47,
			paddingBottom: 60,
		},
		driverDetailsHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 33,
			width: '100%',
		},
		driverDetailsTitle: {
			color: theme.textSecondary,
			fontSize: 16,
			fontWeight: "bold",
			flex: 1,
		},
		contactButton: {
			width: 35,
			height: 35,
			backgroundColor: isDark ? theme.primary : "#121212",
			borderRadius: 17.5,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 5,
		},
		driverInfoSection: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 36,
			width: '100%',
			paddingHorizontal: 15,
		},
		driverAvatar: {
			width: 60,
			height: 60,
			backgroundColor: isDark ? theme.primary : "#121212",
			borderRadius: 30,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 11,
		},
		driverName: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "bold",
			marginBottom: 1,
		},
		driverVehicle: {
			color: theme.textSecondary,
			fontSize: 12,
			fontWeight: "bold",
		},
		ratingText: {
			color: theme.text,
			fontSize: 12,
			fontWeight: "bold",
			marginRight: 3,
		},
		licensePlateSection: {
			flexDirection: "row",
			marginBottom: 26,
			width: '100%',
			paddingHorizontal: 35,
			justifyContent: 'space-between',
		},
		licensePlateLabel: {
			color: theme.textSecondary,
			fontSize: 13,
			fontWeight: "bold",
		},
		licensePlateValue: {
			color: theme.textSecondary,
			fontSize: 13,
			fontWeight: "bold",
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
		actionButtonsContainer: {
			width: '100%',
			alignItems: 'center',
			marginTop: 10,
		},
		startRideButton: {
			alignItems: "center",
			backgroundColor: theme.primary,
			borderRadius: 30,
			paddingVertical: 24,
			width: 330,
			marginBottom: 15,
		},
		startRideButtonText: {
			color: isDark ? "#121212" : "#FFFFFF",
			fontSize: 20,
			fontWeight: "bold",
		},
		cancelButton: {
			alignItems: "center",
			backgroundColor: isDark ? "#FF4444" : "#FF6B6B",
			borderRadius: 30,
			paddingVertical: 24,
			width: 330,
		},
		cancelButtonText: {
			color: "#FFFFFF",
			fontSize: 20,
			fontWeight: "bold",
		},
	});

	// Early return for loading state - but ensure all hooks are called first
	if (!currentLocation || !destination) {
		return (
			<SafeAreaView style={dynamicStyles.container}>
				<View style={dynamicStyles.loadingContainer}>
					<Text style={dynamicStyles.loadingText}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	// Determine which location to show for current position based on map mode
	const displayLocation = useLiveLocation && streamedLocation ? {
		latitude: streamedLocation.latitude,
		longitude: streamedLocation.longitude,
		name: "Your Live Location"
	} : currentLocation;

	// Determine markers based on map mode
	const getMapMarkers = () => {
		const markers = [];

		switch (mapMode) {
			case 'initial':
				markers.push(
					<Marker
						key="passenger"
						coordinate={displayLocation}
						title="You are here"
						pinColor="blue"
					/>,
					<Marker
						key="destination"
						coordinate={destination}
						title={destination.name}
						pinColor="orange"
					/>
				);
				break;

			case 'to_driver':
				if (streamedLocation) {
					markers.push(
						<Marker
							key="passenger-live"
							coordinate={{
								latitude: streamedLocation.latitude,
								longitude: streamedLocation.longitude
							}}
							title="Your Location"
							pinColor="blue"
						/>
					);
				}
				if (driverLocation) {
					markers.push(
						<Marker
							key="driver"
							coordinate={driverLocation}
							title="Driver Location"
							pinColor="green"
						/>
					);
				}
				break;

			case 'to_destination':
				if (streamedLocation) {
					markers.push(
						<Marker
							key="passenger-live"
							coordinate={{
								latitude: streamedLocation.latitude,
								longitude: streamedLocation.longitude
							}}
							title="Your Location"
							pinColor="blue"
						/>
					);
				}
				markers.push(
					<Marker
						key="destination"
						coordinate={destination}
						title={destination.name}
						pinColor="orange"
					/>
				);
				break;
		}

		return markers;
	};

	// Get map mode display text
	const getMapModeText = () => {
		switch (mapMode) {
			case 'initial':
				return 'To Destination';
			case 'to_driver':
				return 'To Driver';
			case 'to_destination':
				return 'To Destination';
			default:
				return '';
		}
	};

	return (
		<SafeAreaView style={dynamicStyles.container}>
			<ScrollView style={dynamicStyles.scrollView}>
				<View>
					{/* Map Section with Route */}
					<View style={{ height: 300, position: 'relative' }}>
						<MapView
							ref={mapRef}
							style={{ flex: 1 }}
							provider={PROVIDER_GOOGLE}
							initialRegion={{
								latitude: (displayLocation.latitude + destination.latitude) / 2,
								longitude: (displayLocation.longitude + destination.longitude) / 2,
								latitudeDelta: Math.abs(displayLocation.latitude - destination.latitude) * 2 + 0.01,
								longitudeDelta: Math.abs(displayLocation.longitude - destination.longitude) * 2 + 0.01,
							}}
							customMapStyle={isDark ? darkMapStyle : []}
							onPanDrag={() => setIsFollowing(false)}
							onRegionChangeComplete={() => setIsFollowing(false)}
						>
							{getMapMarkers()}
							{/* Render the route polyline */}
							{routeCoordinates.length > 0 && (
								<Polyline
									coordinates={routeCoordinates}
									strokeColor={theme.primary}
									strokeWidth={4}
								/>
							)}
						</MapView>

						{/* Arrival Time Overlay */}
						<View style={dynamicStyles.arrivalTimeOverlay}>
							<View style={dynamicStyles.arrivalTimeBox}>
								<Text style={dynamicStyles.arrivalTimeText}>
									{vehicleInfo.time}
								</Text>
								{isLoadingRoute && (
									<Text style={dynamicStyles.routeLoadingText}>
										Loading route...
									</Text>
								)}
							</View>

							{/* Map Mode Indicator */}
							{mapMode !== 'initial' && (
								<View style={dynamicStyles.mapModeIndicator}>
									<Text style={dynamicStyles.mapModeText}>
										{getMapModeText()}
									</Text>
								</View>
							)}
						</View>

						{/* Live Location Streaming Status for Passengers */}
						{useLiveLocation && (
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
						)}
					</View>

					<View style={dynamicStyles.bottomSection}>
						<View style={dynamicStyles.driverDetailsHeader}>
							<View style={{ width: 20, height: 20, marginRight: 3 }}></View>
							<Text style={dynamicStyles.driverDetailsTitle}>
								{"Driver Details"}
							</Text>
							<View style={dynamicStyles.contactButton}>
								<Icon name="call" size={18} color={isDark ? "#121212" : "#FF9900"} />
							</View>
							<View style={[dynamicStyles.contactButton, { marginRight: 10 }]}>
								<Icon name="chatbubble" size={18} color={isDark ? "#121212" : "#FF9900"} />
							</View>
						</View>
						
						{!taxiInfoError && (
							<View style={dynamicStyles.driverInfoSection}>
								<View style={dynamicStyles.driverAvatar}>
									<Icon name="person" size={30} color={isDark ? "#121212" : "#FF9900"} />
								</View>
								<View style={{ marginRight: 35 }}>
									<Text style={dynamicStyles.driverName}>
										{taxiInfo?.driver?.name || "Tshepo Mthembu"}
									</Text>
									<Text style={dynamicStyles.driverVehicle}>
										{taxiInfo?.taxi?.model || "Hiace-Sesfikile"}
									</Text>
									<TouchableOpacity onPress={() => router.push({pathname: '/TaxiInfoPage', params: { userId: vehicleInfo.userId }})}>
										<Icon name="information-circle" size={30} color={isDark ? "#121212" : "#FF9900"} />
									</TouchableOpacity>
								</View>
								<Text style={dynamicStyles.ratingText}>
									{taxiInfo?.driver?.rating?.toFixed(1) || "5.0"}
								</Text>
								{[1, 2, 3, 4, 5].map((star, index) => (
									<Icon key={index} name="star" size={12} color={theme.primary} style={{ marginRight: 1 }} />
								))}
							</View>
						)}
						
						{/* Location Box - Start and Destination */}
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
									{mapMode === 'to_driver' ? 'Driver Location' : destination.name}
								</Text>
							</View>
						</View>
						
						{/* Action Buttons */}
						<View style={dynamicStyles.actionButtonsContainer}>
							{/* Before ride is accepted: show only Cancel Request */}
							{rideStatus === 'requested' && (
								<TouchableOpacity 
									style={dynamicStyles.cancelButton} 
									onPress={handleCancelRequest}>
									<Text style={dynamicStyles.cancelButtonText}>
										{"Cancel Request"}
									</Text>
								</TouchableOpacity>
							)}
							{/* When ride is accepted and not started: show both Start Ride and Cancel Request */}
							{rideStatus === 'accepted' && (
								<>
									<TouchableOpacity 
										style={dynamicStyles.startRideButton} 
										onPress={handleStartRide}>
										<Text style={dynamicStyles.startRideButtonText}>
											{"Start Ride"}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity 
										style={dynamicStyles.cancelButton} 
										onPress={handleCancelRequest}>
										<Text style={dynamicStyles.cancelButtonText}>
											{"Cancel Request"}
										</Text>
									</TouchableOpacity>
								</>
							)}
							{/* Only show End Ride when ride is started or in progress */}
							{(rideStatus === 'started' || rideStatus === 'in_progress') && (
								<TouchableOpacity 
									style={dynamicStyles.startRideButton} 
									onPress={handleEndRide}>
									<Text style={dynamicStyles.startRideButtonText}>
										{"End Ride"}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>
			</ScrollView>
			{!isFollowing && (
				<TouchableOpacity
					style={{ position: 'absolute', bottom: 120, right: 30, backgroundColor: theme.primary, borderRadius: 25, padding: 12, zIndex: 10 }}
					onPress={() => setIsFollowing(true)}
				>
					<Icon name="locate" size={24} color={isDark ? '#121212' : '#fff'} />
				</TouchableOpacity>
			)}
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