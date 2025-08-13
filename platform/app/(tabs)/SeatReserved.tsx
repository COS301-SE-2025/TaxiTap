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
	const { notifications, markAsRead } = useNotifications();

	const mapRef = useRef<MapView | null>(null);
	
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
	const verifyDriverPin = useMutation(api.functions.rides.verifyDriverPin.verifyDriverPin);

	// Helper to determine ride status
	const rideStatus = taxiInfo?.status as 'requested' | 'accepted' | 'in_progress' | 'started' | 'completed' | 'cancelled' | undefined;
	const updateTaxiSeatAvailability = useMutation(api.functions.taxis.updateAvailableSeats.updateTaxiSeatAvailability);

	const [hasFittedRoute, setHasFittedRoute] = useState(false);
	const [isFollowing, setIsFollowing] = useState(true);
	const [pin, setPin] = useState(['', '', '', '']);
	const [isVerifying, setIsVerifying] = useState(false);
	const [showPinEntry, setShowPinEntry] = useState(false);

	const passengerId = user?.id;
	const rideId = taxiInfo?.rideDocId;
	const driverId = taxiInfo?.driver?.userId;

	// Remove averageRating usage if not available
	const [hasShownDeclinedAlert, setHasShownDeclinedAlert] = useState(false);
	const [rideJustEnded, setRideJustEnded] = useState(false);

	const startTripConvex = useMutation(api.functions.earnings.startTrip.startTrip);
	const endTripConvex = useMutation(api.functions.earnings.endTrip.endTrip);

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
		},
		arrivalTimeBox: {
			backgroundColor: isDark ? theme.surface : "#121212",
			borderRadius: 30,
			paddingVertical: 16,
			paddingHorizontal: 20,
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