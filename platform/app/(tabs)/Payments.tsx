import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, SafeAreaView } from "react-native";
import { useUser } from '../../contexts/UserContext';
import { useNavigation, useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function PaymentConfirmation() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

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

  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      color: theme.text,
      marginBottom: 32,
      textAlign: "center",
    },
    tripDetails: {
      width: "100%",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 32,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "500",
    },
    fareDisplay: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    fareInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
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
      color: theme.text,
      textAlign: "center",
      marginBottom: 32,
      fontWeight: "500",
    },
    instructionText: {
      fontSize: 16,
      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      textAlign: "center",
      marginBottom: 20,
    },
    amountInput: {
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
      borderRadius: 12,
      padding: 16,
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 32,
      width: "100%",
      backgroundColor: theme.card,
      color: theme.text,
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
      gap: 8,
    },
    paidButton: {
      backgroundColor: isDark ? "#27ae60" : "#2ECC71",
    },
    notPaidButton: {
      backgroundColor: isDark ? "#c0392b" : "#E74C3C",
    },
    confirmButton: {
      backgroundColor: isDark ? "#27ae60" : "#2ECC71",
    },
    cancelButton: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FF9900',
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    noteText: {
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      textAlign: "center",
      fontStyle: "italic",
      maxWidth: 280,
    },
  });

  if (showAmountInput) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.content}>
            <Text style={dynamicStyles.heading}>Enter Payment Amount</Text>
            
            <View style={dynamicStyles.fareInfo}>
              <Text style={dynamicStyles.fareLabel}>Trip Fare:</Text>
              <Text style={dynamicStyles.fareAmount}>R{fare}</Text>
            </View>

            <Text style={dynamicStyles.instructionText}>
              How much did you pay the driver?
            </Text>

            <TextInput
              placeholder="Enter amount paid"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
              keyboardType="numeric"
              style={dynamicStyles.amountInput}
              value={amountPaid}
              onChangeText={setAmountPaid}
              selectTextOnFocus={true}
              autoFocus={true}
            />

            <View style={dynamicStyles.buttonRow}>
              <TouchableOpacity 
                style={[dynamicStyles.cancelButton]} 
                onPress={cancelAmountInput}
                disabled={processing}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="arrow-back" 
                  style={dynamicStyles.buttonText}
                />
                <Text style={dynamicStyles.buttonText}>
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[dynamicStyles.button, dynamicStyles.confirmButton]} 
                onPress={confirmPayment}
                disabled={processing}
                activeOpacity={0.7}
              >
                <Text style={dynamicStyles.buttonText}>
                  {processing ? "Processing..." : "Confirm Payment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.content}>
          <Text style={dynamicStyles.heading}>Trip Payment</Text>

          <View style={dynamicStyles.tripDetails}>
            <View style={dynamicStyles.infoRow}>
              <Ionicons name="person" size={20} color={theme.text} />
              <Text style={dynamicStyles.infoText}>Driver: {driverName}</Text>
            </View>
            <View style={dynamicStyles.infoRow}>
              <Ionicons name="car-outline" size={20} color={theme.text} />
              <Text style={dynamicStyles.infoText}>License: {licensePlate}</Text>
            </View>
            <View style={dynamicStyles.fareDisplay}>
              <Text style={dynamicStyles.fareLabel}>Total Fare:</Text>
              <Text style={dynamicStyles.fareAmount}>R{fare}</Text>
            </View>
          </View>

          <Text style={dynamicStyles.questionText}>
            Did you pay the driver for this trip?
          </Text>

          <View style={dynamicStyles.paymentButtons}>
            <TouchableOpacity 
              style={[dynamicStyles.button, dynamicStyles.notPaidButton]} 
              onPress={handleNotPaid}
              disabled={processing}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={dynamicStyles.buttonText}>Not Paid</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[dynamicStyles.button, dynamicStyles.paidButton]} 
              onPress={handlePaidClick}
              disabled={processing}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={dynamicStyles.buttonText}>Paid</Text>
            </TouchableOpacity>
          </View>

          <Text style={dynamicStyles.noteText}>
            {processing ? "Processing..." : "Select your payment status to continue"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}