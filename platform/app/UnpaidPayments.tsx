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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function UnpaidPayments() {
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
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <Pressable style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={theme.text} />
                        </Pressable>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Ama-Akhawunti Angakhokhelwanga' :
                             currentLanguage === 'tn' ? 'Diakhaonto tse di sa Duelwang' :
                             currentLanguage === 'af' ? 'Onbetaalde Rekeninge' :
                             'Unpaid Accounts'}
                        </Text>
                    </View>
                </View>
                <View style={styles.container}>
                    <View style={styles.headerSection}>
                        <Text style={[styles.headerSubtitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Iyalayisha...' :
                             currentLanguage === 'tn' ? 'Ya Laisa...' :
                             currentLanguage === 'af' ? 'Laai...' :
                             'Loading...'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const unpaid = activeTrips.passengersUnpaid;

    if (!unpaid.length) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <Pressable style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={theme.text} />
                        </Pressable>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Ama-Akhawunti Angakhokhelwanga' :
                             currentLanguage === 'tn' ? 'Diakhaonto tse di sa Duelwang' :
                             currentLanguage === 'af' ? 'Onbetaalde Rekeninge' :
                             'Unpaid Accounts'}
                        </Text>
                    </View>
                </View>
                <View style={styles.container}>
                    <View style={styles.headerSection}>
                        <Text style={[styles.headerSubtitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Bonke abasebenzisi bakhokhelwe' :
                             currentLanguage === 'tn' ? 'Badirisi botlhe ba dueletswe' :
                             currentLanguage === 'af' ? 'Alle gebruikers het betaal' :
                             'All users have paid'}
                        </Text>
                    </View>
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
                        <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                            {currentLanguage === 'zu' ? 'Awekho ama-akhawunti angakhokhelwanga' :
                             currentLanguage === 'tn' ? 'Ga go na diakhaonto tse di sa duelwang' :
                             currentLanguage === 'af' ? 'Geen onbetaalde rekeninge nie' :
                             'No unpaid accounts'}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={theme.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        {currentLanguage === 'zu' ? 'Ama-Akhawunti Angakhokhelwanga' :
                         currentLanguage === 'tn' ? 'Diakhaonto tse di sa Duelwang' :
                         currentLanguage === 'af' ? 'Onbetaalde Rekeninge' :
                         'Unpaid Accounts'}
                    </Text>
                </View>
            </View>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerSection}>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {currentLanguage === 'zu' ? `${unpaid.length} ${unpaid.length !== 1 ? 'ama-akhawunti' : 'i-akhawunti'} angakhokhelwanga` :
                         currentLanguage === 'tn' ? `${unpaid.length} ${unpaid.length !== 1 ? 'diakhaonto' : 'akhaonto'} tse di sa duelwang` :
                         currentLanguage === 'af' ? `${unpaid.length} onbetaalde ${unpaid.length !== 1 ? 'rekeninge' : 'rekening'}` :
                         `${unpaid.length} unpaid account${unpaid.length !== 1 ? 's' : ''}`}
                    </Text>
                </View>

                <View style={styles.contentSection}>
                    {unpaid.map((p: any, idx: number) => {
                        const date = new Date(p.requestedAt);
                        const dateString = date.toLocaleDateString() + " " + date.toLocaleTimeString();
                        return (
                            <View key={idx} style={[styles.passengerCard, { backgroundColor: theme.card }]}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.passengerInfo}>
                                        <Text style={[styles.name, { color: theme.text }]}>{p.name}</Text>
                                        <Text style={[styles.phoneNumber, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }]}>
                                            {p.phoneNumber}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, styles.statusUnpaid]}>
                                        <Text style={styles.statusText}>
                                            {currentLanguage === 'zu' ? 'Akukhokhwanga' :
                                             currentLanguage === 'tn' ? 'Ga e a Duelwa' :
                                             currentLanguage === 'af' ? 'Onbetaald' :
                                             'Unpaid'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.cardDetails, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="cash-outline" size={16} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
                                        <Text style={[styles.detailText, { color: theme.text }]}>
                                            {currentLanguage === 'zu' ? `Intengo: R${p.fare.toFixed(2)}` :
                                             currentLanguage === 'tn' ? `Tuelo: R${p.fare.toFixed(2)}` :
                                             currentLanguage === 'af' ? `Tarief: R${p.fare.toFixed(2)}` :
                                             `Fare: R${p.fare.toFixed(2)}`}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={16} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'} />
                                        <Text style={[styles.detailText, { color: theme.text }]}>
                                            {currentLanguage === 'zu' ? `Kuceliwe: ${dateString}` :
                                             currentLanguage === 'tn' ? `Go Kopilwe: ${dateString}` :
                                             currentLanguage === 'af' ? `Versoek: ${dateString}` :
                                             `Requested: ${dateString}`}
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

const styles = StyleSheet.create({
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
        alignItems: 'flex-start',
        gap: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        flexWrap: 'wrap',
        flexShrink: 1,
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
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        flexWrap: 'wrap',
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
        flexShrink: 1,
        marginRight: 8,
    },
    name: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    phoneNumber: {
        fontSize: 15,
        fontWeight: '400',
        flexWrap: 'wrap',
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
        paddingTop: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    detailText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
        flexWrap: 'wrap',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});