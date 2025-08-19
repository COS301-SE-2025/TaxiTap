import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, ScrollView  } from "react-native";
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { Id } from '../convex/_generated/dataModel';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function WaitingPayments() {
    const { user } = useUser();
    const { theme } = useTheme();
    const activeTrips = useQuery(
      api.functions.rides.getActiveTrips.getActiveTrips,
      user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    const dynamicStyles = StyleSheet.create({
        container: {
        flex: 1,
        padding: 10,
        backgroundColor: theme.background,
        },
        passengerCard: {
        backgroundColor: theme.card,
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 1,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        },
        name: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 5,
        color: theme.text,
        },
        info: {
        fontSize: 14,
        marginBottom: 3,
        color: theme.text,
        },
        paid: { color: '#2ECC71', fontWeight: "bold" },
        unpaid: { color: '#E74C3C', fontWeight: "bold" },
        noResponse: { color: '#FF9900', fontWeight: "bold" },
    });

    if (!user || activeTrips === undefined) {
        return (
        <View style={[
            dynamicStyles.container, 
            { 
                justifyContent: 'center', 
                alignItems: 'center',
                backgroundColor: theme.background 
            }
        ]}>
            <LoadingSpinner size="large" />
        </View>
        );
    }

    const unpaid = activeTrips.passengersUnpaid;

    if (!unpaid.length) {
        return (
        <View style={dynamicStyles.container}>
            <Text style={{ 
                fontSize: 24, 
                fontWeight: "bold", 
                textAlign: "center", 
                color: theme.text,
                marginTop: 20 
            }}>
            All users have paid.
            </Text>
        </View>
        );
    }

    // Define interface for passenger data
    interface PassengerData {
        name: string;
        phoneNumber: string;
        fare: number;
        requestedAt: number | string | Date;
    }
    
    return (
        <ScrollView style={dynamicStyles.container}>
            {unpaid.map((p: PassengerData, idx: number) => {
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