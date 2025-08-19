import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useUser } from '../../contexts/UserContext';
import { useRouter } from "expo-router";
import { Id } from '../../convex/_generated/dataModel';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
    currentLat,
    currentLng,
    currentName,
    destinationLat,
    destinationLng,
    destinationName
  } = useLocalSearchParams();

  const markTripPaid = useMutation(api.functions.rides.tripPaid.tripPaid);

  const handlePaid = () => {
    markTripPaid({
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: true,
    });
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
      }
    });
  };

  const handleNotPaid = () => {
    markTripPaid({
        rideId: rideId as string,
        userId: userId as Id<"taxiTap_users">,
        paid: false,
    });
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
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Payments</Text>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={20} color="#2B2B2B" />
          <Text style={[styles.paymentText, styles.infoText]}>Driver: {driverName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={20} color="#2B2B2B" />
          <Text style={[styles.paymentText, styles.infoText]}>License Plate: {licensePlate}</Text>
        </View>
        <Text style={styles.amount}>R{(fare ?? 0)}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.paid]} onPress={handlePaid}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.buttonText}>Paid</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.notPaid]} onPress={handleNotPaid}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.buttonText}>Not Paid</Text>
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
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2B2B2B",
    marginBottom: 24,
    marginTop: -10,
    textAlign: "center",
    width: "100%",
  },
  paymentText: {
    fontSize: 16,
    color: "#2B2B2B",
    marginBottom: 20,
    textAlign: "center",
    width: "100%",
    fontWeight: "bold",
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
  amount: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#FF7B00",
    marginBottom: 40,
    textAlign: "center",
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
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