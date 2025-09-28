import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from "@expo/vector-icons";
import { useUser } from '../../contexts/UserContext';
import { useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { isMultiLegJourney, getNextLeg } from '../../utils/multiLegJourneyHelpers';
import { useMultiLegJourney } from '../../contexts/MultiLegJourneyContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PaymentConfirmation() {
  const { user } = useUser();
  const router = useRouter();
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
    // Multi-leg journey parameters
    journeyId,
    legIndex,
    totalLegs,
    isMultiLeg,
    continueToNext
  } = useLocalSearchParams();
  const { showGlobalAlert, showGlobalSuccess, showGlobalError } = useAlertHelpers();
  const { clearMapContext } = useMapContext();
  const { currentLanguage } = useLanguage();

  // Hardcoded translations
  const translations = {
    en: {
      legPaymentConfirmed: "Leg Payment Confirmed",
      paymentConfirmed: "Payment Confirmed",
      thankYouForPayment: "Thank you for confirming your payment!",
      paymentConfirmationFailed: "Payment Confirmation Failed",
      unableToConfirmPayment: "Unable to confirm payment. Please try again.",
      paymentRequired: "Payment Required",
      cancelJourney: "Cancel Journey",
      paymentNotConfirmed: "Payment Not Confirmed",
      rememberToPayDriver: "Please remember to pay your driver. You can still provide feedback about your ride.",
      continueToFeedback: "Continue to Feedback",
      skipFeedback: "Skip Feedback",
      updateFailed: "Update Failed",
      unableToUpdatePayment: "Unable to update payment status. Please try again.",
      legPayment: "Leg Payment",
      tripPayment: "Trip Payment",
      noRatings: "No ratings",
      legFare: "Leg Fare:",
      totalFare: "Total Fare:"
    },
    tn: {
      legPaymentConfirmed: "Tefo ya Lege e Tiisetswe",
      paymentConfirmed: "Tefo e Tiisetswe",
      thankYouForPayment: "Re leboga go tiisetsa tefo ya gago!",
      paymentConfirmationFailed: "Go Tiisetsa Tefo go Hlolekile",
      unableToConfirmPayment: "Ga go kgonege go tiisetsa tefo. Ka kopo leka gape.",
      paymentRequired: "Tefo e Tlhoka",
      cancelJourney: "Khansela Leeto",
      paymentNotConfirmed: "Tefo e sa Tiisetsweng",
      rememberToPayDriver: "Ka kopo gopola go lefa mokgweetsi wa gago. O ka nna o ntsha dikakaretso ka leeto la gago.",
      continueToFeedback: "Tswela Pele go Dikakaretso",
      skipFeedback: "Tlogela Dikakaretso",
      updateFailed: "Go Ntsha go Hlolekile",
      unableToUpdatePayment: "Ga go kgonege go ntsha boemo jwa tefo. Ka kopo leka gape.",
      legPayment: "Tefo ya Lege",
      tripPayment: "Tefo ya Leeto",
      noRatings: "Ga go na dikakaretso",
      legFare: "Tefo ya Lege:",
      totalFare: "Tefo e Feletseng:"
    },
    zu: {
      legPaymentConfirmed: "Inkokhelo Yemilenze Iqinisekisiwe",
      paymentConfirmed: "Inkokhelo Iqinisekisiwe",
      thankYouForPayment: "Siyabonga ngokuqinisekisa inkokhelo yakho!",
      paymentConfirmationFailed: "Ukuqinisekisa Inkokhelo Kuhlulekile",
      unableToConfirmPayment: "Akukwazanga ukuqinisekisa inkokhelo. Sicela uzame futhi.",
      paymentRequired: "Inkokhelo Iyadingeka",
      cancelJourney: "Khansela Uhambo",
      paymentNotConfirmed: "Inkokhelo Engaqinisekisiwe",
      rememberToPayDriver: "Sicela ukhumbule ukukhokha umshayeli wakho. Usengakwazi ukunikeza impendulo ngohambo lwakho.",
      continueToFeedback: "Qhubeka Kuya Empendulweni",
      skipFeedback: "Yeza Impendulo",
      updateFailed: "Ukubuyekeza Kuhlulekile",
      unableToUpdatePayment: "Akukwazanga ukubuyekeza isimo senkokhelo. Sicela uzame futhi.",
      legPayment: "Inkokhelo Yemilenze",
      tripPayment: "Inkokhelo Yohambo",
      noRatings: "Awukho izilinganiso",
      legFare: "Imali Yemilenze:",
      totalFare: "Imali Ephelele:"
    },
    af: {
      legPaymentConfirmed: "Been Betaling Bevestig",
      paymentConfirmed: "Betaling Bevestig",
      thankYouForPayment: "Dankie dat jy jou betaling bevestig het!",
      paymentConfirmationFailed: "Betaling Bevestiging Misluk",
      unableToConfirmPayment: "Kon nie betaling bevestig nie. Probeer asseblief weer.",
      paymentRequired: "Betaling Vereis",
      cancelJourney: "Kanselleer Reis",
      paymentNotConfirmed: "Betaling Nie Bevestig Nie",
      rememberToPayDriver: "Onthou asseblief om jou bestuurder te betaal. Jy kan steeds terugvoer oor jou rit gee.",
      continueToFeedback: "Gaan Voort na Terugvoer",
      skipFeedback: "Slaan Terugvoer Oor",
      updateFailed: "Opdatering Misluk",
      unableToUpdatePayment: "Kon nie betaling status opdateer nie. Probeer asseblief weer.",
      legPayment: "Been Betaling",
      tripPayment: "Rit Betaling",
      noRatings: "Geen graderings nie",
      legFare: "Been Tarief:",
      totalFare: "Totale Tarief:"
    }
  };

  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };
  
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
          t('legPaymentConfirmed'),
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
                  isMultiLeg: 'true',
                  journeyId: journeyId as string,
                  legIndex: legIndex as string,
                  totalLegs: totalLegs as string,
                  routeName: '',
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
                isMultiLeg: 'true',
                journeyId: journeyId as string,
                legIndex: legIndex as string,
                totalLegs: totalLegs as string,
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
          t('paymentConfirmed'),
          t('thankYouForPayment'),
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
                isMultiLeg: isMultiLeg as string,
                journeyId: journeyId as string,
                legIndex: legIndex as string,
                totalLegs: totalLegs as string,
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
              },
            });
          }
        }, 2000);
      }

    } catch (error: any) {
      showGlobalError(
        t('paymentConfirmationFailed'),
        error?.message || t('unableToConfirmPayment'),
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
          title: t('paymentRequired'),
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
              label: t('cancelJourney'),
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
          title: t('paymentNotConfirmed'),
          message: t('rememberToPayDriver'),
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: t('continueToFeedback'),
            onPress: () => {
              router.push({
                pathname: '/SubmitFeedback',
                params: {
                  rideId: rideId as string,
                  startName: startName as string,
                  endName: endName as string,
                  passengerId: passengerId as string || userId as string,
                  driverId: driverId as string,
                },
              });
            },
            style: 'default',
          },
          {
            label: t('skipFeedback'),
            onPress: async () => {
              clearMapContext();
              router.push('/HomeScreen');
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
        t('updateFailed'),
        error?.message || t('unableToUpdatePayment'),
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
    }
  };

  return (
    <View style={[styles.safeArea]}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>
          {isMultiLeg === 'true' ? t('legPayment') : t('tripPayment')}
        </Text>

        {/* Multi-leg progress indicator */}
        {isMultiLeg === 'true' && legIndex !== undefined && totalLegs && (
          <View style={styles.legProgressCard}>
            <View style={styles.legProgressHeader}>
              <Ionicons name="map-outline" size={20} color="#FF9900" />
              <Text style={styles.legProgressText}>
                Leg {parseInt(legIndex as string) + 1} of {totalLegs}
              </Text>
            </View>
            <Text style={styles.legProgressSubtext}>Multi-leg journey in progress</Text>
          </View>
        )}

        <View style={[styles.card, styles.tripDetails]}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={18} color="#2B2B2B" />
            <View style={styles.driverInfoContainer}>
              <Text style={styles.detailText}>Driver: {driverName}</Text>
              <View style={styles.driverRating}>
                <Text style={styles.ratingText}>
                  {typeof driverRating === "number" && driverRating > 0
                    ? driverRating.toFixed(1)
                    : t('noRatings')}
                </Text>
                <View style={styles.starsContainer}>
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
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={18} color="#2B2B2B" />
            <Text style={styles.detailText}>License: {licensePlate}</Text>
          </View>
          {isMultiLeg === 'true' && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="#2B2B2B" />
              <Text style={styles.detailText}>This leg: {startName} → {endName}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={18} color="#FF9900" />
            <View style={styles.fareInfo}>
              <Text style={styles.fareLabel}>
                {isMultiLeg === 'true' ? t('legFare') : t('totalFare')}
              </Text>
              <Text style={styles.fareAmount}>R{fare}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.questionText}>Have you paid the driver?</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.paidButton]} onPress={handlePaid}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.buttonText}>Yes, I paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.notPaidButton]} onPress={handleNotPaid}>
            <Ionicons name="close-circle" size={22} color="#fff" />
            <Text style={styles.buttonText}>No, not yet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, flex: 1, justifyContent: "center" },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#2B2B2B", marginBottom: 24, textAlign: "center" },
  legProgressCard: {
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9900",
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
    color: "#666",
    fontStyle: "italic",
  },
  card: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  tripDetails: {},
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  detailText: { fontSize: 16, fontWeight: "500", color: "#2B2B2B" },
  driverInfoContainer: { flex: 1 },
  driverRating: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  ratingText: { 
    fontSize: 12, 
    fontWeight: "500", 
    color: "#2B2B2B", 
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
    borderTopColor: "#e9ecef"
  },
  fareLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2B2B2B",
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF9900",
  },
  questionText: { fontSize: 18, fontWeight: "500", color: "#2B2B2B", marginBottom: 24, textAlign: "center" },
  buttonRow: { flexDirection: "row", gap: 16, justifyContent: "center" },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  paidButton: { backgroundColor: "#2ECC71" },
  notPaidButton: { backgroundColor: "#E74C3C" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});