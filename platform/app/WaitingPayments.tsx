import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, ScrollView  } from "react-native";
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Define the passenger type based on your data structure
interface Passenger {
    name: string;
    phoneNumber: string;
    fare: number;
    tripPaid: boolean | null;
}

export default function WaitingPayments() {
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
        <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <LoadingSpinner size="large" />
        </View>
        );
    }

    const waitingPayments = activeTrips?.passengers?.filter((p: Passenger) => p.tripPaid === null) ?? [];

    if (!waitingPayments.length) {
        return (
        <View style={dynamicStyles.container}>
            <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center" }}>
            All users have responded.
            </Text>
        </View>
        );
    }

    return (
        <ScrollView style={dynamicStyles.container}>
        {waitingPayments.map((p: Passenger, idx: number) => (
            <View key={idx} style={dynamicStyles.passengerCard}>
            <Text style={dynamicStyles.name}>{p.name}</Text>
            <Text style={dynamicStyles.info}>📞 {p.phoneNumber}</Text>
            <Text style={dynamicStyles.info}>💰 Fare: R{p.fare.toFixed(2)}</Text>
            <Text
                style={ dynamicStyles.noResponse }
            >
                ⌛ Waiting for Payment
            </Text>
            </View>
        ))}
        </ScrollView>
    );
}