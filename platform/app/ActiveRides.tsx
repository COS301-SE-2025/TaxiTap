import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, ScrollView  } from "react-native";
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';

export default function PaymentConfirmation() {
    const { user } = useUser();
    const activeTrips = useQuery(
        api.functions.rides.getActiveTrips.getActiveTrips,
        user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    const dynamicStyles = StyleSheet.create({
        container: {
        flex: 1,
        padding: 10,
        backgroundColor: "#fff",
        },
        passengerCard: {
        backgroundColor: "#f5f5f5",
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 1,
        },
        name: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 5,
        },
        info: {
        fontSize: 14,
        marginBottom: 3,
        },
        paid: { color: "#2ECC71", fontWeight: "bold" },
        unpaid: { color: "#E74C3C", fontWeight: "bold" },
        noResponse: { color: "#FF9900", fontWeight: "bold" },
    });

    if (!user || activeTrips === undefined) {
        return (
        <View style={dynamicStyles.container}>
            <Text style={{ fontSize: 20, textAlign: "center" }}>Loading...</Text>
        </View>
        );
    }

    if (!activeTrips || !activeTrips.passengers.length) {
        return (
        <View style={dynamicStyles.container}>
            <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center" }}>
            No active trips found.
            </Text>
        </View>
        );
    }

    return (
        <ScrollView style={dynamicStyles.container}>
        {activeTrips?.passengers?.map((p, idx) => (
            <View key={idx} style={dynamicStyles.passengerCard}>
            <Text style={dynamicStyles.name}>{p.name}</Text>
            <Text style={dynamicStyles.info}>📞 {p.phoneNumber}</Text>
            <Text style={dynamicStyles.info}>💰 Fare: R{p.fare.toFixed(2)}</Text>
            <Text
                style={[
                p.tripPaid === true
                    ? dynamicStyles.paid
                    : p.tripPaid === false
                    ? dynamicStyles.unpaid
                    : dynamicStyles.noResponse,
                ]}
            >
                {p.tripPaid === true
                ? "✅ Paid"
                : p.tripPaid === false
                ? "❌ Not Paid"
                : "⌛ Waiting for Payment"}
            </Text>
            </View>
        ))}
        </ScrollView>
    );
}