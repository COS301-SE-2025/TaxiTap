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
import { useLanguage } from '../../contexts/LanguageContext';

export default function PaymentConfirmation() {
  const { user } = useUser();
  const router = useRouter();
  const { t: translate } = useLanguage();
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
    isMultiLeg
  } = useLocalSearchParams();
  const { showGlobalAlert, showGlobalSuccess, showGlobalError } = useAlertHelpers();

  const markTripPaid = useMutation(api.functions.rides.tripPaid.tripPaid);
  const processLegPayment = useMutation(api.functions.journeys.multiLegPayment.processLegPayment);

  const handlePaid = async () => {
    try {
      // Check if this is a multi-leg journey
      if (isMultiLeg === 'true' && journeyId && legIndex !== undefined) {
        // Use multi-leg payment handler
        const result = await processLegPayment({
          rideId: rideId as string,
          journeyId: journeyId as string,
          legIndex: parseInt(legIndex as string),
          amountPaid: parseFloat(fare as string),
          isPaid: true,
        });

        const currentLeg = parseInt(legIndex as string) + 1;
        const total = parseInt(totalLegs as string);

        showGlobalSuccess(
          translate('paymentConfirm.legPaymentConfirmed'),
          `Payment for leg ${currentLeg} of ${total} confirmed!${result.canProgressToNextLeg ? ' Ready for next leg.' : ' Journey completed!'}`,
          { duration: 3000, position: 'top', animation: 'slide-down' }
        );

        setTimeout(() => {
          if (result.canProgressToNextLeg) {
            // Navigate back to journey progress or next leg preparation
            router.push('/HomeScreen'); // Could be journey progress screen instead
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
              },
            });
          }
        }, 3000);
      } else {
        // Original single-leg payment logic
        const result = await markTripPaid({
          rideId: rideId as Id<"rides">,
          userId: userId as Id<"taxiTap_users">,
          paid: true,
        });

        showGlobalSuccess(
          translate('paymentConfirm.paymentConfirmed'),
          'Thank you for confirming your payment!',
          { duration: 2000, position: 'top', animation: 'slide-down' }
        );

        setTimeout(() => {
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
        }, 2000);
      }

    } catch (error: any) {
      showGlobalError(
        translate('paymentConfirm.paymentConfirmationFailed'),
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
          rideId: rideId as string,
          journeyId: journeyId as string,
          legIndex: parseInt(legIndex as string),
          amountPaid: 0,
          isPaid: false,
        });

        const currentLeg = parseInt(legIndex as string) + 1;
        const total = parseInt(totalLegs as string);

        showGlobalAlert({
          title: translate('paymentConfirm.paymentRequired'),
          message: `Payment for leg ${currentLeg} of ${total} is required before continuing your journey. Please pay the driver to proceed.`,
          type: 'warning',
          duration: 0,
          actions: [
            {
              label: translate('paymentConfirm.iWillPayNow'),
              onPress: () => {
                // Stay on payment screen to try again
              },
              style: 'default',
            },
            {
              label: translate('paymentConfirm.cancelJourney'),
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
          rideId: rideId as Id<"rides">,
          userId: userId as Id<"taxiTap_users">,
          paid: false,
        });

        showGlobalAlert({
          title: translate('paymentConfirm.paymentNotConfirmed'),
          message: 'Please remember to pay your driver. You can still provide feedback about your ride.',
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: translate('paymentConfirm.continueToFeedback'),
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
            label: translate('paymentConfirm.skipFeedback'),
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
        'Update Failed',
        error?.message || 'Unable to update payment status. Please try again.',
        { duration: 4000, position: 'top', animation: 'slide-down' }
      );
    }
  };

  return (
    <View style={[styles.safeArea]}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>
          {isMultiLeg === 'true' ? 'Leg Payment' : 'Trip Payment'}
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
            <Text style={styles.detailText}>Driver: {driverName}</Text>
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
                {isMultiLeg === 'true' ? 'Leg Fare:' : 'Total Fare:'}
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