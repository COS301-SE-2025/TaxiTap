import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from "@expo/vector-icons";
import { useUser } from '../../contexts/UserContext';
import { useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { isMultiLegJourney, getNextLeg } from '../../utils/multiLegJourneyHelpers';
import { useMultiLegJourney } from '../../contexts/MultiLegJourneyContext';
import { useMapContext } from '../../contexts/MapContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function PaymentConfirmation() {
  const { user } = useUser();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const userId = user?.id;
  const {
    driverName,
    licensePlate,
    fare,
    rideId,
    startName,
    endName,
    driverId,
    passengerId,
    // Location parameters
    currentLat,
    currentLng,
    currentName,
    destinationLat,
    destinationLng,
    destinationName,
    // Route parameters
    routeId,
    estimatedFare,
    availableTaxisCount,
    routeMatchData,
    // Multi-leg journey parameters
    journeyId,
    legIndex,
    totalLegs,
    isMultiLeg,
    continueToNext,
    routeName
  } = useLocalSearchParams();
  const { showGlobalAlert, showGlobalSuccess, showGlobalError } = useAlertHelpers();
  const { clearMapContext } = useMapContext();
  
  // Safe access to MultiLegJourneyProvider with fallback
  let clearJourneyCache: (() => Promise<void>) | undefined;
  try {
    const multiLegJourneyContext = useMultiLegJourney();
    clearJourneyCache = multiLegJourneyContext.clearJourneyCache;
  } catch (error) {
    // Provider not available, provide a no-op fallback
    console.warn('MultiLegJourneyProvider not available, using fallback');
    clearJourneyCache = async () => {};
  }

  const markTripPaid = useMutation(api.functions.rides.tripPaid.tripPaid);
  const processLegPayment = useMutation(api.functions.journeys.journeyStateManager.completeLegWithPayment);

  // Get driver rating
  const driverRating = useQuery(
    api.functions.feedback.averageRating.getAverageRating,
    driverId ? { driverId: driverId as Id<"taxiTap_users"> } : "skip"
  );

  const handlePaid = async () => {
    try {
      // Check if this is a multi-leg journey
      if (isMultiLeg === 'true' && journeyId && legIndex !== undefined) {
        // Use multi-leg payment handler
        const result = await processLegPayment({
          journeyId: journeyId as string,
          legIndex: parseInt(legIndex as string),
          actualCost: parseFloat(fare as string),
        });

        const currentLeg = parseInt(legIndex as string) + 1;
        const total = parseInt(totalLegs as string);

        showGlobalSuccess(
          'Leg Payment Confirmed',
          `Payment for leg ${currentLeg} of ${total} confirmed!${!result.journeyComplete ? ' Ready for next leg.' : ' Journey completed!'}`,
          { duration: 3000, position: 'top', animation: 'slide-down' }
        );

        setTimeout(async () => {
          if (!result.journeyComplete) {
            // Check if this is a continue to next leg flow
            if (continueToNext === 'true') {
              // Navigate to feedback first, then to TaxiInformation
              router.push({
                pathname: '/SubmitFeedback',
                params: {
                  rideId: rideId as string,
                  startName: startName as string,
                  endName: endName as string,
                  passengerId: passengerId as string || userId as string,
                  driverId: driverId as string,
                  actualFare: fare as string,
                  // Location parameters
                  currentLat: currentLat as string,
                  currentLng: currentLng as string,
                  currentName: currentName as string,
                  destinationLat: destinationLat as string,
                  destinationLng: destinationLng as string,
                  destinationName: destinationName as string,
                  // Driver/taxi parameters
                  driverName: driverName as string,
                  licensePlate: licensePlate as string,
                  fare: fare as string,
                  estimatedFare: estimatedFare as string,
                  // Route parameters
                  routeId: routeId as string,
                  availableTaxisCount: availableTaxisCount as string,
                  routeMatchData: routeMatchData as string,
                  // Multi-leg journey parameters
                  isMultiLeg: 'true',
                  journeyId: journeyId as string,
                  legIndex: legIndex as string,
                  totalLegs: totalLegs as string,
                  routeName: routeName as string || '',
                  continueToNext: 'true',
                },
              });
            } else {
              // Navigate back to journey progress or next leg preparation
              // Clear states since this is likely an incomplete journey being abandoned
              clearMapContext();
              await clearJourneyCache();
              router.push('/HomeScreen');
            }
          } else {
            // Journey completed - go to feedback for the final leg
            router.push({
              pathname: '/SubmitFeedback',
              params: {
                rideId: rideId as string,
                startName: startName as string,
                endName: endName as string,
                passengerId: passengerId as string || userId as string,
                driverId: driverId as string,
                actualFare: fare as string,
                // Location parameters
                currentLat: currentLat as string,
                currentLng: currentLng as string,
                currentName: currentName as string,
                destinationLat: destinationLat as string,
                destinationLng: destinationLng as string,
                destinationName: destinationName as string,
                // Driver/taxi parameters
                driverName: driverName as string,
                licensePlate: licensePlate as string,
                fare: fare as string,
                estimatedFare: estimatedFare as string,
                // Route parameters
                routeId: routeId as string,
                availableTaxisCount: availableTaxisCount as string,
                routeMatchData: routeMatchData as string,
                // Multi-leg journey parameters
                isMultiLeg: 'true',
                journeyId: journeyId as string,
                legIndex: legIndex as string,
                totalLegs: totalLegs as string,
                routeName: routeName as string || '',
              },
            });
          }
        }, 3000);
      } else {
        // Original single-leg payment logic
        const result = await markTripPaid({
          rideId: rideId as string,
          userId: userId as Id<"taxiTap_users">,
          paid: true,
        });

        showGlobalSuccess(
          'Payment Confirmed',
          'Thank you for confirming your payment!',
          { duration: 2000, position: 'top', animation: 'slide-down' }
        );

        setTimeout(() => {
          if (continueToNext === 'true') {
            // Navigate to feedback with continue flag for next leg
            router.push({
              pathname: '/SubmitFeedback',
              params: {
                rideId: rideId as string,
                startName: startName as string,
                endName: endName as string,
                passengerId: passengerId as string || userId as string,
                driverId: driverId as string,
                actualFare: fare as string,
                // Location parameters
                currentLat: currentLat as string,
                currentLng: currentLng as string,
                currentName: currentName as string,
                destinationLat: destinationLat as string,
                destinationLng: destinationLng as string,
                destinationName: destinationName as string,
                // Driver/taxi parameters
                driverName: driverName as string,
                licensePlate: licensePlate as string,
                fare: fare as string,
                estimatedFare: estimatedFare as string,
                // Route parameters
                routeId: routeId as string,
                availableTaxisCount: availableTaxisCount as string,
                routeMatchData: routeMatchData as string,
                // Multi-leg journey parameters
                isMultiLeg: isMultiLeg as string,
                journeyId: journeyId as string,
                legIndex: legIndex as string,
                totalLegs: totalLegs as string,
                routeName: routeName as string || '',
                continueToNext: 'true',
              },
            });
          } else {
            // Standard single-leg payment flow
            router.push({
              pathname: '/SubmitFeedback',
              params: {
                rideId: rideId as string,
                startName: startName as string,
                endName: endName as string,
                passengerId: passengerId as string || userId as string,
                driverId: driverId as string,
                actualFare: fare as string,
                // Location parameters
                currentLat: currentLat as string,
                currentLng: currentLng as string,
                currentName: currentName as string,
                destinationLat: destinationLat as string,
                destinationLng: destinationLng as string,
                destinationName: destinationName as string,
                // Driver/taxi parameters
                driverName: driverName as string,
                licensePlate: licensePlate as string,
                fare: fare as string,
                estimatedFare: estimatedFare as string,
                // Route parameters
                routeId: routeId as string,
                availableTaxisCount: availableTaxisCount as string,
                routeMatchData: routeMatchData as string,
                // Multi-leg journey parameters (for single-leg rides, these will be undefined)
                isMultiLeg: isMultiLeg as string,
                journeyId: journeyId as string,
                legIndex: legIndex as string,
                totalLegs: totalLegs as string,
                routeName: routeName as string || '',
              },
            });
          }
        }, 2000);
      }

    } catch (error: any) {
      showGlobalError(
        'Payment Confirmation Failed',
        error?.message || 'Unable to confirm payment. Please try again.',
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
    }
  };

  const handleNotPaid = async () => {
    try {
      // Check if this is a multi-leg journey
      if (isMultiLeg === 'true' && journeyId && legIndex !== undefined) {
        // Use multi-leg payment handler for "not paid"
        const result = await processLegPayment({
          journeyId: journeyId as string,
          legIndex: parseInt(legIndex as string),
          actualCost: 0,
        });

        const currentLeg = parseInt(legIndex as string) + 1;
        const total = parseInt(totalLegs as string);

        showGlobalAlert({
          title: 'Payment Required',
          message: `Payment for leg ${currentLeg} of ${total} is required before continuing your journey. Please pay the driver to proceed.`,
          type: 'warning',
          duration: 0,
          actions: [
            {
              label: 'I Will Pay Now',
              onPress: () => {
                // Stay on payment screen to try again
              },
              style: 'default',
            },
            {
              label: 'Cancel Journey',
              onPress: async () => {
                clearMapContext();
                await clearJourneyCache();
                router.push('/HomeScreen');
              },
              style: 'cancel',
            }
          ],
          position: 'top',
          animation: 'slide-down',
        });
      } else {
        // Original single-leg "not paid" logic
        const result = await markTripPaid({
          rideId: rideId as string,
          userId: userId as Id<"taxiTap_users">,
          paid: false,
        });

        showGlobalAlert({
          title: 'Payment Not Confirmed',
          message: 'Please remember to pay your driver. You can still provide feedback about your ride.',
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: 'Continue to Feedback',
            onPress: () => {
              router.push({
                pathname: '/SubmitFeedback',
                params: {
                  rideId: rideId as string,
                  startName: startName as string,
                  endName: endName as string,
                  passengerId: passengerId as string || userId as string,
                  driverId: driverId as string,
                  actualFare: fare as string,
                  // Location parameters
                  currentLat: currentLat as string,
                  currentLng: currentLng as string,
                  currentName: currentName as string,
                  destinationLat: destinationLat as string,
                  destinationLng: destinationLng as string,
                  destinationName: destinationName as string,
                  // Driver/taxi parameters
                  driverName: driverName as string,
                  licensePlate: licensePlate as string,
                  fare: fare as string,
                  estimatedFare: estimatedFare as string,
                  // Route parameters
                  routeId: routeId as string,
                  availableTaxisCount: availableTaxisCount as string,
                  routeMatchData: routeMatchData as string,
                  // Multi-leg journey parameters (for single-leg rides, these will be undefined)
                  isMultiLeg: isMultiLeg as string,
                  journeyId: journeyId as string,
                  legIndex: legIndex as string,
                  totalLegs: totalLegs as string,
                  routeName: routeName as string || '',
                },
              });
            },
            style: 'default',
          },
          {
            label: 'Skip Feedback',
            onPress: async () => {
              // For multi-leg journeys, we need to handle completion properly
              if (isMultiLeg === 'true' && journeyId && legIndex !== undefined) {
                try {
                  // Complete the leg even when skipping feedback
                  console.log(`Completing leg ${parseInt(legIndex as string) + 1} without feedback (skip from payment)`);
                  const legResult = await processLegPayment({
                    journeyId: journeyId as string,
                    legIndex: parseInt(legIndex as string),
                    actualCost: 0, // No payment confirmed
                  });

                  clearMapContext();
                  if (clearJourneyCache) {
                    await clearJourneyCache();
                  }
                  router.push('/HomeScreen');
                } catch (error) {
                  console.error('Error completing leg on skip:', error);
                  // Even if backend fails, still clear and navigate
                  clearMapContext();
                  if (clearJourneyCache) {
                    await clearJourneyCache();
                  }
                  router.push('/HomeScreen');
                }
              } else {
                // Standard single-leg skip
                clearMapContext();
                router.push('/HomeScreen');
              }
            },
            style: 'cancel',
          }
        ],
          position: 'top',
          animation: 'slide-down',
        });
      }

    } catch (error: any) {
      showGlobalError(
        'Update Failed',
        error?.message || 'Unable to update payment status. Please try again.',
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
    }
  };

  const dynamicStyles = StyleSheet.create({
    safeArea: { 
      flex: 1, 
      backgroundColor: theme.background 
    },
    container: { 
      padding: 24, 
      flex: 1, 
      justifyContent: "center" 
    },
    headerTitle: { 
      fontSize: 28, 
      fontWeight: "700", 
      color: theme.text, 
      marginBottom: 24, 
      textAlign: "center" 
    },
    legProgressCard: {
      backgroundColor: isDark ? 'rgba(255, 153, 0, 0.15)' : '#fff3e0',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: "#FF9900",
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 153, 0, 0.3)' : 'transparent',
    },
    legProgressHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    legProgressText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FF9900",
    },
    legProgressSubtext: {
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      fontStyle: "italic",
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
    },
    tripDetails: {},
    detailRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      marginBottom: 12, 
      gap: 8 
    },
    detailText: { 
      fontSize: 16, 
      fontWeight: "500", 
      color: theme.text 
    },
    driverInfoContainer: { 
      flex: 1 
    },
    driverRating: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginTop: 4 
    },
    ratingText: { 
      fontSize: 12, 
      fontWeight: "500", 
      color: theme.text, 
      marginRight: 4 
    },
    starsContainer: { 
      flexDirection: 'row' 
    },
    fareInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "90%",
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    fareLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    fareAmount: {
      fontSize: 24,
      fontWeight: "700",
      color: "#FF9900",
    },
    questionText: { 
      fontSize: 18, 
      fontWeight: "500", 
      color: theme.text, 
      marginBottom: 24, 
      textAlign: "center" 
    },
    buttonRow: { 
      flexDirection: "row", 
      gap: 16, 
      justifyContent: "center" 
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    paidButton: { 
      backgroundColor: isDark ? "#27ae60" : "#2ECC71" 
    },
    notPaidButton: { 
      backgroundColor: isDark ? "#c0392b" : "#E74C3C" 
    },
    buttonText: { 
      color: "#fff", 
      fontWeight: "600", 
      fontSize: 16 
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <View style={dynamicStyles.container}>
        <Text style={dynamicStyles.headerTitle}>
          {isMultiLeg === 'true' ? 'Leg Payment' : 'Trip Payment'}
        </Text>

        {/* Multi-leg progress indicator */}
        {isMultiLeg === 'true' && legIndex !== undefined && totalLegs && (
          <View style={dynamicStyles.legProgressCard}>
            <View style={dynamicStyles.legProgressHeader}>
              <Ionicons name="map-outline" size={20} color="#FF9900" />
              <Text style={dynamicStyles.legProgressText}>
                Leg {parseInt(legIndex as string) + 1} of {totalLegs}
              </Text>
            </View>
            <Text style={dynamicStyles.legProgressSubtext}>Multi-leg journey in progress</Text>
          </View>
        )}

        <View style={[dynamicStyles.card, dynamicStyles.tripDetails]}>
          <View style={dynamicStyles.detailRow}>
            <Ionicons name="person" size={18} color={theme.text} />
            <View style={dynamicStyles.driverInfoContainer}>
              <Text style={dynamicStyles.detailText}>Driver: {driverName}</Text>
              <View style={dynamicStyles.driverRating}>
                <Text style={dynamicStyles.ratingText}>
                  {typeof driverRating === "number" && driverRating > 0
                    ? driverRating.toFixed(1)
                    : "No ratings"}
                </Text>
                <View style={dynamicStyles.starsContainer}>
                  {typeof driverRating === "number" && driverRating > 0
                    ? [1, 2, 3, 4, 5].map((star, index) => {
                        const full = driverRating >= star;
                        const half = driverRating >= star - 0.5 && driverRating < star;

                        return (
                          <FontAwesome
                            key={index}
                            name={full ? "star" : half ? "star-half-full" : "star-o"}
                            size={12}
                            color="#FFD700"
                            style={{ marginRight: 1 }}
                          />
                        );
                      })
                    : null}
                </View>
              </View>
            </View>
          </View>
          <View style={dynamicStyles.detailRow}>
            <Ionicons name="car-outline" size={18} color={theme.text} />
            <Text style={dynamicStyles.detailText}>License: {licensePlate}</Text>
          </View>
          {isMultiLeg === 'true' && (
            <View style={dynamicStyles.detailRow}>
              <Ionicons name="location-outline" size={18} color={theme.text} />
              <Text style={dynamicStyles.detailText}>This leg: {startName} → {endName}</Text>
            </View>
          )}
          <View style={dynamicStyles.detailRow}>
            <Ionicons name="cash-outline" size={18} color="#FF9900" />
            <View style={dynamicStyles.fareInfo}>
              <Text style={dynamicStyles.fareLabel}>
                {isMultiLeg === 'true' ? 'Leg Fare:' : 'Total Fare:'}
              </Text>
              <Text style={dynamicStyles.fareAmount}>R{fare}</Text>
            </View>
          </View>
        </View>

        <Text style={dynamicStyles.questionText}>Have you paid the driver?</Text>

        <View style={dynamicStyles.buttonRow}>
          <TouchableOpacity 
            style={[dynamicStyles.button, dynamicStyles.paidButton]} 
            onPress={handlePaid}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={dynamicStyles.buttonText}>Yes, I paid</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[dynamicStyles.button, dynamicStyles.notPaidButton]} 
            onPress={handleNotPaid}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={22} color="#fff" />
            <Text style={dynamicStyles.buttonText}>No, not yet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}