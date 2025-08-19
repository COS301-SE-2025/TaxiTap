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

export default function PaymentConfirmation() {
  const { user } = useUser();
  const router = useRouter();
  const userId = user?.id;
  const { driverName, licensePlate, fare, rideId, startName, endName, driverId, passengerId } = useLocalSearchParams();
  const { showGlobalAlert, showGlobalSuccess, showGlobalError } = useAlertHelpers();

  const markTripPaid = useMutation(api.functions.rides.tripPaid.tripPaid);

  const handlePaid = async () => {
    try {
      console.log('Marking trip as paid:', {
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: true,
      });

      const result = await markTripPaid({
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: true,
      });

      console.log('Payment marking result:', result);

      showGlobalSuccess(
        'Payment Confirmed',
        'Thank you for confirming your payment!',
        {
          duration: 2000,
          position: 'top',
          animation: 'slide-down',
        }
      );

      // Navigate to feedback after confirming payment
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

    } catch (error: any) {
      console.error('Error marking trip as paid:', error);
      
      showGlobalError(
        'Payment Confirmation Failed',
        error?.message || 'Unable to confirm payment. Please try again or contact support.',
        {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        }
      );
    }
  };

  const handleNotPaid = async () => {
    try {
      console.log('Marking trip as not paid:', {
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: false,
      });

      const result = await markTripPaid({
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: false,
      });

      console.log('Payment marking result:', result);

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

    } catch (error: any) {
      console.error('Error marking trip as not paid:', error);
      
      showGlobalError(
        'Update Failed',
        error?.message || 'Unable to update payment status. Please try again or contact support.',
        {
          duration: 4000,
          position: 'top',
          animation: 'slide-down',
        }
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Payments</Text>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={20} color="#2B2B2B" />
          <Text style={[styles.paymentText, styles.infoText]}>Driver: {driverName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={20} color="#2B2B2B" />
          <Text style={[styles.paymentText, styles.infoText]}>License Plate: {licensePlate}</Text>
        </View>
        <Text style={styles.amount}>R{fare ?? 0}</Text>

        <Text style={styles.questionText}>Have you paid the driver?</Text>

        <View style={styles.buttonRowHorizontal}>
          <TouchableOpacity style={[styles.button, styles.paidButton]} onPress={handlePaid}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.buttonText}>Yes, I paid</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.notPaidButton]} onPress={handleNotPaid}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.buttonText}>No, not yet</Text>
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2B2B2B",
    marginBottom: 30,
    marginTop: -10,
    textAlign: "center",
    width: "100%",
  },
  paymentText: {
    fontSize: 16,
    color: "#2B2B2B",
    marginBottom: 15,
    textAlign: "center",
    width: "100%",
    fontWeight: "bold",
  },
  amount: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FF7B00",
    marginBottom: 40,
    textAlign: "center",
    width: "100%",
  },
  debugText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
  },
  questionText: {
    fontSize: 18,
    color: "#2B2B2B",
    marginBottom: 30,
    textAlign: "center",
    width: "100%",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
    width: "100%",
  },
  infoText: {
    marginBottom: 0,
    textAlign: "left",
    width: "auto",
  },
  buttonRowHorizontal: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
  },
  paidButton: {
    backgroundColor: "#2ECC71",
  },
  notPaidButton: {
    backgroundColor: "#E74C3C",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});