import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function StatsPage() {
  const router = useRouter();
  const { user } = useUser();
  const activeTrips = useQuery(
    api.functions.rides.getActiveTrips.getActiveTrips,
    user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  if (!user || activeTrips === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f8" }}>
        <ScrollView contentContainerStyle={{ padding: 15 }}>
          <View style={{ marginBottom: 20, paddingHorizontal: 15 }}>
            <Text style={{ fontSize: 16, color: "#666", marginTop: 6 }}>
              Loading...
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f8" }}>
      <ScrollView contentContainerStyle={{ padding: 15 }}>
        <View style={{ marginBottom: 20, paddingHorizontal: 15 }}>
            <Text style={{ fontSize: 16, color: "#666", marginTop: 6 }}>
                Overview of your rides and payments
            </Text>
        </View>

        <View style={dynamicStyles.buttonRow}>
          <TouchableOpacity
            style={[dynamicStyles.card, dynamicStyles.paid]}
            onPress={() => router.push("/ActiveRides")}
          >
            <Text style={dynamicStyles.cardNumber}>{activeTrips?.activeCount}</Text>
            <Text style={dynamicStyles.cardLabel}>Active Rides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.card, dynamicStyles.waiting]}
            onPress={() => router.push("/WaitingPayments")}
          >
            <Text style={dynamicStyles.cardNumber}>{activeTrips?.noResponseCount}</Text>
            <Text style={dynamicStyles.cardLabel}>Waiting Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.card, dynamicStyles.notPaid]}
            onPress={() => router.push("/UnpaidPayments")}
          >
            <Text style={dynamicStyles.cardNumber}>{activeTrips?.unpaidCount}</Text>
            <Text style={dynamicStyles.cardLabel}>Unpaid Accounts</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const dynamicStyles = StyleSheet.create({
  buttonRow: {
    flexDirection: "column",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 15,
  },
  card: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  paid: {
    backgroundColor: "#2ECC71",
  },
  waiting: {
    backgroundColor: "#FF9900",
  },
  notPaid: {
    backgroundColor: "#E74C3C",
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  cardLabel: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
  },
});