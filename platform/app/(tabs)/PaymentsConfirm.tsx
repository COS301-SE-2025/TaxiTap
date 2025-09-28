import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import { useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { isMultiLegJourney, getNextLeg } from '../../utils/multiLegJourneyHelpers';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PaymentConfirmation() {
  const { user } = useUser();
  const router = useRouter();
  const userId = user?.id;
  const { currentLanguage } = useLanguage();
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

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    legPaymentConfirmed: {
      en: "Leg Payment Confirmed",
      zu: "Ukukhokha Kwesigaba Kuvunyisiwe",
      tn: "Tefelo ya Karolo e Amogetswe",
      af: "Been Betaling Bevestig"
    },
    legPaymentMessage: {
      en: "Payment for leg {current} of {total} confirmed!{ready}",
      zu: "Ukukhokha kwesigaba {current} kwe-{total} kuvunyisiwe!{ready}",
      tn: "Tefelo ya karolo {current} ya {total} e amogetswe!{ready}",
      af: "Betaling vir been {current} van {total} bevestig!{ready}"
    },
    readyForNextLeg: {
      en: " Ready for next leg.",
      zu: " Silungele isigaba esilandelayo.",
      tn: " Go siame go ya karolong e e latelang.",
      af: " Gereed vir volgende been."
    },
    journeyCompleted: {
      en: " Journey completed!",
      zu: " Uhambo luphelile!",
      tn: " Leetong le fedile!",
      af: " Reis voltooi!"
    },
    paymentConfirmed: {
      en: "Payment Confirmed",
      zu: "Ukukhokha Kuvunyisiwe",
      tn: "Tefelo e Amogetswe",
      af: "Betaling Bevestig"
    },
    thankYouForPayment: {
      en: "Thank you for confirming your payment!",
      zu: "Siyabonga ngokuvunyisa ukukhokha kwakho!",
      tn: "Re a leboga ka go amogela tefelo ya gago!",
      af: "Dankie dat jy jou betaling bevestig het!"
    },
    paymentConfirmationFailed: {
      en: "Payment Confirmation Failed",
      zu: "Ukukhokha Ukuvunyisa Kuhlulekile",
      tn: "Go Amogela Tefelo go Hlolekile",
      af: "Betaling Bevestiging Misluk"
    },
    unableToConfirmPayment: {
      en: "Unable to confirm payment. Please try again.",
      zu: "Akukwazi ukuvunyisa ukukhokha. Sicela uzame futhi.",
      tn: "Ga go kgone go amogela tefelo. Ka kopo o leke gape.",
      af: "Kon betaling nie bevestig nie. Probeer asseblief weer."
    },
    paymentRequired: {
      en: "Payment Required",
      zu: "Ukukhokha Kuyadingeka",
      tn: "Tefelo e Tlhoka",
      af: "Betaling Vereis"
    },
    paymentRequiredMessage: {
      en: "Payment for leg {current} of {total} is required before continuing your journey. Please pay the driver to proceed.",
      zu: "Ukukhokha kwesigaba {current} kwe-{total} kuyadingeka ngaphambi kokuqhubeka nohambo lwakho. Sicela ukhokhe umshayeli ukuze uqhubeke.",
      tn: "Tefelo ya karolo {current} ya {total} e tlhoka pele o tswelela leetong la gago. Ka kopo o fele mokgweetsi gore o tswelele.",
      af: "Betaling vir been {current} van {total} word vereis voordat jy jou reis voortgaan. Betaal asseblief die bestuurder om voort te gaan."
    },
    iWillPayNow: {
      en: "I Will Pay Now",
      zu: "Ngizokhokha Manje",
      tn: "Ke tla felela Jaanong",
      af: "Ek Sal Nou Betaal"
    },
    cancelJourney: {
      en: "Cancel Journey",
      zu: "Khansela Uhambo",
      tn: "Tlhokomolola Leetong",
      af: "Kanselleer Reis"
    },
    paymentNotConfirmed: {
      en: "Payment Not Confirmed",
      zu: "Ukukhokha Akukavunyisiwe",
      tn: "Tefelo ga e na e Amogetswe",
      af: "Betaling Nie Bevestig Nie"
    },
    paymentNotConfirmedMessage: {
      en: "Please remember to pay your driver. You can still provide feedback about your ride.",
      zu: "Sicela ukhumbule ukukhokha umshayeli wakho. Usengakwazi ukunikeza impendulo ngohambo lwakho.",
      tn: "Ka kopo o gopole go felela mokgweetsi wa gago. O sa kgona go naya maikutlo ka leetong la gago.",
      af: "Onthou asseblief om jou bestuurder te betaal. Jy kan steeds terugvoer oor jou rit gee."
    },
    continueToFeedback: {
      en: "Continue to Feedback",
      zu: "Qhubeka Uye Empendulweni",
      tn: "Tswela Pele go Maikutlo",
      af: "Gaan Voort na Terugvoer"
    },
    skipFeedback: {
      en: "Skip Feedback",
      zu: "Yeza Impendulo",
      tn: "Tlogela Maikutlo",
      af: "Slaan Terugvoer Oor"
    },
    updateFailed: {
      en: "Update Failed",
      zu: "Ukubuyekeza Kuhlulekile",
      tn: "Go Ntsha go Hlolekile",
      af: "Opdatering Misluk"
    },
    unableToUpdatePayment: {
      en: "Unable to update payment status. Please try again.",
      zu: "Akukwazi ukubuyekeza isimo sokukhokha. Sicela uzame futhi.",
      tn: "Ga go kgone go ntsha boemo jwa tefelo. Ka kopo o leke gape.",
      af: "Kon betaling status nie opdateer nie. Probeer asseblief weer."
    },
    legPayment: {
      en: "Leg Payment",
      zu: "Ukukhokha Kwesigaba",
      tn: "Tefelo ya Karolo",
      af: "Been Betaling"
    },
    tripPayment: {
      en: "Trip Payment",
      zu: "Ukukhokha Kwezohambo",
      tn: "Tefelo ya Leetong",
      af: "Rit Betaling"
    },
    leg: {
      en: "Leg",
      zu: "Isigaba",
      tn: "Karolo",
      af: "Been"
    },
    of: {
      en: "of",
      zu: "kwe",
      tn: "ya",
      af: "van"
    },
    multiLegJourneyInProgress: {
      en: "Multi-leg journey in progress",
      zu: "Uhambo lwezindawo eziningi luyaqhubeka",
      tn: "Leetong le dikarolo tse dintsi le tswelela",
      af: "Multi-been reis in vooruitgang"
    },
    driver: {
      en: "Driver:",
      zu: "Umshayeli:",
      tn: "Mokgweetsi:",
      af: "Bestuurder:"
    },
    license: {
      en: "License:",
      zu: "Ilayisense:",
      tn: "Tseno:",
      af: "Lisensie:"
    },
    thisLeg: {
      en: "This leg:",
      zu: "Lesi sigaba:",
      tn: "Karolo e:",
      af: "Hierdie been:"
    },
    legFare: {
      en: "Leg Fare:",
      zu: "Imali Yesigaba:",
      tn: "Tefelo ya Karolo:",
      af: "Been Tarief:"
    },
    totalFare: {
      en: "Total Fare:",
      zu: "Imali Ephelele:",
      tn: "Tefelo e Tletseng:",
      af: "Totale Tarief:"
    },
    haveYouPaidDriver: {
      en: "Have you paid the driver?",
      zu: "Ngabe ukhokhile umshayeli?",
      tn: "A o feletse mokgweetsi?",
      af: "Het jy die bestuurder betaal?"
    },
    yesIPaid: {
      en: "Yes, I paid",
      zu: "Yebo, ngikhokhile",
      tn: "Ee, ke feletse",
      af: "Ja, ek het betaal"
    },
    noNotYet: {
      en: "No, not yet",
      zu: "Cha, angikakhokhi",
      tn: "Nnyaa, ga ke sa felela",
      af: "Nee, nog nie"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const markTripPaid = useMutation(api.functions.rides.tripPaid.tripPaid);
  const processLegPayment = useMutation(api.functions.journeys.journeyStateManager.completeLegWithPayment);

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
          getTranslation('legPaymentConfirmed'),
          getTranslation('legPaymentMessage').replace('{current}', currentLeg.toString()).replace('{total}', total.toString()).replace('{ready}', !result.journeyComplete ? getTranslation('readyForNextLeg') : getTranslation('journeyCompleted')),
          { duration: 3000, position: 'top', animation: 'slide-down' }
        );

        setTimeout(() => {
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
          getTranslation('paymentConfirmed'),
          getTranslation('thankYouForPayment'),
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
        getTranslation('paymentConfirmationFailed'),
        error?.message || getTranslation('unableToConfirmPayment'),
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
          title: getTranslation('paymentRequired'),
          message: getTranslation('paymentRequiredMessage').replace('{current}', currentLeg.toString()).replace('{total}', total.toString()),
          type: 'warning',
          duration: 0,
          actions: [
            {
              label: getTranslation('iWillPayNow'),
              onPress: () => {
                // Stay on payment screen to try again
              },
              style: 'default',
            },
            {
              label: getTranslation('cancelJourney'),
              onPress: () => router.push('/HomeScreen'),
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
          title: getTranslation('paymentNotConfirmed'),
          message: getTranslation('paymentNotConfirmedMessage'),
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: getTranslation('continueToFeedback'),
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
            label: getTranslation('skipFeedback'),
            onPress: () => router.push('/HomeScreen'),
            style: 'cancel',
          }
        ],
          position: 'top',
          animation: 'slide-down',
        });
      }

    } catch (error: any) {
      showGlobalError(
        getTranslation('updateFailed'),
        error?.message || getTranslation('unableToUpdatePayment'),
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
    }
  };

  return (
    <View style={[styles.safeArea]}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>
          {isMultiLeg === 'true' ? getTranslation('legPayment') : getTranslation('tripPayment')}
        </Text>

        {/* Multi-leg progress indicator */}
        {isMultiLeg === 'true' && legIndex !== undefined && totalLegs && (
          <View style={styles.legProgressCard}>
            <View style={styles.legProgressHeader}>
              <Ionicons name="map-outline" size={20} color="#FF9900" />
              <Text style={styles.legProgressText}>
                {getTranslation('leg')} {parseInt(legIndex as string) + 1} {getTranslation('of')} {totalLegs}
              </Text>
            </View>
            <Text style={styles.legProgressSubtext}>{getTranslation('multiLegJourneyInProgress')}</Text>
          </View>
        )}

        <View style={[styles.card, styles.tripDetails]}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={18} color="#2B2B2B" />
            <Text style={styles.detailText}>{getTranslation('driver')} {driverName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={18} color="#2B2B2B" />
            <Text style={styles.detailText}>{getTranslation('license')} {licensePlate}</Text>
          </View>
          {isMultiLeg === 'true' && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="#2B2B2B" />
              <Text style={styles.detailText}>{getTranslation('thisLeg')} {startName} → {endName}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={18} color="#FF9900" />
            <View style={styles.fareInfo}>
              <Text style={styles.fareLabel}>
                {isMultiLeg === 'true' ? getTranslation('legFare') : getTranslation('totalFare')}
              </Text>
              <Text style={styles.fareAmount}>R{fare}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.questionText}>{getTranslation('haveYouPaidDriver')}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.paidButton]} onPress={handlePaid}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.buttonText}>{getTranslation('yesIPaid')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.notPaidButton]} onPress={handleNotPaid}>
            <Ionicons name="close-circle" size={22} color="#fff" />
            <Text style={styles.buttonText}>{getTranslation('noNotYet')}</Text>
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