import React, { useLayoutEffect, useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform, Alert } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { router } from 'expo-router';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useMapContext, createRouteKey } from '../../contexts/MapContext';
import { useUser } from '../../contexts/UserContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useThrottledLocationStreaming } from '../hooks/useLocationStreaming';
import { useProximityTimer } from '../hooks/useProximityTimer';
import * as Location from 'expo-location';
import { FontAwesome } from "@expo/vector-icons";

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

	// Fetch taxi and driver info for the current reservation using Convex
	let taxiInfo: { rideId?: string; status?: string; driver?: any; taxi?: any; rideDocId?: string; ridePin?: string; } | undefined, taxiInfoError: unknown;
	try {
		taxiInfo = useQuery(
			api.functions.taxis.viewTaxiInfo.viewTaxiInfo,
			user ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
		);
	} catch (err) {
		taxiInfoError = err;
	}

	const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
	const endRide = useMutation(api.functions.rides.endRide.endRide);

	// Helper to determine ride status
	const rideStatus = taxiInfo?.status as 'requested' | 'accepted' | 'in_progress' | 'started' | 'completed' | 'cancelled' | undefined;
	const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);

	const [hasFittedRoute, setHasFittedRoute] = useState(false);
	const [isFollowing, setIsFollowing] = useState(true);
	const [currentPin, setCurrentPin] = useState<string | null>(null);
	const [isRouteCalculating, setIsRouteCalculating] = useState(false); // Prevent multiple simultaneous route calculations

	const passengerId = user?.id;
	const rideId = taxiInfo?.rideDocId;
	const driverId = taxiInfo?.driver?.userId;

	// Remove averageRating usage if not available
	const [rideJustEnded, setRideJustEnded] = useState(false);

	const startTripConvex = useMutation(api.functions.earnings.startTrip.startTrip);
	const endTripConvex = useMutation(api.functions.earnings.endTrip.endTrip);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: false
		});
	}, [navigation]);

	// Simple PIN generation for demo purposes
	useEffect(() => {
		if (rideStatus === 'accepted' && !currentPin) {
			// Get PIN from ride data or use demo PIN
			const ridePin = taxiInfo?.ridePin || "1234";
			setCurrentPin(ridePin);
		}
	}, [rideStatus, currentPin, taxiInfo?.ridePin]);

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
			const rawCurrentLat = getParamAsString(params.currentLat);
			const rawCurrentLng = getParamAsString(params.currentLng);
			const rawDestLat = getParamAsString(params.destinationLat);
			const rawDestLng = getParamAsString(params.destinationLng);

			console.log('Params:', { rawCurrentLat, rawCurrentLng, rawDestLat, rawDestLng });

			const currentLat = parseFloat(rawCurrentLat);
			const currentLng = parseFloat(rawCurrentLng);
			const destLat = parseFloat(rawDestLat);
			const destLng = parseFloat(rawDestLng);

			if (
				isNaN(currentLat) || isNaN(currentLng) ||
				isNaN(destLat) || isNaN(destLng)
			) {
				console.warn('Skipping update due to invalid coordinates.');
				return;
			}

			setCurrentLocation({
				latitude: currentLat,
				longitude: currentLng,
				name: getParamAsString(params.currentName, "Current Location")
			});
			setDestination({
				latitude: destLat,
				longitude: destLng,
				name: getParamAsString(params.destinationName, "")
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

	// FIXED: Stabilized route calculation with proper error handling and debouncing
	const getRoute = useCallback(async (origin: { latitude: number; longitude: number; name: string }, dest: { latitude: number; longitude: number; name: string }) => {
		// Prevent multiple simultaneous route calculations
		if (isRouteCalculating) {
			console.log('Route calculation already in progress, skipping...');
			return;
		}

		// Validate coordinates with better error handling
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

		// Additional validation for reasonable coordinate ranges
		if (Math.abs(origin.latitude) > 90 || Math.abs(origin.longitude) > 180 ||
			Math.abs(dest.latitude) > 90 || Math.abs(dest.longitude) > 180) {
			console.warn('Coordinates out of valid range');
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
			console.log('Using cached route');
			setRouteCoordinates(cachedRoute);
			setRouteLoaded(true);
			return;
		}

		setIsRouteCalculating(true);
		setIsLoadingRoute(true);
		setRouteLoaded(false);
		
		try {
			const originStr = `${origin.latitude},${origin.longitude}`;
			const destinationStr = `${dest.latitude},${dest.longitude}`;
			
			const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;
			
			console.log('Fetching route from:', url);
			
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
				
				// FIXED: Safer map fitting with existence check
				if (mapRef.current) {
					const coordinates = [
						{ latitude: origin.latitude, longitude: origin.longitude },
						{ latitude: dest.latitude, longitude: dest.longitude },
						...decodedCoords
					];
					
					// Use setTimeout to ensure map is ready
					setTimeout(() => {
						if (mapRef.current) {
							mapRef.current.fitToCoordinates(coordinates, {
								edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
								animated: true,
							});
						}
					}, 100);
				}
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
			
			// FIXED: Safer fallback map fitting
			if (mapRef.current) {
				setTimeout(() => {
					if (mapRef.current) {
						mapRef.current.fitToCoordinates(fallbackRoute, {
							edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
							animated: true,
						});
					}
				}, 100);
			}
		} finally {
			setIsLoadingRoute(false);
			setIsRouteCalculating(false); // Always reset this flag
		}
	}, []); // FIXED: Empty dependency array to prevent function recreation

	// FIXED: More aggressive debouncing and route calculation control
	useEffect(() => {
		if (!currentLocation || !destination) return;
		if (isRouteCalculating) {
			console.log('Route calculation in progress, skipping effect');
			return;
		}

		let timeoutId: ReturnType<typeof setTimeout>;
		let isEffectActive = true; // Track if effect is still active

		const calculateRoute = () => {
			// Double-check if effect is still active and not calculating
			if (!isEffectActive || isRouteCalculating) {
				console.log('Effect cancelled or calculation in progress');
				return;
			}

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
						
						// FIXED: Only calculate if driver location changed significantly
						const currentRouteKey = `${passengerLiveLocation.latitude},${passengerLiveLocation.longitude}-${driverLocationFormatted.latitude},${driverLocationFormatted.longitude}`;
						
						// Check if we already have this exact route
						if (!getCachedRoute(currentRouteKey)) {
							getRoute(passengerLiveLocation, driverLocationFormatted);
						} else {
							console.log('Using existing cached route for driver location');
						}
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
		};

		// FIXED: Increased debounce time to 1000ms for more stability
		timeoutId = setTimeout(calculateRoute, 1000);

		return () => {
			isEffectActive = false; // Mark effect as inactive
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [mapMode, currentLocation, destination, driverLocation, streamedLocation, routeLoaded, isLoadingRoute, isRouteCalculating]); // Added isRouteCalculating to dependencies

	// Initial fit to route when route or destination changes
	useEffect(() => {
		if (
			routeCoordinates.length > 0 &&
			currentLocation &&
			destination &&
			mapRef.current &&
			!hasFittedRoute
		) {
			// FIXED: Added safety check and timeout
			setTimeout(() => {
				if (mapRef.current && !hasFittedRoute) {
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
			}, 200);
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
			// FIXED: Added safety check
			setTimeout(() => {
				if (mapRef.current && isFollowing) {
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
			}, 100);
		}
	}, [streamedLocation, rideStatus, isFollowing]);

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

		return () => {
			clearInterval(updateLocationInterval); // Ensure cleanup
		};
	}, [user?.id, streamedLocation]);

	// FIXED: Safer driver location updates with validation
	useEffect(() => {
		if (rideStatus === 'accepted' && taxiInfo?.driver) {
			try {
				// Integrate here: Query driver's live location
				// const driverLiveLocation = useQuery(api.functions.locations.getDriverLocation, {
				//   driverId: taxiInfo.driver.id
				// });
				
				// Mock driver location for demonstration - with validation
				const currentLat = parseFloat(getParamAsString(params.currentLat, "-25.7479"));
				const currentLng = parseFloat(getParamAsString(params.currentLng, "28.2293"));
				
				if (!isNaN(currentLat) && !isNaN(currentLng)) {
					const mockDriverLocation = {
						latitude: currentLat + 0.01,
						longitude: currentLng + 0.01
					};
					
					// Only update if significantly different to prevent unnecessary re-renders
					setDriverLocation(prev => {
						if (!prev || 
							Math.abs(prev.latitude - mockDriverLocation.latitude) > 0.0001 ||
							Math.abs(prev.longitude - mockDriverLocation.longitude) > 0.0001) {
							console.log('Updating driver location:', mockDriverLocation);
							return mockDriverLocation;
						}
						return prev;
					});
				}
			} catch (error) {
				console.error('Error updating driver location:', error);
			}
		}
	}, [rideStatus, taxiInfo?.driver, params.currentLat, params.currentLng]);

	// Handle map mode transitions
	useEffect(() => {
		if (rideStatus === 'accepted' && mapMode === 'initial') {
			console.log('Switching to driver mode');
			setMapMode('to_driver');
			setUseLiveLocation(true);
		} else if ((rideStatus === 'started' || rideStatus === 'in_progress') && mapMode === 'to_driver') {
			console.log('Switching to destination mode');
			setMapMode('to_destination');
		}
	}, [rideStatus, mapMode]);

	// Safety check - early return if essential data is missing
	if (!user) {
		return (
			<SafeAreaView style={{flex: 1, backgroundColor: theme.background}}>
				<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
					<Text style={{color: theme.text}}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	const handleEndRide = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		try {
			await endRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			Alert.alert('Success', 'Ride ended!');
			const result = await endTripConvex({
				passengerId: user.id as Id<'taxiTap_users'>,
			});
			Alert.alert('Ride Ended', `Fare: R${result.fare}`);
			if (!currentLocation || !destination) {
				return;
			}
			router.push({
				pathname: './SubmitFeedback',
				params: {
					startName: currentLocation.name,
					endName: destination.name,
					passengerId: passengerId,
    				rideId: rideId,
					driverId: driverId,
				},
			});
			setRideJustEnded(true);
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
		pinContainer: {
			alignItems: "center",
			marginBottom: 15,
			padding: 12,
			backgroundColor: "transparent",
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "#FF9900",
			borderStyle: "dashed",
			width: '90%',
			alignSelf: 'center',
		},
		pinLabel: {
			fontSize: 12,
			fontWeight: "500",
			color: "#666666",
			marginBottom: 8,
			textAlign: "center",
			textTransform: "uppercase",
			letterSpacing: 0.5,
		},
		pinDisplay: {
			flexDirection: "row",
			justifyContent: "center",
			marginBottom: 6,
			alignItems: "center",
		},
		pinDigit: {
			width: 28,
			height: 32,
			backgroundColor: "#121212",
			borderRadius: 4,
			justifyContent: "center",
			alignItems: "center",
			marginHorizontal: 2,
			borderWidth: 1,
			borderColor: "#FF9900",
		},
		pinDigitText: {
			fontSize: 16,
			fontWeight: "bold",
			color: "#FF9900",
			fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
		},
		pinInstruction: {
			fontSize: 10,
			color: "#888888",
			textAlign: "center",
			fontStyle: "normal",
			fontWeight: "400",
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

	// FIXED: Safer marker generation with proper error handling
	const getMapMarkers = () => {
		const markers = [];

		try {
			switch (mapMode) {
				case 'initial':
					if (displayLocation && destination) {
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
					}
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
					if (destination) {
						markers.push(
							<Marker
								key="destination"
								coordinate={destination}
								title={destination.name}
								pinColor="orange"
							/>
						);
					}
					break;
			}
		} catch (error) {
			console.error('Error generating map markers:', error);
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
														<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<Text style={dynamicStyles.ratingText}>
									{(taxiInfo?.driver?.averageRating ?? 0).toFixed(1)}
								</Text>
								<View style={{ flexDirection: 'row', marginLeft: 4 }}>
									{[1, 2, 3, 4, 5].map((star, index) => {
										const full = (taxiInfo?.driver?.averageRating ?? 0) >= star;
										const half = (taxiInfo?.driver?.averageRating ?? 0) >= star - 0.5 && !full;

										return (
											<FontAwesome
												key={index}
												name={full ? "star" : half ? "star-half-full" : "star-o"}
												size={12}
												color={theme.primary}
												style={{ marginRight: 1 }}
											/>
										);
									})}
								</View>
							</View>
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
							{/* When ride is accepted: show PIN and Cancel Request */}
							{rideStatus === 'accepted' && (
								<>
									{/* PIN Display */}
									{currentPin && (
	<View style={dynamicStyles.pinContainer}>
		<Text style={dynamicStyles.pinLabel}>Safety PIN</Text>
		<View style={dynamicStyles.pinDisplay}>
			{currentPin.split('').map((digit, index) => (
				<View key={index} style={dynamicStyles.pinDigit}>
					<Text style={dynamicStyles.pinDigitText}>{digit}</Text>
				</View>
			))}
		</View>
		<Text style={dynamicStyles.pinInstruction}>
			Show to driver
		</Text>
		<TouchableOpacity 
		>
			
		</TouchableOpacity>
	</View>
)}
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
									style={dynamicStyles.cancelButton} 
									onPress={handleEndRide}>
									<Text style={dynamicStyles.cancelButtonText}>
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