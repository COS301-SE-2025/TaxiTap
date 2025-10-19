import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, Platform, Dimensions } from "react-native";
import { useUser } from '../contexts/UserContext';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

// Define the passenger type based on your data structure
interface Passenger {
    name: string;
    phoneNumber: string;
    fare: number;
    tripPaid: boolean | null;
    badges?: Array<{
        badgeType: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        earnedAt: number;
        isActive: boolean;
        metadata?: any;
    }>;
}

export default function WaitingPayments() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { t, currentLanguage } = useLanguage();
    const router = useRouter();
    const navigation = useNavigation();

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
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
                <View style={dynamicStyles.header}>
                    <View style={dynamicStyles.headerRow}>
                        <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={theme.text} />
                        </Pressable>
                        <Text style={[dynamicStyles.headerTitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Izinkokhelo Ezilindile' :
                             currentLanguage === 'tn' ? 'Dituelo tse di Letileng' :
                             currentLanguage === 'af' ? 'Hangende Betalings' :
                             'Pending Payments'}
                        </Text>
                    </View>
                </View>
                <View style={dynamicStyles.container}>
                    <View style={dynamicStyles.headerSection}>
                        <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
                            {currentLanguage === 'zu' ? 'Iyalayisha...' :
                             currentLanguage === 'tn' ? 'Ya Laisa...' :
                             currentLanguage === 'af' ? 'Laai...' :
                             'Loading...'}
                        </Text>
                    </View>
                    <View style={[dynamicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                        <LoadingSpinner size="large" />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const waitingPayments = activeTrips?.passengers?.filter((p: Passenger) => p.tripPaid === null) ?? [];

    if (!waitingPayments.length) {
        return (
            <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
                <View style={dynamicStyles.header}>
                    <View style={dynamicStyles.headerRow}>
                        <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={theme.text} />
                        </Pressable>
                        <Text style={[dynamicStyles.headerTitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Izinkokhelo Ezilindile' :
                             currentLanguage === 'tn' ? 'Dituelo tse di Letileng' :
                             currentLanguage === 'af' ? 'Hangende Betalings' :
                             'Pending Payments'}
                        </Text>
                    </View>
                </View>
                <View style={dynamicStyles.container}>
                    <View style={dynamicStyles.headerSection}>
                        <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
                            {currentLanguage === 'zu' ? 'Bonke abasebenzisi baphendulile' :
                             currentLanguage === 'tn' ? 'Badirisi botlhe ba arabile' :
                             currentLanguage === 'af' ? 'Alle gebruikers het geantwoord' :
                             'All users have responded'}
                        </Text>
                    </View>
                    <View style={dynamicStyles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
                        <Text style={[dynamicStyles.emptyStateText, { color: theme.textSecondary }]}>
                            {currentLanguage === 'zu' ? 'Azikho izinkokhelo ezilindile' :
                             currentLanguage === 'tn' ? 'Ga go na dituelo tse di letileng' :
                             currentLanguage === 'af' ? 'Geen hangende betalings nie' :
                             'No pending payments'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
            <View style={dynamicStyles.header}>
                <View style={dynamicStyles.headerRow}>
                    <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={[dynamicStyles.headerTitle, { color: theme.text }]}>
                        {currentLanguage === 'zu' ? 'Izinkokhelo Ezilindile' :
                         currentLanguage === 'tn' ? 'Dituelo tse di Letileng' :
                         currentLanguage === 'af' ? 'Hangende Betalings' :
                         'Pending Payments'}
                    </Text>
                </View>
            </View>
            <ScrollView
                style={dynamicStyles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={dynamicStyles.headerSection}>
                    <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
                        {currentLanguage === 'zu' ? `${waitingPayments.length} ${waitingPayments.length !== 1 ? 'izinkokhelo' : 'inkokhelo'} zilindele impendulo` :
                         currentLanguage === 'tn' ? `${waitingPayments.length} ${waitingPayments.length !== 1 ? 'dituelo' : 'tuelo'} di emetse karabo` :
                         currentLanguage === 'af' ? `${waitingPayments.length} ${waitingPayments.length !== 1 ? 'betalings' : 'betaling'} hang antwoord` :
                         `${waitingPayments.length} payment${waitingPayments.length !== 1 ? 's' : ''} pending response`}
                    </Text>
                </View>

                <View style={dynamicStyles.contentSection}>
                    {waitingPayments.map((p: Passenger, idx: number) => (
                        <View key={idx} style={[dynamicStyles.passengerCard, { backgroundColor: theme.card }]}>
                            <View style={dynamicStyles.cardHeader}>
                                <View style={dynamicStyles.passengerInfo}>
                                    <Text style={[dynamicStyles.name, { color: theme.text }]}>{p.name}</Text>
                                    <Text style={[dynamicStyles.phoneNumber, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>
                                        {p.phoneNumber}
                                    </Text>
                                    {/* Badges */}
                                    {p.badges && p.badges.length > 0 && (
                                        <View style={dynamicStyles.badgesContainer}>
                                            {p.badges.map((badge, badgeIndex) => (
                                                <Badge
                                                    key={badgeIndex}
                                                    badgeType={badge.badgeType as any}
                                                    name={badge.name}
                                                    description={badge.description}
                                                    icon={badge.icon}
                                                    color={badge.color}
                                                    size="small"
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                                <View style={[dynamicStyles.statusBadge, dynamicStyles.statusWaiting]}>
                                    <Text style={dynamicStyles.statusText}>
                                        {currentLanguage === 'zu' ? 'Kulindile' :
                                         currentLanguage === 'tn' ? 'E Emetse' :
                                         currentLanguage === 'af' ? 'Hangende' :
                                         'Pending'}
                                    </Text>
                                </View>
                            </View>

                            <View style={dynamicStyles.cardDetails}>
                                <View style={dynamicStyles.detailRow}>
                                    <Ionicons name="cash-outline" size={16} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
                                    <Text style={[dynamicStyles.detailText, { color: theme.text }]}>
                                        {currentLanguage === 'zu' ? `Intengo: R${p.fare.toFixed(2)}` :
                                         currentLanguage === 'tn' ? `Tuelo: R${p.fare.toFixed(2)}` :
                                         currentLanguage === 'af' ? `Tarief: R${p.fare.toFixed(2)}` :
                                         `Fare: R${p.fare.toFixed(2)}`}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
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
        paddingHorizontal: isSmallScreen ? 16 : 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
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
    headerSubtitleLarge: {
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
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 4,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    statusWaiting: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#f59e0b',
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