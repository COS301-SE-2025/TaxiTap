import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { useUser } from '../../contexts/UserContext';
import { useNavigation, useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentConfirmation() {
  const navigation = useNavigation();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' }
    });
  }, [navigation]);

  const { user } = useUser();
  const router = useRouter();
  const userId = user?.id;
  const [amountPaid, setAmountPaid] = useState("");
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { 
    driverName, 
    licensePlate, 
    fare, 
    rideId, 
    startName, 
    endName, 
    driverId,
    currentLat,
    currentLng,
    currentName,
    destinationLat,
    destinationLng,
    destinationName,
    isMultiLeg,
    journeyId,
    legIndex,
    totalLegs,
    routeName,
  } = useLocalSearchParams();

  // Use the new payment handler mutation
  const handlePayment = useMutation(api.functions.rides.getActiveTrips.handlePassengerPayment);

  const navigateToReservation = () => {
    router.push({
      pathname: '/PassengerReservation',
      params: {
        currentLat,
        currentLng,
        currentName,
        destinationLat,
        destinationLng,
        destinationName,
        driverId,
        driverName,
        fare,
        rideId,
        isMultiLeg,
        journeyId,
        legIndex,
        totalLegs,
        routeName
      }
    });
  };

  const showPaymentResult = (paymentType: string, changeDue: number, fare: number) => {
    // Navigate directly without showing any alerts
    navigateToReservation();
  };

  const handleNotPaid = async () => {
    try {
      setProcessing(true);
      const result = await handlePayment({
        rideId: rideId as string,
        amountPaid: 0,
        isPaid: false,
      });

      // Navigate directly after successful payment update
      navigateToReservation();
    } catch (error) {
      console.error("Payment error:", error);
      // Navigate even on error to avoid getting stuck
      navigateToReservation();
    } finally {
      setProcessing(false);
    }
  };

  const handlePaidClick = () => {
    // Set default amount to fare and show input
    setAmountPaid(fare as string);
    setShowAmountInput(true);
  };

  const confirmPayment = async () => {
    const numericAmount = parseFloat(amountPaid);
    const expectedFare = parseFloat(fare as string);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      // Just return without alert, let user try again
      return;
    }

    try {
      setProcessing(true);
      const result = await handlePayment({
        rideId: rideId as string,
        amountPaid: numericAmount,
        isPaid: true,
      });

      // Navigate directly after successful payment
      showPaymentResult(result.paymentType, result.changeDue, expectedFare);
      setShowAmountInput(false);
    } catch (error) {
      console.error("Payment error:", error);
      // Navigate even on error to avoid getting stuck
      navigateToReservation();
      setProcessing(false);
    }
  };

  const cancelAmountInput = () => {
    setShowAmountInput(false);
    setAmountPaid("");
  };

  if (showAmountInput) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.heading}>Enter Payment Amount</Text>
          
          <View style={styles.fareInfo}>
            <Text style={styles.fareLabel}>Trip Fare:</Text>
            <Text style={styles.fareAmount}>R{fare}</Text>
          </View>

          <Text style={styles.instructionText}>
            How much did you pay the driver?
          </Text>

          <TextInput
            placeholder="Enter amount paid"
            keyboardType="numeric"
            style={styles.amountInput}
            value={amountPaid}
            onChangeText={setAmountPaid}
            selectTextOnFocus={true}
            autoFocus={true}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={cancelAmountInput}
              disabled={processing}
            >
              <Ionicons name="arrow-back" size={20} color="#666" />
              <Text style={[styles.buttonText, { color: "#666" }]}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.confirmButton]} 
              onPress={confirmPayment}
              disabled={processing}
            >
              <Text style={styles.buttonText}>
                {processing ? "Processing..." : "Confirm Payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Trip Payment</Text>

        <View style={styles.tripDetails}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#2B2B2B" />
            <Text style={styles.infoText}>Driver: {driverName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={20} color="#2B2B2B" />
            <Text style={styles.infoText}>License: {licensePlate}</Text>
          </View>
          <View style={styles.fareDisplay}>
            <Text style={styles.fareLabel}>Total Fare:</Text>
            <Text style={styles.fareAmount}>R{fare}</Text>
          </View>
        </View>

        <Text style={styles.questionText}>
          Did you pay the driver for this trip?
        </Text>

        <View style={styles.paymentButtons}>
          <TouchableOpacity 
            style={[styles.button, styles.notPaidButton]} 
            onPress={handleNotPaid}
            disabled={processing}
          >
            <Ionicons name="close-circle" size={24} color="#fff" />
            <Text style={styles.buttonText}>Not Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.paidButton]} 
            onPress={handlePaidClick}
            disabled={processing}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.buttonText}>Paid</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.noteText}>
          {processing ? "Processing..." : "Select your payment status to continue"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2B2B2B",
    marginBottom: 32,
    textAlign: "center",
  },
  tripDetails: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#2B2B2B",
    fontWeight: "500",
  },
  fareDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  fareInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
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
  questionText: {
    fontSize: 18,
    color: "#2B2B2B",
    textAlign: "center",
    marginBottom: 32,
    fontWeight: "500",
  },
  instructionText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  amountInput: {
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 32,
    width: "100%",
    backgroundColor: "#f8f9fa",
  },
  paymentButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 16,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 8,
  },
  paidButton: {
    backgroundColor: "#2ECC71",
  },
  notPaidButton: {
    backgroundColor: "#E74C3C",
  },
  confirmButton: {
    backgroundColor: "#2ECC71",
  },
  cancelButton: {
    backgroundColor: "#f1f3f4",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  noteText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 280,
  },
});