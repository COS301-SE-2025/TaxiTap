import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, ScrollView  } from "react-native";
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';

export default function WaitingPayments() {
    const { user } = useUser();
    if (!user) return;
    const activeTrips = useQuery(api.functions.payments.getActiveTrips.getActiveTrips, { driverId: user.id as Id<"taxiTap_users">, });

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

    if (activeTrips === undefined) {
        return (
        <View style={dynamicStyles.container}>
            <Text style={{ fontSize: 20, textAlign: "center" }}>Loading...</Text>
        </View>
        );
    }

    const unpaid = activeTrips.passengersUnpaid;

    if (!unpaid.length) {
        return (
        <View style={dynamicStyles.container}>
            <Text style={{ fontSize: 24, fontWeight: "bold", textAlign: "center" }}>
            All users have paid.
            </Text>
        </View>
        );
    }

    return (
        <ScrollView style={dynamicStyles.container}>
            {unpaid.map((p, idx) => {
                const date = new Date(p.requestedAt);
                const dateString = date.toLocaleDateString() + " " + date.toLocaleTimeString();
                return (
                    <View key={idx} style={dynamicStyles.passengerCard}>
                        <Text style={dynamicStyles.name}>{p.name}</Text>
                        <Text style={dynamicStyles.info}>📞 {p.phoneNumber}</Text>
                        <Text style={dynamicStyles.info}>💰 Fare: R{p.fare.toFixed(2)}</Text>
                        <Text style={dynamicStyles.info}>📅 Requested at: {dateString}</Text> 
                        <Text
                            style={ dynamicStyles.unpaid }
                        >
                            ❌ Not Paid
                        </Text>
                    </View>
                );
            })}
        </ScrollView>
    );
}