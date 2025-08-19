import React, { useLayoutEffect, useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { router } from 'expo-router';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMapContext, createRouteKey } from '../../contexts/MapContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { FontAwesome } from "@expo/vector-icons";
import { useAlertHelpers } from '../../components/AlertHelpers';
import { useProximityAlerts } from '../../hooks/useProximityAlerts';
import { useThrottledLocationStreaming } from '../hooks/useLocationStreaming';

// Get platform-specific API key
const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios' 
  ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
  : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

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

export default function SeatReserved() {
	const [useLiveLocation, setUseLiveLocation] = useState(false);
	const params = useLocalSearchParams();
	const navigation = useNavigation();
	const { theme, isDark } = useTheme();
	const { user } = useUser();
	const { t } = useLanguage();
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
	const { showGlobalAlert, showGlobalError, showGlobalSuccess } = useAlertHelpers();

	const mapRef = useRef<MapView | null>(null);
	const processedNotificationsRef = useRef(new Set<string>());
	const isMonitoringRef = useRef(false);
	
	// Location streaming for passenger
	const { location: streamedLocation, error: locationStreamError } = useThrottledLocationStreaming(
		user?.id || '', 
		(user?.role as "passenger" | "driver" | "both") || 'passenger', 
		true
	);

	// State for tracking current map mode
	const [mapMode, setMapMode] = useState<'initial' | 'to_driver' | 'to_destination'>('initial');
	const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
	const [isRouteCalculating, setIsRouteCalculating] = useState(false);
	const [hasFittedRoute, setHasFittedRoute] = useState(false);
	const [isFollowing, setIsFollowing] = useState(true);
	const [hasShownDeclinedAlert, setHasShownDeclinedAlert] = useState(false);
	const [rideJustEnded, setRideJustEnded] = useState(false);
	
	// Fetch taxi and driver info for the current reservation using Convex
	// FIXED: Skip query when ride has ended to prevent continuous error logs
	let taxiInfo: { rideId?: string; status?: string; driver?: any; taxi?: any; rideDocId?: string; fare?: number; tripPaid?: boolean; } | undefined;
	let taxiInfoError: unknown;
	try {
		taxiInfo = useQuery(
			api.functions.taxis.viewTaxiInfo.viewTaxiInfo,
			user && !rideJustEnded ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
		);
	} catch (err) {
		taxiInfoError = err;
	}

	const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
	const endRide = useMutation(api.functions.rides.endRide.endRide);

	// Helper to determine ride status
	const rideStatus = taxiInfo?.status as 'requested' | 'accepted' | 'in_progress' | 'started' | 'completed' | 'cancelled' | undefined;
	const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);

	const passengerId = user?.id;
	const rideId = taxiInfo?.rideDocId;
	const driverId = taxiInfo?.driver?.userId;

	const endTripConvex = useMutation(api.functions.earnings.endTrip.endTrip);

	// Add proximity alerts hook
	const { startMonitoringRide, stopMonitoringRide, updateDriverLocation } = useProximityAlerts({
		enablePushNotifications: true,
		enableInAppAlerts: true,
		alertDistance: 3.0,
		arrivalDistance: 0.1,
		checkInterval: 30,
	});

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

	// Parse location data from params and update context - COMPLETELY ISOLATED
	useEffect(() => {
		const rawCurrentLat = getParamAsString(params.currentLat);
		const rawCurrentLng = getParamAsString(params.currentLng);
		const rawDestLat = getParamAsString(params.destinationLat);
		const rawDestLng = getParamAsString(params.destinationLng);

		// Only run once when component mounts if we have valid parameters
		if (rawCurrentLat && rawCurrentLng && rawDestLat && rawDestLng) {
			console.log('Setting initial locations from params:', { rawCurrentLat, rawCurrentLng, rawDestLat, rawDestLng });

			const currentLat = parseFloat(rawCurrentLat);
			const currentLng = parseFloat(rawCurrentLng);
			const destLat = parseFloat(rawDestLat);
			const destLng = parseFloat(rawDestLng);

			if (!isNaN(currentLat) && !isNaN(currentLng) && !isNaN(destLat) && !isNaN(destLng)) {
				// NEVER update these again after initial setting
				setCurrentLocation({
					latitude: currentLat,
					longitude: currentLng,
					name: getParamAsString(params.currentName, 'Pickup Location')
				});
				setDestination({
					latitude: destLat,
					longitude: destLng,
					name: getParamAsString(params.destinationName, 'Destination')
				});
			}
		}
	}, []); // NO DEPENDENCIES - run once only

	// Use streamed location when live location is enabled - FIXED: Don't overwrite currentLocation
	useEffect(() => {
		// Only set currentLocation from streamedLocation if we don't have any location data at all
		if (useLiveLocation && streamedLocation && !currentLocation && !destination) {
			console.log('Setting fallback locations from streamed data - no location data available');
			setCurrentLocation({
				latitude: streamedLocation.latitude,
				longitude: streamedLocation.longitude,
				name: "Your Current Location"
			});
		}
		
		// Remove the mock location logic entirely - it was causing confusion
	}, [useLiveLocation, streamedLocation, currentLocation, destination]);

	const vehicleInfo = {
		plate: getParamAsString(params.plate, t('passengerReservation:unknown')),
		time: getParamAsString(params.time, t('passengerReservation:unknown')),
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
	const getRoute = useCallback(async (origin: { latitude: number; longitude: number; name: string }, dest: { latitude: number; longitude: number; name: string }) => {
		if (isRouteCalculating) {
			console.log('Route calculation already in progress, skipping...');
			return;
		}

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
		
		const cachedRoute = getCachedRoute(routeKey);
		if (cachedRoute) {
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
				
				setCachedRoute(routeKey, decodedCoords);
				
				setRouteCoordinates(decodedCoords);
				setRouteLoaded(true);
			} else {
				throw new Error('No routes found');
			}
		} catch (error) {
			console.error('Error fetching route:', error);
			
			console.log('Falling back to straight line route');
			const fallbackRoute = [
				{ latitude: origin.latitude, longitude: origin.longitude },
				{ latitude: dest.latitude, longitude: dest.longitude }
			];
			setRouteCoordinates(fallbackRoute);
			setRouteLoaded(true);
		} finally {
			setIsLoadingRoute(false);
			setIsRouteCalculating(false);
		}
	}, [getCachedRoute, setCachedRoute, setRouteCoordinates, setRouteLoaded, setIsLoadingRoute]);

	// Route calculation control with map mode logic - FIXED: Added proper dependency management
	useEffect(() => {
		if (!currentLocation || !destination) return;
		if (isRouteCalculating) return;

		let timeoutId: ReturnType<typeof setTimeout>;
		let isEffectActive = true;

		const calculateRoute = () => {
			if (!isEffectActive || isRouteCalculating) return;

			console.log('Calculating route for mode:', mapMode, 'with streamedLocation:', !!streamedLocation);

			switch (mapMode) {
				case 'initial':
					// Original route: pickup origin -> destination
					if (!routeLoaded && !isLoadingRoute) {
						console.log('Initial route: origin -> destination');
						getRoute(currentLocation, destination);
					}
					break;
					
				case 'to_driver':
					// Route from phone's current location to pickup origin (where driver will meet passenger)
					if (streamedLocation) {
						console.log('Driver route: phone location -> pickup origin');
						const phoneLiveLocation = {
							latitude: streamedLocation.latitude,
							longitude: streamedLocation.longitude,
							name: "Your Current Location"
						};
						// currentLocation is the pickup origin point
						getRoute(phoneLiveLocation, currentLocation);
					}
					break;
					
				case 'to_destination':
					// Route from pickup origin to final destination (the original planned route)
					console.log('Destination route: pickup origin -> destination');
					getRoute(currentLocation, destination);
					break;
			}
		};

		timeoutId = setTimeout(calculateRoute, 1000);

		return () => {
			isEffectActive = false;
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [mapMode, currentLocation?.latitude, currentLocation?.longitude, destination?.latitude, destination?.longitude, streamedLocation?.latitude, streamedLocation?.longitude, routeLoaded, isLoadingRoute, getRoute, isRouteCalculating]);

	// FIXED: Improved map fitting logic to prevent incorrect recentering
	useEffect(() => {
		if (
			routeCoordinates.length > 0 &&
			currentLocation &&
			destination &&
			mapRef.current &&
			!hasFittedRoute
		) {
			// Different fitting logic based on map mode
			let coordinatesToFit: Array<{latitude: number, longitude: number}> = [];
			
			switch (mapMode) {
				case 'initial':
					coordinatesToFit = [
						{ latitude: currentLocation.latitude, longitude: currentLocation.longitude },
						{ latitude: destination.latitude, longitude: destination.longitude },
						...routeCoordinates,
					];
					break;
				case 'to_driver':
					if (streamedLocation) {
						coordinatesToFit = [
							{ latitude: streamedLocation.latitude, longitude: streamedLocation.longitude },
							{ latitude: currentLocation.latitude, longitude: currentLocation.longitude },
							...routeCoordinates,
						];
					}
					break;
				case 'to_destination':
					coordinatesToFit = [
						{ latitude: currentLocation.latitude, longitude: currentLocation.longitude },
						{ latitude: destination.latitude, longitude: destination.longitude },
						...routeCoordinates,
					];
					break;
			}

			if (coordinatesToFit.length > 0) {
				mapRef.current.fitToCoordinates(coordinatesToFit, {
					edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
					animated: true,
				});
				setHasFittedRoute(true);
				setIsFollowing(true);
			}
		}
	}, [routeCoordinates.length, currentLocation?.latitude, currentLocation?.longitude, destination?.latitude, destination?.longitude, hasFittedRoute, mapMode, streamedLocation?.latitude, streamedLocation?.longitude]);

	// Reset fit when route, destination, or map mode changes - FIXED: Prevent infinite loops
	const resetHasFittedRoute = useCallback(() => {
		setHasFittedRoute(false);
	}, []);

	useEffect(() => {
		resetHasFittedRoute();
	}, [destination?.latitude, destination?.longitude, routeCoordinates.length, mapMode, resetHasFittedRoute]);

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

	// Handle map mode transitions - FIXED: Prevent backwards transitions
	useEffect(() => {
		console.log('Map mode transition check:', { rideStatus, mapMode });
		
		if (rideStatus === 'accepted' && mapMode === 'initial') {
			console.log('Switching to driver mode');
			setMapMode('to_driver');
			setUseLiveLocation(true);
		} else if ((rideStatus === 'started' || rideStatus === 'in_progress') && mapMode !== 'to_destination') {
			console.log('Switching to destination mode');
			setMapMode('to_destination');
		}
		
		console.log('Current map mode:', mapMode, 'Ride status:', rideStatus);
	}, [rideStatus, mapMode]);

	// Driver location updates with validation - REMOVED HARDCODING
	useEffect(() => {
		if (rideStatus === 'accepted' && taxiInfo?.driver?.currentLocation) {
			try {
				const driverLoc = {
					latitude: taxiInfo.driver.currentLocation.latitude,
					longitude: taxiInfo.driver.currentLocation.longitude
				};
				
				setDriverLocation(prev => {
					if (!prev || 
						Math.abs(prev.latitude - driverLoc.latitude) > 0.0001 ||
						Math.abs(prev.longitude - driverLoc.longitude) > 0.0001) {
						return driverLoc;
					}
					return prev;
				});
			} catch (error) {
				console.error('Error updating driver location:', error);
			}
		}
	}, [rideStatus, taxiInfo?.driver?.currentLocation]);

	// Calculate ETA/proximity for display
	const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
		const R = 6371; // Earth's radius in kilometers
		const dLat = (lat2 - lat1) * (Math.PI / 180);
		const dLon = (lon2 - lon1) * (Math.PI / 180);
		const a = 
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
			Math.sin(dLon / 2) * Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	};

	const calculateETA = (distance: number, averageSpeed: number = 30): number => {
		return (distance / averageSpeed) * 60; // Returns minutes
	};

	const formatTime = (minutes: number): string => {
		if (minutes < 1) {
			return 'Less than 1 minute';
		}
		if (minutes < 60) {
			return `${Math.round(minutes)} minutes`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = Math.round(minutes % 60);
		return `${hours}h ${remainingMinutes}m`;
	};

	const getDisplayTime = (): string => {
		// Only calculate ETA if we have real driver location data from the backend
		if (driverLocation && currentLocation && rideStatus === 'accepted' && taxiInfo?.driver?.currentLocation) {
			const distance = calculateDistance(
				driverLocation.latitude,
				driverLocation.longitude,
				currentLocation.latitude,
				currentLocation.longitude
			);
			const eta = calculateETA(distance);
			return formatTime(eta);
		}
		
		// Fall back to the original time parameter or show appropriate message
		if (vehicleInfo.time && vehicleInfo.time !== t('passengerReservation:unknown')) {
			return vehicleInfo.time;
		}
		
		// Show different messages based on ride status
		if (rideStatus === 'requested') {
			return 'Waiting for driver...';
		} else if (rideStatus === 'accepted') {
			return 'Driver assigned';
		} else {
			return 'Calculating...';
		}
	};

	// Handle notifications effect using new alert system
	useEffect(() => {
		const rideStarted = notifications.find(
			n => n.type === 'ride_started' && 
				!n.isRead && 
				!processedNotificationsRef.current.has(n._id)
		);
		if (rideStarted) {
			processedNotificationsRef.current.add(rideStarted._id);

			showGlobalAlert({
				title: t('passengerReservation:rideStarted'),
				message: rideStarted.message,
				type: 'success',
				duration: 0,
				actions: [
					{
						label: t('passengerReservation:ok'),
						onPress: () => {
							markAsRead(rideStarted._id);
							if (!currentLocation || !destination) {
								return;
							}
						},
						style: 'default',
					},
				],
				position: 'top',
				animation: 'slide-down',
			});
			return;
		} 

		const rideDeclined = notifications.find(
		n => n.type === 'ride_declined' && 
			!n.isRead && 
			!processedNotificationsRef.current.has(n._id)
		);

		if (rideDeclined) {
			processedNotificationsRef.current.add(rideDeclined._id);
			
			showGlobalError(
				t('passengerReservation:rideDeclined'),
				rideDeclined.message || t('passengerReservation:rideDeclinedMessage'),
				{
					duration: 0,
					actions: [
						{
							label: t('passengerReservation:ok'),
							onPress: () => {
								markAsRead(rideDeclined._id);
								router.push('/HomeScreen');
							},
							style: 'default',
						},
					],
					position: 'top',
					animation: 'slide-down',
				}
			);
		}
	}, [notifications, markAsRead, router, t, currentLocation, destination, showGlobalAlert, showGlobalError]);

	useEffect(() => {
		// Don't show error alerts if the ride has ended or if we've already shown the alert
		if (rideJustEnded || hasShownDeclinedAlert) return;
		
		if (taxiInfoError) {
			console.log('TaxiInfo error detected:', taxiInfoError);
			
			// Only show error for legitimate ride declines, not after successful ride completion
			const errorMessage = taxiInfoError?.toString() || '';
			if (errorMessage.includes('No active reservation found')) {
				// This is expected after ride completion, don't show error
				console.log('No active reservation - ride likely completed successfully');
				return;
			}
			
			// Add a small delay to prevent immediate triggering after ride end
			const timeoutId = setTimeout(() => {
				if (!rideJustEnded && !hasShownDeclinedAlert) {
					showGlobalError(
						t('passengerReservation:rideDeclined'),
						t('passengerReservation:noActiveReservation'),
						{
							duration: 0,
							actions: [
								{
									label: t('passengerReservation:ok'),
									onPress: () => {
										setHasShownDeclinedAlert(true);
										router.push('/HomeScreen');
									},
									style: 'default',
								},
							],
							position: 'top',
							animation: 'slide-down',
						}
					);
				}
			}, 1000); // 1 second delay

			return () => clearTimeout(timeoutId);
		}
	}, [taxiInfoError, hasShownDeclinedAlert, rideJustEnded, t, router, showGlobalError]);

	// FIXED: Debounced proximity monitoring with ref tracking
	const startProximityMonitoring = useCallback(() => {
		if (rideStatus === 'accepted' && taxiInfo?.rideId && currentLocation && !rideJustEnded && !isMonitoringRef.current) {
			console.log('Started proximity monitoring for ride', taxiInfo.rideId);
			
			const driverLoc = {
				latitude: taxiInfo.driver?.currentLocation?.latitude || 0,
				longitude: taxiInfo.driver?.currentLocation?.longitude || 0,
			};

			const pickupLocation = {
				latitude: currentLocation.latitude,
				longitude: currentLocation.longitude,
			};

			startMonitoringRide({
				rideId: taxiInfo.rideId,
				driverId: taxiInfo.driver?.userId || '',
				passengerId: user?.id || '',
				driverLocation: driverLoc,
				pickupLocation,
			});
			
			isMonitoringRef.current = true;
		}
	}, [rideStatus, taxiInfo?.rideId, currentLocation, user?.id, rideJustEnded, startMonitoringRide, taxiInfo?.driver]);

	useEffect(() => {
		if (rideStatus === 'accepted' && !isMonitoringRef.current) {
			startProximityMonitoring();
		}
		
		if (rideStatus !== 'accepted' && isMonitoringRef.current && taxiInfo?.rideId) {
			console.log('Stopped proximity monitoring for ride', taxiInfo.rideId);
			stopMonitoringRide(taxiInfo.rideId);
			isMonitoringRef.current = false;
		}
	}, [rideStatus, startProximityMonitoring, taxiInfo?.rideId, stopMonitoringRide]);

	// Update driver location when we receive location updates
	useEffect(() => {
		if (rideStatus === 'accepted' && taxiInfo?.rideId && taxiInfo?.driver?.currentLocation && isMonitoringRef.current) {
			updateDriverLocation(taxiInfo.rideId, {
				latitude: taxiInfo.driver.currentLocation.latitude,
				longitude: taxiInfo.driver.currentLocation.longitude,
			});
		}
	}, [taxiInfo?.driver?.currentLocation, rideStatus, taxiInfo?.rideId, updateDriverLocation]);

	// Driver contact functions - REMOVED HARDCODED PHONE NUMBER
	const handleCall = () => {
		const phoneNumber = taxiInfo?.driver?.phoneNumber || taxiInfo?.driver?.phone;
		if (phoneNumber) {
			Linking.openURL(`tel:${phoneNumber}`);
		} else {
			showGlobalError('Error', 'Driver phone number not available.', {
				duration: 3000,
				position: 'top',
				animation: 'slide-down',
			});
		}
	};

	const handleMessage = () => {
		const phoneNumber = taxiInfo?.driver?.phoneNumber || taxiInfo?.driver?.phone;
		if (phoneNumber) {
			Linking.openURL(`sms:${phoneNumber}`);
		} else {
			showGlobalError('Error', 'Driver phone number not available.', {
				duration: 3000,
				position: 'top',
				animation: 'slide-down',
			});
		}
	};

	// Open Google Maps with route
	const openGoogleMaps = () => {
		if (!streamedLocation || !destination) return;
		
		const origin = `${streamedLocation.latitude},${streamedLocation.longitude}`;
		const dest = `${destination.latitude},${destination.longitude}`;
		const url = `https://www.google.com/maps/dir/${origin}/${dest}`;
		
		Linking.openURL(url);
	};

	const handleStartRide = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			showGlobalError('Error', 'No ride or user information available.', {
				duration: 4000,
				position: 'top',
				animation: 'slide-down',
			});
			return;
		}
		
		router.push({
			pathname: '/PassengerPinEntry',
			params: {
				driverName: taxiInfo?.driver?.name || 'Unknown Driver',
				licensePlate: taxiInfo?.taxi?.licensePlate || 'Unknown Plate',
				fare: taxiInfo?.fare?.toString() || '0',
				rideId: taxiInfo?.rideId,
				startName: currentLocation?.name || 'Current Location',
				endName: destination?.name || 'Destination',
				driverId: driverId || '',
			},
		});
	};

	const handleEndRide = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			showGlobalError('Error', 'No ride or user information available.', {
				duration: 4000,
				position: 'top',
				animation: 'slide-down',
			});
			return;
		}
		try {
			// Set this FIRST to prevent the error alert from triggering
			setRideJustEnded(true);
			setHasShownDeclinedAlert(true); // Also set this to prevent any error alerts
			
			await endRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			
			const result = await endTripConvex({
				passengerId: user.id as Id<'taxiTap_users'>,
			});

			// Check if payment has already been confirmed (tripPaid === true)
			const hasAlreadyPaid = taxiInfo.tripPaid === true;

			if (hasAlreadyPaid) {
				// User has already paid, go directly to feedback
				showGlobalAlert({
					title: 'Ride Ended Successfully',
					message: `Ride completed! Fare: R${result.fare}`,
					type: 'success',
					duration: 0,
					actions: [
						{
							label: 'Continue to Feedback',
							onPress: () => {
								router.push({
									pathname: '/SubmitFeedback',
									params: {
										rideId: taxiInfo.rideDocId || taxiInfo.rideId,
										startName: currentLocation?.name || 'Current Location',
										endName: destination?.name || 'Destination',
										passengerId: user.id,
										driverId: driverId || '',
									},
								});
							},
							style: 'default',
						},
						{
							label: 'Skip Feedback',
							onPress: () => {
								router.push('/HomeScreen');
							},
							style: 'cancel',
						}
					],
					position: 'top',
					animation: 'slide-down',
				});
			} else {
				// Payment confirmation is needed
				showGlobalAlert({
					title: 'Ride Ended Successfully',
					message: `Ride completed! Fare: R${result.fare}`,
					type: 'success',
					duration: 0,
					actions: [
						{
							label: 'Continue to Payment',
							onPress: () => {
								router.push({
									pathname: '/PaymentsConfirm',
									params: {
										rideId: taxiInfo.rideDocId || taxiInfo.rideId,
										startName: currentLocation?.name || 'Current Location',
										endName: destination?.name || 'Destination',
										passengerId: user.id,
										driverId: driverId || '',
										fare: result.fare.toString(),
										driverName: taxiInfo?.driver?.name || 'Unknown Driver',
										licensePlate: taxiInfo?.taxi?.licensePlate || 'Unknown Plate',
									},
								});
							},
							style: 'default',
						},
					],
					position: 'top',
					animation: 'slide-down',
				});
			}
			
		} catch (error: any) {
			// Reset the flags if there's an error
			setRideJustEnded(false);
			setHasShownDeclinedAlert(false);
			
			showGlobalError('Error', error?.message || 'Failed to end ride.', {
				duration: 4000,
				position: 'top',
				animation: 'slide-down',
			});
		}
	};

	const handleCancelRequest = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			showGlobalError('Error', 'No ride or user information available.', {
				duration: 4000,
				position: 'top',
				animation: 'slide-down',
			});
			return;
		}
		try {
			await cancelRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			showGlobalAlert({
				title: 'Success',
				message: 'Ride cancelled.',
				type: 'success',
				duration: 3000,
				position: 'top',
				animation: 'slide-down',
			});
			
			router.push('/HomeScreen');
		} catch (error: any) {
			showGlobalError('Error', error?.message || 'Failed to cancel ride.', {
				duration: 4000,
				position: 'top',
				animation: 'slide-down',
			});
		}
	};

	// Get current location text based on map mode and live location
	const getCurrentLocationText = () => {
		if (mapMode === 'to_driver') {
			return streamedLocation ? "Your Location" : (currentLocation?.name || "Current Location");
		}
		if (mapMode === 'to_destination' && streamedLocation) {
			return "Your Location";
		}
		return currentLocation?.name || "Current Location";
	};

	// Get destination text based on map mode
	const getDestinationText = () => {
		if (mapMode === 'to_driver') {
			return 'Driver Location';
		}
		return destination?.name || "Destination";
	};

	// Get map markers based on mode - CORRECTED MARKER LOGIC
	const getMapMarkers = () => {
		const markers = [];

		try {
			switch (mapMode) {
				case 'initial':
					// Show pickup origin and destination
					if (currentLocation && destination) {
						markers.push(
							<Marker
								key="pickup-origin"
								coordinate={currentLocation}
								title="Pickup Location"
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
					// Show phone's current location and pickup origin
					if (streamedLocation) {
						markers.push(
							<Marker
								key="phone-location"
								coordinate={{
									latitude: streamedLocation.latitude,
									longitude: streamedLocation.longitude
								}}
								title="You Are Here"
								pinColor="green"
							/>
						);
					}
					if (currentLocation) {
						markers.push(
							<Marker
								key="pickup-origin"
								coordinate={currentLocation}
								title="Pickup Location"
								pinColor="blue"
							/>
						);
					}
					break;

				case 'to_destination':
					// Show pickup origin and destination (the planned trip route)
					if (currentLocation && destination) {
						markers.push(
							<Marker
								key="pickup-origin"
								coordinate={currentLocation}
								title="Pickup Location"
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

	// Create dynamic styles based on theme - UPDATED: Minimalist colors
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
			backgroundColor: isDark ? "#333" : "#fff",
			borderRadius: 20,
			paddingVertical: 12,
			paddingHorizontal: 16,
			marginRight: 10,
			shadowColor: "#000",
			shadowOpacity: 0.1,
			shadowOffset: { width: 0, height: 2 },
			shadowRadius: 4,
			elevation: 3,
		},
		arrivalTimeText: {
			color: theme.text,
			fontSize: 13,
			fontWeight: "600",
			textAlign: "center",
		},
		routeLoadingText: {
			color: theme.textSecondary,
			fontSize: 11,
			fontStyle: 'italic',
			textAlign: "center",
			marginTop: 4,
		},
		mapModeIndicator: {
			backgroundColor: isDark ? "#333" : "#fff",
			borderRadius: 20,
			paddingVertical: 12,
			paddingHorizontal: 16,
			shadowColor: "#000",
			shadowOpacity: 0.1,
			shadowOffset: { width: 0, height: 2 },
			shadowRadius: 4,
			elevation: 3,
		},
		mapModeText: {
			fontSize: 13,
			fontWeight: "600",
			color: theme.text,
			textAlign: "center",
		},
		bottomSection: {
			alignItems: "center",
			backgroundColor: theme.surface,
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			paddingTop: 30,
			paddingBottom: 40,
			paddingHorizontal: 20,
		},
		driverDetailsHeader: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			marginBottom: 20,
			width: '100%',
		},
		driverDetailsTitle: {
			color: theme.text,
			fontSize: 18,
			fontWeight: "600",
		},
		contactButtons: {
			flexDirection: "row",
		},
		contactButton: {
			width: 40,
			height: 40,
			backgroundColor: isDark ? "#444" : "#f0f0f0",
			borderRadius: 20,
			justifyContent: "center",
			alignItems: "center",
			marginLeft: 10,
		},
		driverInfoSection: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 20,
			width: '100%',
		},
		driverAvatar: {
			width: 50,
			height: 50,
			backgroundColor: isDark ? "#444" : "#f0f0f0",
			borderRadius: 25,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 15,
		},
		driverDetails: {
			flex: 1,
		},
		driverName: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
			marginBottom: 2,
		},
		driverVehicle: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		driverRating: {
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 4,
		},
		ratingText: {
			color: theme.text,
			fontSize: 12,
			fontWeight: "500",
			marginRight: 4,
		},
		locationBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: isDark ? "#333" : "#f8f8f8",
			borderRadius: 12,
			padding: 15,
			marginBottom: 20,
			width: '100%',
		},
		locationIndicator: {
			marginRight: 12,
			alignItems: 'center',
			justifyContent: 'flex-start',
		},
		currentLocationCircle: {
			width: 12,
			height: 12,
			borderRadius: 6,
			backgroundColor: "#FF9500",
			marginBottom: 8,
		},
		dottedLineContainer: {
			height: 30,
			width: 2,
			marginBottom: 8,
			justifyContent: 'space-between',
			alignItems: 'center'
		},
		dottedLineDot: {
			width: 2,
			height: 3,
			backgroundColor: theme.textSecondary,
			borderRadius: 1
		},
		locationTextContainer: {
			flex: 1,
		},
		currentLocationText: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "500",
			marginBottom: 15,
		},
		destinationText: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "500",
		},
		actionButtonsContainer: {
			width: '100%',
			alignItems: 'center',
		},
		startRideButton: {
			alignItems: "center",
			backgroundColor: "#4CAF50",
			borderRadius: 25,
			paddingVertical: 15,
			width: '100%',
			marginBottom: 15,
		},
		startRideButtonText: {
			color: "#FFFFFF",
			fontSize: 18,
			fontWeight: "600",
		},
		endRideButton: {
			alignItems: "center",
			backgroundColor: "#81C784", // Lighter green
			borderRadius: 25,
			paddingVertical: 15,
			width: '100%',
		},
		endRideButtonText: {
			color: "#FFFFFF",
			fontSize: 18,
			fontWeight: "600",
		},
		cancelButton: {
			alignItems: "center",
			backgroundColor: "#F44336",
			borderRadius: 25,
			paddingVertical: 15,
			width: '100%',
		},
		cancelButtonText: {
			color: "#FFFFFF",
			fontSize: 18,
			fontWeight: "600",
		},
		// REMOVED: Duplicate floatingLocationButton - keeping only the one on the map
		floatingLocationButton: {
			position: 'absolute',
			bottom: 20,
			right: 20,
			backgroundColor: "#FF9500", // FIXED: Back to original orange color
			borderRadius: 25,
			padding: 12,
			shadowColor: "#000",
			shadowOpacity: 0.2,
			shadowOffset: { width: 0, height: 2 },
			shadowRadius: 4,
			elevation: 4,
		},
	});

	// Early return for loading state - but ensure all hooks are called first
	if (!currentLocation || !destination) {
		return (
			<SafeAreaView style={dynamicStyles.container}>
				<View style={dynamicStyles.loadingContainer}>
					<Text style={dynamicStyles.loadingText}>{t('passengerReservation:loading')}</Text>
				</View>
			</SafeAreaView>
		);
	}

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
								latitude: (currentLocation.latitude + destination.latitude) / 2,
								longitude: (currentLocation.longitude + destination.longitude) / 2,
								latitudeDelta: Math.abs(currentLocation.latitude - destination.latitude) * 2 + 0.01,
								longitudeDelta: Math.abs(currentLocation.longitude - destination.longitude) * 2 + 0.01,
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
									strokeColor="#FF9500"
									strokeWidth={4}
								/>
							)}
						</MapView>

						{/* Arrival Time Overlay */}
						<View style={dynamicStyles.arrivalTimeOverlay}>
							<View style={dynamicStyles.arrivalTimeBox}>
								<Text style={dynamicStyles.arrivalTimeText}>
									{getDisplayTime()}
								</Text>
								{isLoadingRoute && (
									<Text style={dynamicStyles.routeLoadingText}>
										{t('passengerReservation:loadingRoute')}
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

						{/* FIXED: Only one current location button - on the map, with no orange border */}
						{!isFollowing && (
							<TouchableOpacity
								style={dynamicStyles.floatingLocationButton}
								onPress={() => setIsFollowing(true)}
							>
								<Icon name="locate" size={24} color="#fff" />
							</TouchableOpacity>
						)}
					</View>

					<View style={dynamicStyles.bottomSection}>
						{/* Driver Details Header */}
						<View style={dynamicStyles.driverDetailsHeader}>
							<Text style={dynamicStyles.driverDetailsTitle}>
								{t('passengerReservation:driverDetails')}
							</Text>
							<View style={dynamicStyles.contactButtons}>
								<TouchableOpacity style={dynamicStyles.contactButton} onPress={handleCall}>
									<Icon name="call" size={20} color={theme.text} />
								</TouchableOpacity>
								<TouchableOpacity style={dynamicStyles.contactButton} onPress={handleMessage}>
									<Icon name="chatbubble" size={20} color={theme.text} />
								</TouchableOpacity>
							</View>
						</View>
						
						{/* Driver Info Section */}
						{!taxiInfoError && (
							<View style={dynamicStyles.driverInfoSection}>
								<View style={dynamicStyles.driverAvatar}>
									<Icon name="person" size={24} color={theme.text} />
								</View>
								<View style={dynamicStyles.driverDetails}>
									<Text style={dynamicStyles.driverName}>
										{taxiInfo?.driver?.name || "Unknown Driver"}
									</Text>
									<Text style={dynamicStyles.driverVehicle}>
										{taxiInfo?.taxi?.model || "Unknown Vehicle"} • {taxiInfo?.taxi?.licensePlate || vehicleInfo.plate || "Unknown Plate"}
									</Text>
									<View style={dynamicStyles.driverRating}>
										<Text style={dynamicStyles.ratingText}>
											{taxiInfo?.driver?.averageRating ? taxiInfo.driver.averageRating.toFixed(1) : 'N/A'}
										</Text>
										<View style={{ flexDirection: 'row' }}>
											{taxiInfo?.driver?.averageRating ? [1, 2, 3, 4, 5].map((star, index) => {
												const rating = taxiInfo.driver.averageRating;
												const full = rating >= star;
												const half = rating >= star - 0.5 && !full;

												return (
													<FontAwesome
														key={index}
														name={full ? "star" : half ? "star-half-full" : "star-o"}
														size={12}
														color="#FFD700"
														style={{ marginRight: 1 }}
													/>
												);
											}) : null}
										</View>
									</View>
								</View>
							</View>
						)}
						
						{/* Location Box - Start and Destination */}
						<View style={dynamicStyles.locationBox}>
							<View style={dynamicStyles.locationIndicator}>
								<View style={dynamicStyles.currentLocationCircle} />
								<View style={dynamicStyles.dottedLineContainer}>
									{[...Array(6)].map((_, index) => (
										<View key={index} style={dynamicStyles.dottedLineDot} />
									))}
								</View>
								<Icon name="location" size={16} color={theme.text} />
							</View>
							
							<View style={dynamicStyles.locationTextContainer}>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={dynamicStyles.currentLocationText}>
										{getCurrentLocationText()}
									</Text>
								</View>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={dynamicStyles.destinationText}>
										{getDestinationText()}
									</Text>
								</View>
							</View>

							{/* Google Maps Button */}
							{(rideStatus === 'started' || rideStatus === 'in_progress') && (
								<TouchableOpacity onPress={openGoogleMaps}>
									<Icon name="map" size={20} color="#FF9500" />
								</TouchableOpacity>
							)}
						</View>
						
						{/* Action Buttons - Only show if ride hasn't ended */}
						{!rideJustEnded && rideStatus !== 'completed' && (
							<View style={dynamicStyles.actionButtonsContainer}>
								{/* Before ride is accepted: show only Cancel Request */}
								{rideStatus === 'requested' && (
									<TouchableOpacity 
										style={dynamicStyles.cancelButton} 
										onPress={handleCancelRequest}>
										<Text style={dynamicStyles.cancelButtonText}>
											{t('passengerReservation:cancelRequest')}
										</Text>
									</TouchableOpacity>
								)}

								{/* When ride is accepted: show PIN entry and Cancel Request */}
								{rideStatus === 'accepted' && (
									<>
										<TouchableOpacity 
											style={dynamicStyles.startRideButton} 
											onPress={handleStartRide}>
											<Text style={dynamicStyles.startRideButtonText}>
												{t('passengerReservation:verifyPin')}
											</Text>
										</TouchableOpacity>
										<TouchableOpacity 
											style={dynamicStyles.cancelButton} 
											onPress={handleCancelRequest}>
											<Text style={dynamicStyles.cancelButtonText}>
												{t('passengerReservation:cancelRequest')}
											</Text>
										</TouchableOpacity>
									</>
								)}

								{/* Only show End Ride when ride is started or in progress */}
								{(rideStatus === 'started' || rideStatus === 'in_progress') && (
									<TouchableOpacity 
										style={dynamicStyles.endRideButton} 
										onPress={handleEndRide}>
										<Text style={dynamicStyles.endRideButtonText}>
											{t('passengerReservation:endRide')}
										</Text>
									</TouchableOpacity>
								)}
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}