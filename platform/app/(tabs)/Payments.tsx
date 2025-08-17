import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useUser } from '../../contexts/UserContext';
import { useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';

export default function PaymentConfirmation() {
  const { user } = useUser();
  const router = useRouter();
  const userId = user?.id;
  const { driverName, licensePlate, fare, rideId, startName, endName, driverId } = useLocalSearchParams();

  const markTripPaid = useMutation(api.functions.rides.tripPaid.tripPaid);

  const handlePaid = () => {
    markTripPaid({
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: true,
    });
    router.push('/PassengerReservation');
  };

  const handleNotPaid = () => {
    markTripPaid({
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: false,
    });
    router.push('/PassengerReservation');
  };

  return (
    <View style={styles.container}>
      {/* Body content */}
      <View style={styles.content}>
        <Text style={styles.paymentText}>
          <Text>Paying driver: {driverName}</Text>
        </Text>
        <Text style={styles.paymentText}>
          <Text>License Plate: {licensePlate}</Text>
        </Text>
        <Text style={styles.amount}>R{(fare ?? 0)}</Text>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.paid]} onPress={handlePaid}>
            <Text style={styles.buttonText}>✓ Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.notPaid]} onPress={handleNotPaid}>
            <Text style={styles.buttonText}>✗ Not Paid</Text>
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
  paymentText: {
    fontSize: 16,
    color: "#2B2B2B",
    marginBottom: 20,
  },
  amount: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FF7B00",
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  paid: {
    backgroundColor: "#2ECC71",
  },
  notPaid: {
    backgroundColor: "#E74C3C",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});