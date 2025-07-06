// platform/app/(tabs)/TaxiInformation.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Linking,
  Image,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useUser } from '../../contexts/UserContext';
import Icon from 'react-native-vector-icons/Ionicons';
import loading from '../../assets/images/loading4.png';

export default function TaxiInformation() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user } = useUser();

  // Get route parameters
  const {
    destinationName,
    destinationLat,
    destinationLng,
    currentName,
    currentLat,
    currentLng,
    routeId,
    availableTaxisCount,
    routeMatchData: routeMatchDataString,
  } = useLocalSearchParams<{
    destinationName: string;
    destinationLat: string;
    destinationLng: string;
    currentName: string;
    currentLat: string;
    currentLng: string;
    routeId: string;
    availableTaxisCount?: string;
    routeMatchData?: string;
  }>();

  // State management
  const [selectedTaxi, setSelectedTaxi] = useState<any>(null);
  const [nearbyTaxis, setNearbyTaxis] = useState<any[]>([]);
  const [availableTaxis, setAvailableTaxis] = useState<any[]>([]);
  const [routeMatchData, setRouteMatchData] = useState<any>(null);
  const [isLoadingTaxis, setIsLoadingTaxis] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Convex mutations - using your existing requestRide function
  const requestRide = useMutation(api.functions.rides.RequestRide.requestRide);

  // Process enhanced data from HomeScreen
  useEffect(() => {
    if (routeMatchDataString) {
      try {
        const parsedData = JSON.parse(routeMatchDataString);
        setRouteMatchData(parsedData);
        setAvailableTaxis(parsedData.availableTaxis || []);
        setIsLoadingTaxis(false);
        
        console.log('📊 TaxiInformation received enhanced data:', {
          availableTaxis: parsedData.availableTaxis?.length || 0,
          matchingRoutes: parsedData.matchingRoutes?.length || 0
        });
        
        // Transform enhanced data to display format
        const enhancedTaxiData = parsedData.availableTaxis?.map((taxi: any) => ({
          _id: taxi.driverId,
          userId: taxi.userId,
          latitude: taxi.currentLocation.latitude,
          longitude: taxi.currentLocation.longitude,
          name: taxi.name,
          phoneNumber: taxi.phoneNumber,
          vehicleRegistration: taxi.vehicleRegistration,
          vehicleModel: taxi.vehicleModel,
          distanceToOrigin: taxi.distanceToOrigin,
          routeInfo: taxi.routeInfo,
          // Additional display fields
          displayName: `${taxi.name} - ${taxi.vehicleModel}`,
          displayDistance: `${taxi.distanceToOrigin}km away`,
          routeName: taxi.routeInfo.routeName,
          fare: taxi.routeInfo.fare,
        })) || [];
        
        setNearbyTaxis(enhancedTaxiData);
        
      } catch (error) {
        console.error('❌ Error parsing route match data:', error);
        setIsLoadingTaxis(false);
      }
    } else {
      console.log('⚠️ No enhanced data received, falling back to original query');
      setIsLoadingTaxis(false);
    }
  }, [routeMatchDataString]);

  // Fallback query for backward compatibility
  const shouldUseOriginalQuery = !routeMatchDataString;
  
  const fallbackNearbyTaxis = useQuery(
    api.functions.routes.enhancedTaxiMatching.getNearbyTaxisForRouteRequest,
    shouldUseOriginalQuery && currentLat && currentLng && destinationLat && destinationLng
      ? {
          passengerLat: parseFloat(currentLat),
          passengerLng: parseFloat(currentLng),
          passengerEndLat: parseFloat(destinationLat),
          passengerEndLng: parseFloat(destinationLng),
        }
      : "skip"
  );

  // Use fallback data if no enhanced data was provided
  useEffect(() => {
    if (shouldUseOriginalQuery && fallbackNearbyTaxis) {
      console.log('📱 Using fallback taxi query result');
      setNearbyTaxis(fallbackNearbyTaxis);
      setIsLoadingTaxis(false);
    }
  }, [fallbackNearbyTaxis, shouldUseOriginalQuery]);

  // Animation for book button
  useEffect(() => {
    if (selectedTaxi) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      buttonOpacity.setValue(0);
    }
  }, [selectedTaxi]);

  // Handle taxi selection
  const handleTaxiSelect = (taxi: any) => {
    setSelectedTaxi(taxi);
  };

  // Handle phone call
  const handleCallDriver = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        console.error('Error opening phone app:', err);
        Alert.alert('Error', 'Could not open phone app');
      });
  };

  // Handle ride booking using your existing requestRide function
  const handleBookRide = async () => {
    if (!selectedTaxi || !user?.id) {
      Alert.alert('Error', 'Please select a taxi and ensure you are logged in');
      return;
    }

    setIsBooking(true);

    try {
      const rideData = {
        passengerId: user.id as Id<"taxiTap_users">, // Cast to proper type
        driverId: selectedTaxi.userId as Id<"taxiTap_users">, // Cast to proper type
        startLocation: {
          coordinates: {
            latitude: parseFloat(currentLat),
            longitude: parseFloat(currentLng),
          },
          address: currentName,
        },
        endLocation: {
          coordinates: {
            latitude: parseFloat(destinationLat),
            longitude: parseFloat(destinationLng),
          },
          address: destinationName,
        },
        estimatedFare: selectedTaxi.routeInfo?.fare || 0,
        estimatedDuration: typeof selectedTaxi.routeInfo?.estimatedDuration === 'string' 
          ? parseInt(selectedTaxi.routeInfo.estimatedDuration) || 30
          : selectedTaxi.routeInfo?.estimatedDuration || 30,
      };

      console.log('📝 Creating ride request:', rideData);

      const result = await requestRide(rideData);

      if (result) {
        Alert.alert(
          'Ride Request Sent',
          `Your ride request has been sent to ${selectedTaxi.name}. You will be notified when the driver responds.`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push({
                  pathname: './PassengerReservation',
                  params: {
                    currentLat,
                    currentLng,
                    currentName,
                    destinationLat,
                    destinationLng,
                    destinationName,
                    driverId: selectedTaxi.userId,
                    driverName: selectedTaxi.name,
                    fare: selectedTaxi.routeInfo?.fare?.toString() || '0',
                    rideId: result.rideId,
                  },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error creating ride request:', error);
      Alert.alert(
        'Booking Error',
        'Failed to send ride request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsBooking(false);
    }
  };

  // Enhanced taxi card rendering
  const renderTaxiCard = (taxi: any, index: number) => {
    const isEnhanced = taxi.routeInfo;
    const isSelected = selectedTaxi?._id === taxi._id;
    
    return (
      <TouchableOpacity
        key={taxi._id || index}
        style={[
          dynamicStyles.taxiCard,
          isSelected && dynamicStyles.selectedTaxiCard
        ]}
        onPress={() => handleTaxiSelect(taxi)}
      >
        <View style={dynamicStyles.taxiInfo}>
          <View style={dynamicStyles.taxiHeader}>
            <Text style={dynamicStyles.taxiName}>
              {taxi.name || `Driver ${index + 1}`}
            </Text>
            {isEnhanced && (
              <View style={dynamicStyles.distanceBadge}>
                <Text style={dynamicStyles.distanceText}>
                  {taxi.distanceToOrigin}km
                </Text>
              </View>
            )}
          </View>
          
          <View style={dynamicStyles.taxiDetails}>
            <Text style={dynamicStyles.taxiDetailText}>
              🚗 {taxi.vehicleModel || 'Vehicle info not available'}
            </Text>
            <Text style={dynamicStyles.taxiDetailText}>
              📋 {taxi.vehicleRegistration || 'Registration not available'}
            </Text>
            
            {isEnhanced && taxi.routeInfo && (
              <>
                <Text style={dynamicStyles.routeInfoText}>
                  🛣️ Route: {taxi.routeInfo.routeName}
                </Text>
                <Text style={dynamicStyles.routeInfoText}>
                  💰 Fare: R{taxi.routeInfo.fare}
                </Text>
                <Text style={dynamicStyles.routeInfoText}>
                  ⏱️ Est. Duration: {taxi.routeInfo.estimatedDuration}
                </Text>
                
                {taxi.routeInfo.closestStartStop && (
                  <Text style={dynamicStyles.stopInfoText}>
                    📍 Pickup near: {taxi.routeInfo.closestStartStop.name}
                    ({taxi.routeInfo.closestStartStop.distanceFromOrigin}km)
                  </Text>
                )}
                {taxi.routeInfo.closestEndStop && (
                  <Text style={dynamicStyles.stopInfoText}>
                    🏁 Drop-off near: {taxi.routeInfo.closestEndStop.name}
                    ({taxi.routeInfo.closestEndStop.distanceFromDestination}km)
                  </Text>
                )}
              </>
            )}
            
            {taxi.phoneNumber && (
              <TouchableOpacity
                style={dynamicStyles.callButton}
                onPress={() => handleCallDriver(taxi.phoneNumber)}
              >
                <Icon name="call" size={16} color="#4CAF50" />
                <Text style={dynamicStyles.callButtonText}>Call Driver</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={dynamicStyles.taxiActions}>
          <Text style={[
            dynamicStyles.selectText,
            isSelected && { color: theme.primary }
          ]}>
            {isSelected ? '✓ Selected' : 'Select'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Journey summary component
  const renderJourneySummary = () => {
    if (!routeMatchData || !selectedTaxi) return null;
    
    const selectedTaxiRoute = selectedTaxi.routeInfo;
    
    return (
      <View style={dynamicStyles.journeySummaryCard}>
        <Text style={dynamicStyles.journeySummaryTitle}>Journey Summary</Text>
        
        <View style={dynamicStyles.summaryRow}>
          <Text style={dynamicStyles.summaryLabel}>Driver:</Text>
          <Text style={dynamicStyles.summaryValue}>{selectedTaxi.name}</Text>
        </View>
        
        <View style={dynamicStyles.summaryRow}>
          <Text style={dynamicStyles.summaryLabel}>Vehicle:</Text>
          <Text style={dynamicStyles.summaryValue}>{selectedTaxi.vehicleModel}</Text>
        </View>
        
        {selectedTaxiRoute && (
          <>
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Route:</Text>
              <Text style={dynamicStyles.summaryValue}>{selectedTaxiRoute.routeName}</Text>
            </View>
            
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Taxi Association:</Text>
              <Text style={dynamicStyles.summaryValue}>{selectedTaxiRoute.taxiAssociation}</Text>
            </View>
            
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Fare:</Text>
              <Text style={[dynamicStyles.summaryValue, { color: theme.primary, fontWeight: 'bold' }]}>
                R{selectedTaxiRoute.fare}
              </Text>
            </View>
            
            <View style={dynamicStyles.summaryRow}>
              <Text style={dynamicStyles.summaryLabel}>Est. Duration:</Text>
              <Text style={dynamicStyles.summaryValue}>{selectedTaxiRoute.estimatedDuration}</Text>
            </View>
          </>
        )}
        
        <View style={dynamicStyles.summaryRow}>
          <Text style={dynamicStyles.summaryLabel}>Driver Distance:</Text>
          <Text style={dynamicStyles.summaryValue}>{selectedTaxi.distanceToOrigin}km away</Text>
        </View>
      </View>
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingTop: 60,
      backgroundColor: theme.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.buttonText || '#FFFFFF',
      marginBottom: 10,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.buttonText || '#FFFFFF',
      opacity: 0.9,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    taxiList: {
      flex: 1,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 20,
    },
    matchSummaryCard: {
      backgroundColor: isDark ? theme.surface : `${theme.primary}15`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    matchSummaryTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    matchSummaryText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    taxiCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? theme.border : 'transparent',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
      flexDirection: 'row',
    },
    selectedTaxiCard: {
      borderColor: theme.primary,
      borderWidth: 2,
      backgroundColor: isDark ? theme.surface : `${theme.primary}10`,
    },
    taxiInfo: {
      flex: 1,
    },
    taxiHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    taxiName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    distanceBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    distanceText: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    taxiDetails: {
      marginTop: 8,
    },
    taxiDetailText: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 4,
    },
    routeInfoText: {
      fontSize: 14,
      color: theme.primary,
      marginBottom: 2,
      fontWeight: '500',
    },
    stopInfoText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 2,
      fontStyle: 'italic',
    },
    callButton: {
      backgroundColor: isDark ? theme.surface : '#E8F5E8',
      borderColor: '#4CAF50',
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 8,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
    },
    callButtonText: {
      color: '#4CAF50',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 6,
    },
    taxiActions: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 16,
    },
    selectText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    journeySummaryCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      marginBottom: 20,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    journeySummaryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      flex: 1,
    },
    summaryValue: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
    },
    noTaxisContainer: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      marginTop: 20,
    },
    noTaxisTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    noTaxisText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    noTaxisSubtext: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    bookButton: {
      position: 'absolute',
      bottom: 30,
      left: 20,
      right: 20,
      backgroundColor: theme.primary,
      borderRadius: 25,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 5,
    },
    bookButtonText: {
      color: theme.buttonText || '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
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
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={dynamicStyles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Header */}
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Available Taxis</Text>
        <Text style={dynamicStyles.headerSubtitle}>
          From {currentName} to {destinationName}
        </Text>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView style={dynamicStyles.taxiList} showsVerticalScrollIndicator={false}>
          {isLoadingTaxis ? (
            <View style={dynamicStyles.loadingContainer}>
              <Image source={loading} style={{ width: 80, height: 80 }} resizeMode="contain" />
              <Text style={dynamicStyles.loadingText}>Finding available taxis...</Text>
            </View>
          ) : nearbyTaxis.length > 0 ? (
            <>
              {/* Route match summary */}
              {routeMatchData && (
                <View style={dynamicStyles.matchSummaryCard}>
                  <Text style={dynamicStyles.matchSummaryTitle}>
                    Found {routeMatchData.availableTaxis.length} Available Taxis
                  </Text>
                  <Text style={dynamicStyles.matchSummaryText}>
                    on {routeMatchData.matchingRoutes.length} matching routes
                  </Text>
                </View>
              )}
              
              {/* Taxi cards */}
              {nearbyTaxis.map((taxi, index) => renderTaxiCard(taxi, index))}
              
              {/* Journey summary */}
              {renderJourneySummary()}
              
              {/* Bottom padding for button */}
              <View style={{ height: 100 }} />
            </>
          ) : (
            <View style={dynamicStyles.noTaxisContainer}>
              <Text style={dynamicStyles.noTaxisTitle}>No Available Taxis</Text>
              <Text style={dynamicStyles.noTaxisText}>
                {routeMatchData?.message || 'No taxis found on routes connecting your origin and destination.'}
              </Text>
              <Text style={dynamicStyles.noTaxisSubtext}>
                Try adjusting your pickup location or check again later.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Book Ride Button */}
      {selectedTaxi && (
        <Animated.View style={{ opacity: buttonOpacity }}>
          <TouchableOpacity
            style={dynamicStyles.bookButton}
            onPress={handleBookRide}
            disabled={isBooking}
          >
            <Text style={dynamicStyles.bookButtonText}>
              {isBooking ? 'Booking Ride...' : `Book Ride with ${selectedTaxi.name}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}