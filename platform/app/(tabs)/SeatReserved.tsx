import React, { useLayoutEffect, useState, useRef, useEffect } from "react";
import { SafeAreaView, View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform, Alert, Pressable } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { router } from 'expo-router';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useMapContext, createRouteKey } from '../../contexts/MapContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { FontAwesome } from "@expo/vector-icons";
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Badge } from '../../components/Badge';
import { isMultiLegJourney, isLastLeg } from '../../utils/multiLegJourneyHelpers';

// Get platform-specific API key
const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios' 
  ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY
  : process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

export default function SeatReserved() {
	// IMMEDIATE DEBUG - This should show up in logs right away
	console.log('🟢 SeatReserved component loaded - checking for multi-leg params');

	// Add error boundary state for crash prevention
	const [hasError, setHasError] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	// Global error handler for the component
	const handleError = (error: Error, errorInfo?: any) => {
		console.error('SeatReserved component error:', error, errorInfo);
		setErrorMessage(error.message);
		setHasError(true);
		// Don't crash the app - show error state instead
	};

	const [useLiveLocation, setUseLiveLocation] = useState(false);
	const params = useLocalSearchParams<{
		currentLat?: string;
		currentLng?: string;
		currentName?: string;
		destinationLat?: string;
		destinationLng?: string;
		destinationName?: string;
		driverId?: string;
		driverName?: string;
		fare?: string;
		rideId?: string;
		// Multi-leg journey parameters
		isMultiLeg?: string;
		journeyId?: string;
		legIndex?: string;
		totalLegs?: string;
		routeName?: string;
		// Legacy parameters
		plate?: string;
		time?: string;
		seats?: string;
		price?: string;
		selectedVehicleId?: string;
		userId?: string;
	}>();

	// IMMEDIATE DEBUG - Log params as soon as they're available
	console.log('🔍 SeatReserved IMMEDIATE - Raw params received:', params);
	console.log('🔍 SeatReserved IMMEDIATE - Multi-leg check:', {
		isMultiLeg: params.isMultiLeg,
		totalLegs: params.totalLegs,
		legIndex: params.legIndex,
		journeyId: params.journeyId
	});

	// Context hooks need to be declared before any queries that use them
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

	const mapRef = useRef<MapView | null>(null);

	// State to track if ride has ended to prevent query errors
	const [rideJustEnded, setRideJustEnded] = useState(false);
	const [isEndingRide, setIsEndingRide] = useState(false);

	// Fetch taxi and driver info for the current reservation using Convex
	// Wrap taxi info query with error handling
	const taxiInfo = useQuery(
		api.functions.taxis.viewTaxiInfo.viewTaxiInfo,
		user && !rideJustEnded && !isEndingRide ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
	);

	// Helper to determine ride status - declared immediately after taxiInfo to ensure it's available for all useEffects
	const rideStatus = taxiInfo?.status as 'requested' | 'accepted' | 'in_progress' | 'started' | 'completed' | 'cancelled' | undefined;

	// Debug logging for multi-leg journey parameters
	useEffect(() => {
		console.log('🔍 SeatReserved DEBUG - Multi-leg journey parameters:', {
			isMultiLeg: params.isMultiLeg,
			journeyId: params.journeyId,
			legIndex: params.legIndex,
			totalLegs: params.totalLegs,
			routeName: params.routeName,
			allParams: params,
		});
		
		const multiLegCheck = isMultiLegJourney(params.isMultiLeg, params.totalLegs);
		const lastLegCheck = isLastLeg(params.legIndex, params.totalLegs);
		
		console.log('🔍 SeatReserved DEBUG - Button visibility logic:', {
			isMultiLegJourney: multiLegCheck,
			isLastLeg: lastLegCheck,
			shouldShowContinueButton: multiLegCheck && !lastLegCheck,
			rideStatus: rideStatus,
			currentLegIndex: params.legIndex ? parseInt(params.legIndex) : undefined,
			totalLegsCount: params.totalLegs ? parseInt(params.totalLegs) : undefined,
		});
	}, [params, rideStatus]);

	// Handle query errors
	useEffect(() => {
		try {
			if (taxiInfo === undefined) {
				// Still loading - this is normal
				return;
			}
		} catch (error) {
			console.error('Error in taxiInfo query:', error);
			handleError(error as Error);
		}
	}, [taxiInfo]);

	// Fetch driver badges
	const driverBadges = useQuery(
		api.functions.badges.getUserBadges.getUserBadgesQuery,
		taxiInfo?.driver?.userId ? { userId: taxiInfo.driver.userId as Id<"taxiTap_users"> } : "skip"
	);

	// Handle query errors gracefully
	useEffect(() => {
		if (taxiInfo === null && !rideJustEnded && !isEndingRide && user) {
			console.log('No active reservation found - this is normal when no ride is active');
		}
	}, [taxiInfo, rideJustEnded, isEndingRide, user]);

	// Automatically set rideJustEnded when ride is completed or cancelled with safety checks
	useEffect(() => {
		try {
			if (rideStatus === 'completed' || rideStatus === 'cancelled') {
				console.log(`Ride status changed to: ${rideStatus}`);
				setRideJustEnded(true);
				setIsEndingRide(false);
			}
		} catch (error) {
			console.error('Error in ride status update:', error);
			// Don't crash the app
		}
	}, [rideStatus]);


	const cancelRide = useMutation(api.functions.rides.cancelRide.cancelRide);
	const endRide = useMutation(api.functions.rides.endRide.endRide);
	const verifyDriverPin = useMutation(api.functions.rides.verifyDriverPin.verifyDriverPin);

	const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);

	const [hasFittedRoute, setHasFittedRoute] = useState(false);
	const [isFollowing, setIsFollowing] = useState(true);
	const [pin, setPin] = useState(['', '', '', '']);
	const [isVerifying, setIsVerifying] = useState(false);
	const [showPinEntry, setShowPinEntry] = useState(false);

	const passengerId = user?.id;
	const rideId = taxiInfo?.rideId;
	const driverId = taxiInfo?.driver?.userId;

	// Remove averageRating usage if not available
	const [hasShownDeclinedAlert, setHasShownDeclinedAlert] = useState(false);

	const startTripConvex = useMutation(api.functions.earnings.startTrip.startTrip);
	const endTripConvex = useMutation(api.functions.earnings.endTrip.endTrip);

	// Distance calculation function for transfer window monitoring
	const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
		const R = 6371; // Earth's radius in kilometers
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLng/2) * Math.sin(dLng/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	};

	// Safety function to validate location updates and prevent crashes from sudden jumps
	const validateLocationUpdate = (newLocation: { latitude: number; longitude: number }, currentLocation: { latitude: number; longitude: number } | null): boolean => {
		try {
			// Basic coordinate validation
			if (!newLocation || typeof newLocation.latitude !== 'number' || typeof newLocation.longitude !== 'number') {
				console.warn('Invalid location data received:', newLocation);
				return false;
			}

			// Check for valid coordinate ranges
			if (newLocation.latitude < -90 || newLocation.latitude > 90 ||
				newLocation.longitude < -180 || newLocation.longitude > 180) {
				console.warn('Location coordinates out of valid range:', newLocation);
				return false;
			}

			// If we have a previous location, check for unreasonable jumps (>100km in one update)
			if (currentLocation) {
				const distance = calculateDistance(
					currentLocation.latitude,
					currentLocation.longitude,
					newLocation.latitude,
					newLocation.longitude
				);

				if (distance > 100) { // More than 100km jump
					console.warn(`Location jump detected: ${distance.toFixed(2)}km. This might be due to fake GPS.`);
					// Allow the update but log it - don't block fake GPS for testing
					console.warn('Allowing location update despite large jump for testing purposes');
				}
			}

			return true;
		} catch (error) {
			console.error('Error validating location update:', error);
			return false;
		}
	};


	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: false
		});
	}, [navigation]);

	// Show PIN entry when ride is accepted
	useEffect(() => {
		if (rideStatus === 'accepted') {
			setShowPinEntry(true);
		}
	}, [rideStatus]);

	function getParamAsString(param: string | string[] | undefined, fallback: string = ''): string {
		if (Array.isArray(param)) {
			return param[0] || fallback;
		}
		return param || fallback;
	}

	useEffect(() => {
		setUseLiveLocation(false);
	}, []);

	// Parse location data from params and update context with safety checks
	useEffect(() => {
		try {
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

				const newCurrentLocation = {
					latitude: currentLat,
					longitude: currentLng,
				};

				const newDestination = {
					latitude: destLat,
					longitude: destLng,
				};

				// Validate location updates before applying them
				if (validateLocationUpdate(newCurrentLocation, currentLocation) &&
					validateLocationUpdate(newDestination, destination)) {

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
				} else {
					console.warn('Location update blocked due to validation failure');
				}
			}
		} catch (error) {
			console.error('Error in location update useEffect:', error);
			// Don't crash the app - just log the error
		}
	}, [useLiveLocation]);

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

	// Get route when locations are available and route not loaded
	useEffect(() => {
		if (currentLocation && destination && 
			currentLocation.latitude && destination.latitude && 
			!routeLoaded && !isLoadingRoute) {
			getRoute(currentLocation, destination);
		}
	}, [currentLocation, destination, routeLoaded, isLoadingRoute]);

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
			currentLocation
		) {
			mapRef.current.animateToRegion(
				{
					latitude: currentLocation.latitude,
					longitude: currentLocation.longitude,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				},
				500
			);
		}
	}, [currentLocation, rideStatus, isFollowing]);


	// PIN entry functions
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
		if (!user || !taxiInfo?.rideId || !driverId) {
			Alert.alert('Error', 'Missing ride or user information.');
			return;
		}

		setIsVerifying(true);
		try {
			const result = await verifyDriverPin({
				rideId: taxiInfo.rideId,
				passengerId: user.id as Id<'taxiTap_users'>,
				driverId: driverId as Id<'taxiTap_users'>,
				enteredPin: enteredPin,
			});

			if (result.success) {
				Alert.alert('Success', 'Driver verified! Ride started.');
				setShowPinEntry(false);
				// The ride status should now change to 'in_progress' via the backend
			} else {
				Alert.alert('Invalid PIN', 'Please check with the driver and try again.');
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

	// Handle notifications effect
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
						onPress: () => {
							markAsRead(rideStarted._id);
							if (!currentLocation || !destination) {
								return;
							}
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
		if (rideJustEnded) return;
		
		// Handle taxi info loading states
		if (taxiInfo === null && !hasShownDeclinedAlert) {
			console.log('No active reservation found');
		}
	}, [hasShownDeclinedAlert, taxiInfo]);

	const handleEndRide = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		
		// Set this FIRST to prevent the query from being executed
		setIsEndingRide(true);
		setRideJustEnded(true);
		
		try {
			console.log('🚗 Ending ride:', { rideId: taxiInfo.rideId, userId: user.id });
			
			// Call endTrip first to get the fare before the ride status changes
			const result = await endTripConvex({
				passengerId: user.id as Id<'taxiTap_users'>,
			});
			
			console.log('💰 Trip ended, fare calculated:', result);
			
			// Then end the ride and update seat availability
			await endRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			console.log('✅ Ride ended successfully');
			
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			console.log('🔄 Seat availability updated');
			
			Alert.alert('Ride Ended', `Fare: R${result.fare}`);
			
			if (!currentLocation || !destination) {
				console.log('⚠️ Missing location data, cannot navigate to feedback');
				return;
			}
			
			router.push({
				pathname: './SubmitFeedback',
				params: {
					startName: currentLocation.name,
					endName: destination.name,
					passengerId: passengerId,
					rideId: taxiInfo?.rideDocId, // Use internal Convex document ID instead of external rideId
					driverId: driverId,
					actualFare: result.fare.toString(), // Pass actual fare for payment validation
					// Pass multi-leg journey parameters if applicable
					...(params.isMultiLeg && {
						isMultiLeg: params.isMultiLeg,
						journeyId: params.journeyId,
						legIndex: params.legIndex,
						totalLegs: params.totalLegs,
						routeName: params.routeName,
					}),
				},
			});
		} catch (error: any) {
			// Reset the flags if there's an error
			setIsEndingRide(false);
			setRideJustEnded(false);
			console.error('❌ Error ending ride:', error);
			Alert.alert('Error', error?.message || 'Failed to end ride. Please try again.');
		}
	};

	const handleContinueToNextLeg = async () => {
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		
		// Set this FIRST to prevent the query from being executed
		setIsEndingRide(true);
		setRideJustEnded(true);
		
		try {
			console.log('🚗 Continuing to next leg:', { rideId: taxiInfo.rideId, userId: user.id });
			
			// Call endTrip first to get the fare before the ride status changes
			const result = await endTripConvex({
				passengerId: user.id as Id<'taxiTap_users'>,
			});
			
			console.log('💰 Trip ended, fare calculated:', result);
			
			// Then end the ride and update seat availability
			await endRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			console.log('✅ Ride ended successfully');
			
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			console.log('🔄 Seat availability updated');
			
			if (!currentLocation || !destination) {
				console.log('⚠️ Missing location data, cannot navigate to next leg');
				return;
			}
			
			// Check if payment is required
			const hasAlreadyPaid = taxiInfo.tripPaid === true;
			
			if (hasAlreadyPaid) {
				// User has already paid, go directly to feedback then TaxiInformation
				router.push({
					pathname: './SubmitFeedback',
					params: {
						startName: currentLocation.name,
						endName: destination.name,
						passengerId: passengerId,
						rideId: taxiInfo?.rideDocId,
						driverId: driverId,
						actualFare: result.fare.toString(),
						isMultiLeg: params.isMultiLeg,
						journeyId: params.journeyId,
						legIndex: params.legIndex,
						totalLegs: params.totalLegs,
						routeName: params.routeName,
						continueToNext: 'true', // Flag to indicate this should continue to next leg
					},
				});
			} else {
				// Payment confirmation is needed first
				router.push({
					pathname: './PaymentsConfirm',
					params: {
						rideId: taxiInfo?.rideDocId,
						startName: currentLocation?.name || 'Current Location',
						endName: destination?.name || 'Destination',
						passengerId: user.id,
						driverId: driverId || '',
						fare: result.fare.toString(),
						driverName: taxiInfo?.driver?.name || 'Unknown Driver',
						licensePlate: taxiInfo?.taxi?.licensePlate || 'Unknown Plate',
						isMultiLeg: params.isMultiLeg,
						journeyId: params.journeyId,
						legIndex: params.legIndex,
						totalLegs: params.totalLegs,
						routeName: params.routeName,
						continueToNext: 'true', // Flag to indicate this should continue to next leg
					},
				});
			}
			
		} catch (error: any) {
			// Reset the flags if there's an error
			setIsEndingRide(false);
			setRideJustEnded(false);
			console.error('❌ Error continuing to next leg:', error);
			Alert.alert('Error', error?.message || 'Failed to continue to next leg. Please try again.');
		}
	};

	const handleCancelRequest = async () => { //this for when user wants to cancel the ride request
		if (!taxiInfo?.rideId || !user?.id) {
			Alert.alert('Error', 'No ride or user information available.');
			return;
		}
		try {
			// Set this FIRST to prevent the error alert from triggering
			setRideJustEnded(true);
			
			await cancelRide({ rideId: taxiInfo.rideId, userId: user.id as Id<'taxiTap_users'> });
			await updateTaxiSeatAvailability({ rideId: taxiInfo.rideId, action: "increase" });
			Alert.alert(t('home:success'), t('home:rideCancelled'));
			router.push('/HomeScreen');
		} catch (error: any) {
			// Reset the flag if there's an error
			setRideJustEnded(false);
			Alert.alert('Error', error?.message || 'Failed to cancel ride.');
		}
	};


	// Create dynamic styles based on theme
	const dynamicStyles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		header: {
			paddingHorizontal: 20,
			paddingTop: 50,
			paddingBottom: 16,
			backgroundColor: theme.background,
			borderBottomWidth: 1,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
		},
		headerRow: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		backButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 16,
		},
		headerTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: theme.text,
			flex: 1,
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
		},
		arrivalTimeBox: {
			backgroundColor: theme.card,
			borderRadius: 16,
			paddingVertical: 12,
			paddingHorizontal: 16,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			...Platform.select({
				ios: {
					shadowColor: theme.shadow,
					shadowOpacity: isDark ? 0.2 : 0.05,
					shadowOffset: { width: 0, height: 2 },
					shadowRadius: 4,
				},
				android: {
					elevation: 2,
				},
			}),
		},
		arrivalTimeText: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "600",
			textAlign: "center",
		},
		routeLoadingText: {
			color: theme.textSecondary,
			fontSize: 12,
			fontStyle: 'italic',
			textAlign: "center",
			marginTop: 4,
		},
		bottomSection: {
			alignItems: "center",
			backgroundColor: theme.card,
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			paddingTop: 24,
			paddingBottom: 24,
			paddingHorizontal: 20,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			borderBottomWidth: 0,
			...Platform.select({
				ios: {
					shadowColor: theme.shadow,
					shadowOpacity: isDark ? 0.3 : 0.1,
					shadowOffset: { width: 0, height: -2 },
					shadowRadius: 8,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		driverDetailsHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 20,
			width: '100%',
		},
		driverDetailsTitle: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
			flex: 1,
		},
		contactButton: {
			width: 36,
			height: 36,
			backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}10`,
			borderRadius: 18,
			justifyContent: "center",
			alignItems: "center",
			marginLeft: 8,
		},
		driverInfoSection: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 24,
			width: '100%',
		},
		driverAvatar: {
			width: 60,
			height: 60,
			backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}10`,
			borderRadius: 30,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 16,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
		},
		driverName: {
			color: theme.text,
			fontSize: 16,
			fontWeight: "600",
			marginBottom: 4,
		},
		driverVehicle: {
			color: theme.textSecondary,
			fontSize: 14,
			fontWeight: "500",
		},
		ratingText: {
			color: theme.text,
			fontSize: 12,
			fontWeight: "bold",
			marginRight: 3,
		},
		licensePlateSection: {
			flexDirection: "row",
			marginBottom: 20,
			width: '100%',
			justifyContent: 'space-between',
			backgroundColor: theme.background,
			borderRadius: 12,
			padding: 16,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
		},
		licensePlateLabel: {
			color: theme.textSecondary,
			fontSize: 14,
			fontWeight: "500",
		},
		licensePlateValue: {
			color: theme.text,
			fontSize: 14,
			fontWeight: "600",
		},
		locationBox: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: theme.background,
			borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			borderRadius: 16,
			borderWidth: 1,
			paddingVertical: 16,
			paddingHorizontal: 16,
			marginBottom: 24,
			width: '100%',
			...Platform.select({
				ios: {
					shadowColor: theme.shadow,
					shadowOpacity: isDark ? 0.2 : 0.05,
					shadowOffset: { width: 0, height: 2 },
					shadowRadius: 4,
				},
				android: {
					elevation: 2,
				},
			}),
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
			color: theme.text,
			fontSize: 15,
			fontWeight: "600",
			marginBottom: 16,
			lineHeight: 20,
		},
		locationSeparator: {
			height: 1,
			backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			marginBottom: 16,
			marginHorizontal: 2,
		},
		destinationText: {
			color: theme.text,
			fontSize: 15,
			fontWeight: "600",
			marginLeft: 2,
			lineHeight: 20,
		},
		actionButtonsContainer: {
			width: '100%',
			alignItems: 'center',
			marginTop: 16,
			paddingHorizontal: 0,
		},
		// PIN entry styles
		pinEntryOverlay: {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: 'rgba(0, 0, 0, 0.8)',
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 1000,
		},
		pinEntryContainer: {
			backgroundColor: theme.surface,
			borderRadius: 20,
			padding: 30,
			width: '90%',
			maxWidth: 350,
			alignItems: 'center',
		},
		pinEntryHeader: {
			alignItems: 'center',
			marginBottom: 30,
		},
		pinEntryTitle: {
			fontSize: 20,
			fontWeight: '600',
			color: theme.text,
			marginTop: 12,
			marginBottom: 8,
		},
		pinEntrySubtitle: {
			fontSize: 14,
			color: theme.textSecondary,
			textAlign: 'center',
		},
		pinDisplay: {
			flexDirection: 'row',
			justifyContent: 'center',
			marginBottom: 30,
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
			marginBottom: 20,
		},
		numberButton: {
			width: 70,
			height: 70,
			borderRadius: 35,
			backgroundColor: isDark ? theme.background : '#F5F5F5',
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
		verifyingText: {
			color: theme.primary,
			fontSize: 16,
			fontWeight: '500',
			marginTop: 10,
		},
		pinCancelButton: {
			paddingVertical: 12,
			paddingHorizontal: 24,
		},
		pinCancelButtonText: {
			color: theme.textSecondary,
			fontSize: 16,
		},
		startRideButton: {
			alignItems: "center",
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 16,
			width: '100%',
			marginBottom: 12,
			...Platform.select({
				ios: {
					shadowColor: theme.primary,
					shadowOpacity: 0.3,
					shadowOffset: { width: 0, height: 4 },
					shadowRadius: 8,
				},
				android: {
					elevation: 4,
				},
			}),
		},
		startRideButtonText: {
			color: isDark ? "#121212" : "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
		},
		cancelButton: {
			alignItems: "center",
			backgroundColor: isDark ? "#FF4444" : "#FF6B6B",
			borderRadius: 12,
			paddingVertical: 16,
			width: '100%',
			marginBottom: 8,
			...Platform.select({
				ios: {
					shadowColor: '#FF4444',
					shadowOpacity: 0.2,
					shadowOffset: { width: 0, height: 2 },
					shadowRadius: 4,
				},
				android: {
					elevation: 2,
				},
			}),
		},
		cancelButtonText: {
			color: "#FFFFFF",
			fontSize: 16,
			fontWeight: "600",
		},
	});

	// Early return for error state
	if (hasError) {
		return (
			<SafeAreaView style={dynamicStyles.container}>
				<View style={dynamicStyles.loadingContainer}>
					<Text style={{ color: theme.text, textAlign: 'center', margin: 20 }}>
						Error: {errorMessage}
					</Text>
					<TouchableOpacity
						onPress={() => {
							setHasError(false);
							setErrorMessage('');
						}}
						style={{ padding: 10, backgroundColor: theme.primary, borderRadius: 5 }}
					>
						<Text style={{ color: 'white' }}>Retry</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// Early return for loading state - but ensure all hooks are called first
	if (!currentLocation || !destination) {
		return (
			<SafeAreaView style={dynamicStyles.container}>
				<View style={dynamicStyles.loadingContainer}>
					<LoadingSpinner size="large" />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={dynamicStyles.container}>
			{/* Header */}
			<View style={dynamicStyles.header}>
				<View style={dynamicStyles.headerRow}>
					<Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
						<Icon name="arrow-back" size={20} color={theme.text} />
					</Pressable>
					<Text style={dynamicStyles.headerTitle}>
						Ride in Progress
					</Text>
				</View>
			</View>

			<ScrollView style={dynamicStyles.scrollView}>
				<View>
					{/* Map Section with Route - Add error boundary */}
					<View style={{ height: 300, position: 'relative' }}>
						{(() => {
							try {
								// Validate coordinates before rendering map
								const isValidCoordinates = (coord: any) => {
									return coord &&
										typeof coord.latitude === 'number' &&
										typeof coord.longitude === 'number' &&
										coord.latitude >= -90 && coord.latitude <= 90 &&
										coord.longitude >= -180 && coord.longitude <= 180 &&
										!isNaN(coord.latitude) && !isNaN(coord.longitude);
								};

								if (!isValidCoordinates(currentLocation) || !isValidCoordinates(destination)) {
									console.warn('Invalid coordinates for map rendering:', { currentLocation, destination });
									return (
										<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
											<Text style={{ color: theme.text }}>Map temporarily unavailable</Text>
										</View>
									);
								}

								// Calculate safe region values
								const centerLat = (currentLocation.latitude + destination.latitude) / 2;
								const centerLng = (currentLocation.longitude + destination.longitude) / 2;
								const latDelta = Math.max(Math.abs(currentLocation.latitude - destination.latitude) * 2 + 0.01, 0.01);
								const lngDelta = Math.max(Math.abs(currentLocation.longitude - destination.longitude) * 2 + 0.01, 0.01);

								// Validate region values
								if (isNaN(centerLat) || isNaN(centerLng) || isNaN(latDelta) || isNaN(lngDelta)) {
									console.warn('Invalid region calculation');
									return (
										<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
											<Text style={{ color: theme.text }}>Map temporarily unavailable</Text>
										</View>
									);
								}

								return (
									<MapView
										ref={mapRef}
										style={{ flex: 1 }}
										provider={PROVIDER_GOOGLE}
										initialRegion={{
											latitude: centerLat,
											longitude: centerLng,
											latitudeDelta: latDelta,
											longitudeDelta: lngDelta,
										}}
										customMapStyle={isDark ? darkMapStyle : []}
										onPanDrag={() => setIsFollowing(false)}
										onRegionChangeComplete={() => setIsFollowing(false)}
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
										{/* Render the route polyline */}
										{routeCoordinates.length > 0 && (
											<Polyline
												coordinates={routeCoordinates}
												strokeColor={theme.primary}
												strokeWidth={4}
											/>
										)}
									</MapView>
								);
							} catch (error) {
								console.error('Error rendering map:', error);
								handleError(error as Error);
								return (
									<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
										<Text style={{ color: theme.text }}>Map error - please retry</Text>
									</View>
								);
							}
						})()}

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
						</View>
					</View>

					<View style={dynamicStyles.bottomSection}>
						
						<View style={dynamicStyles.driverDetailsHeader}>
							<Text style={dynamicStyles.driverDetailsTitle}>
								Driver Details
							</Text>
							<TouchableOpacity style={dynamicStyles.contactButton}>
								<Icon name="call" size={16} color={theme.primary} />
							</TouchableOpacity>
							<TouchableOpacity style={dynamicStyles.contactButton}>
								<Icon name="chatbubble" size={16} color={theme.primary} />
							</TouchableOpacity>
						</View>
						
						{taxiInfo === undefined ? (
							<View style={dynamicStyles.driverInfoSection}>
								<View style={dynamicStyles.driverAvatar}>
									<Icon name="person" size={30} color={isDark ? "#121212" : "#FF9900"} />
								</View>
								<View style={{ marginRight: 35 }}>
									<Text style={dynamicStyles.driverName}>
										Loading ride information...
									</Text>
									<Text style={dynamicStyles.driverVehicle}>
										Please wait while we fetch your ride details
									</Text>
								</View>
							</View>
						) : taxiInfo && taxiInfo.driver ? (
							<View style={dynamicStyles.driverInfoSection}>
								<View style={dynamicStyles.driverAvatar}>
									<Icon name="person" size={30} color={isDark ? "#121212" : "#FF9900"} />
								</View>
								<View style={{ marginRight: 35 }}>
									<Text style={dynamicStyles.driverName}>
										{taxiInfo.driver.name || "Driver details not available"}
									</Text>
									<Text style={dynamicStyles.driverVehicle}>
										{taxiInfo.taxi?.model || "Vehicle details not available"}
									</Text>
									<TouchableOpacity onPress={() => router.push({pathname: '/TaxiInfoPage', params: { userId: vehicleInfo.userId }})}>
										<Icon name="information-circle" size={30} color={isDark ? "#121212" : "#FF9900"} />
									</TouchableOpacity>
								</View>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={dynamicStyles.ratingText}>
										{(taxiInfo?.driver?.rating ?? 0).toFixed(1)}
									</Text>
									<View style={{ flexDirection: 'row', marginLeft: 4 }}>
										{[1, 2, 3, 4, 5].map((star, index) => {
											const full = (taxiInfo?.driver?.rating ?? 0) >= star;
											const half = (taxiInfo?.driver?.rating ?? 0) >= star - 0.5 && !full;

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
								
								{/* Driver Badges */}
								{driverBadges && driverBadges.length > 0 && (
									<View style={{ marginTop: 10, marginBottom: 10 }}>
										<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
											{driverBadges.map((badge: any, index: number) => (
												<Badge
													key={index}
													badgeType={badge.badgeType as "trusted_payer" | "frequent_rider" | "loyal_member" | "marathon_driver" | "top_earner"}
													name={badge.name}
													description={badge.description}
													icon={badge.icon}
													color={badge.color}
													size="small"
												/>
											))}
										</View>
									</View>
								)}
							</View>
						) : taxiInfo && !taxiInfo.driver ? (
							<View style={dynamicStyles.driverInfoSection}>
								<View style={dynamicStyles.driverAvatar}>
									<Icon name="person" size={30} color={isDark ? "#121212" : "#FF9900"} />
								</View>
								<View style={{ marginRight: 35 }}>
									<Text style={dynamicStyles.driverName}>
{t('home:waitingForDriver')}
									</Text>
									<Text style={dynamicStyles.driverVehicle}>
										Your ride request has been sent. A driver will be assigned soon.
									</Text>
								</View>
							</View>
						) : (
							<View style={dynamicStyles.driverInfoSection}>
								<View style={dynamicStyles.driverAvatar}>
									<Icon name="person" size={30} color={isDark ? "#121212" : "#FF9900"} />
								</View>
								<View style={{ marginRight: 35 }}>
									<Text style={dynamicStyles.driverName}>
										No active reservation found
									</Text>
									<Text style={dynamicStyles.driverVehicle}>
										Please book a ride to see driver details
									</Text>
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
									{destination.name}
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
							{/* When ride is accepted: show message and Cancel Request */}
							{rideStatus === 'accepted' && (
								<>
									<Text style={[dynamicStyles.driverName, { marginBottom: 20, textAlign: 'center' }]}>
										Driver will show you their PIN to verify and start the ride
									</Text>
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
								<>
									<TouchableOpacity 
										style={dynamicStyles.cancelButton} 
										onPress={handleEndRide}>
										<Text style={dynamicStyles.cancelButtonText}>
											{"End Ride"}
										</Text>
									</TouchableOpacity>
									
									{/* Show Continue to Next Leg button only for first leg of multi-leg journey */}
									{(() => {
										const isMultiLeg = isMultiLegJourney(params.isMultiLeg, params.totalLegs);
										const legIndex = params.legIndex ? parseInt(params.legIndex) : 0;

										console.log('🔍 SeatReserved BUTTON DEBUG:', {
											isMultiLeg,
											legIndex,
											totalLegs: params.totalLegs,
											shouldShow: isMultiLeg && legIndex === 0,
											params: {
												isMultiLeg: params.isMultiLeg,
												legIndex: params.legIndex,
												totalLegs: params.totalLegs
											}
										});

										// Only show if it's a multi-leg journey AND we're on the first leg (index 0)
										return isMultiLeg && legIndex === 0;
									})() && (
										<TouchableOpacity
											style={[dynamicStyles.cancelButton, { backgroundColor: theme.primary, marginTop: 10 }]}
											onPress={handleContinueToNextLeg}>
											<Text style={[dynamicStyles.cancelButtonText, { color: '#FFFFFF' }]}>
												{"Continue to Next Leg"}
											</Text>
										</TouchableOpacity>
									)}
								</>
							)}
						</View>
					</View>
				</View>
			</ScrollView>
			
			{/* PIN Entry Modal */}
			{showPinEntry && (
				<View style={dynamicStyles.pinEntryOverlay}>
					<View style={dynamicStyles.pinEntryContainer}>
						<View style={dynamicStyles.pinEntryHeader}>
							<Icon name="shield-checkmark" size={32} color={theme.primary} />
							<Text style={dynamicStyles.pinEntryTitle}>Enter Driver's PIN</Text>
							<Text style={dynamicStyles.pinEntrySubtitle}>
								Ask the driver to show you their verification PIN
							</Text>
						</View>

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
							style={dynamicStyles.pinCancelButton}
							onPress={() => setShowPinEntry(false)}
							activeOpacity={0.7}
						>
							<Text style={dynamicStyles.pinCancelButtonText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
			
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