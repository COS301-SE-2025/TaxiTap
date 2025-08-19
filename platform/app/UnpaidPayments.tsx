import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable } from "react-native";
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';

export default function UnpaidPayments() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useRouter();
    const navigation = useNavigation();
    
    // Hide default navigation header and add custom back button
    useLayoutEffect(() => {
        navigation.setOptions({ 
            headerShown: false 
        });
    }, [navigation]);
    
    const activeTrips = useQuery(
      api.functions.rides.getActiveTrips.getActiveTrips,
      user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    const handleBackPress = () => {
        router.back();
    };

    if (!user || activeTrips === undefined) {
        return (
            <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
                {/* Custom Header with Back Button */}
                <View style={dynamicStyles.header}>
                    <Pressable 
                        style={dynamicStyles.backButton} 
                        onPress={handleBackPress}
                        android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    >
                        <Ionicons 
                            name="chevron-back" 
                            size={24} 
                            color={theme.text} 
                        />
                    </Pressable>
                </View>
                <View style={dynamicStyles.container}>
                    <View style={dynamicStyles.headerSection}>
                        <Text style={dynamicStyles.headerTitle}>Unpaid Payments</Text>
                        <Text style={dynamicStyles.headerSubtitle}>Loading...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const unpaid = activeTrips.passengersUnpaid;

    if (!unpaid.length) {
        return (
            <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
                {/* Custom Header with Back Button */}
                <View style={dynamicStyles.header}>
                    <Pressable 
                        style={dynamicStyles.backButton} 
                        onPress={handleBackPress}
                        android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                    >
                        <Ionicons 
                            name="chevron-back" 
                            size={24} 
                            color={theme.text} 
                        />
                    </Pressable>
                    <Text style={dynamicStyles.headerTitle}>Unpaid Payments</Text>
                </View>
                <View style={dynamicStyles.container}>
                    <View style={dynamicStyles.headerSection}>
                        <Text style={dynamicStyles.headerTitle}>Unpaid Payments</Text>
                        <Text style={dynamicStyles.headerSubtitle}>All users have paid</Text>
                    </View>
                    <View style={dynamicStyles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
                        <Text style={dynamicStyles.emptyStateText}>No unpaid accounts</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
            {/* Custom Header with Back Button */}
            <View style={dynamicStyles.header}>
                <Pressable 
                    style={dynamicStyles.backButton} 
                    onPress={handleBackPress}
                    android_ripple={{ color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                >
                    <Ionicons 
                        name="chevron-back" 
                        size={24} 
                        color={theme.text} 
                    />
                </Pressable>
            </View>

            <ScrollView 
                style={dynamicStyles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={dynamicStyles.headerSection}>
                    <Text style={dynamicStyles.headerTitle}>Unpaid Payments</Text>
                    <Text style={dynamicStyles.headerSubtitle}>
                        {unpaid.length} unpaid account{unpaid.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                <View style={dynamicStyles.contentSection}>
                    {unpaid.map((p, idx) => {
                        const date = new Date(p.requestedAt);
                        const dateString = date.toLocaleDateString() + " " + date.toLocaleTimeString();
                        return (
                            <View key={idx} style={[dynamicStyles.passengerCard, { backgroundColor: theme.card }]}>
                                <View style={dynamicStyles.cardHeader}>
                                    <View style={dynamicStyles.passengerInfo}>
                                        <Text style={[dynamicStyles.name, { color: theme.text }]}>{p.name}</Text>
                                        <Text style={[dynamicStyles.phoneNumber, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>
                                            {p.phoneNumber}
                                        </Text>
                                    </View>
                                    <View style={[dynamicStyles.statusBadge, dynamicStyles.statusUnpaid]}>
                                        <Text style={dynamicStyles.statusText}>Unpaid</Text>
                                    </View>
                                </View>
                                
                                <View style={dynamicStyles.cardDetails}>
                                    <View style={dynamicStyles.detailRow}>
                                        <Ionicons name="cash-outline" size={16} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
                                        <Text style={[dynamicStyles.detailText, { color: theme.text }]}>
                                            Fare: R{p.fare.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={dynamicStyles.detailRow}>
                                        <Ionicons name="time-outline" size={16} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
                                        <Text style={[dynamicStyles.detailText, { color: theme.text }]}>
                                            Requested: {dateString}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const dynamicStyles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
        textAlign: 'center',
        marginRight: 52, // Compensate for back button width to center title
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        fontWeight: '400',
    },
    contentSection: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    passengerCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    passengerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    phoneNumber: {
        fontSize: 15,
        fontWeight: '400',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    statusUnpaid: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#ef4444',
    },
    cardDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
        textAlign: 'center',
    },
});