import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import React, { useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Pressable, Platform, Dimensions } from "react-native";
import { useUser } from '../contexts/UserContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Id } from '../convex/_generated/dataModel';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { Badge } from '../components/Badge';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface Passenger {
    rideId: string;
    name: string;
    phoneNumber: string;
    fare: number;
    tripPaid: boolean | null;
    isFrontPassenger?: boolean;
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

export default function ActiveRides() {
    const { user } = useUser();
    const { theme, isDark } = useTheme();
    const { t, currentLanguage } = useLanguage();
    const router = useRouter();
    const navigation = useNavigation();
    const [loadingFrontPassenger, setLoadingFrontPassenger] = useState<string | null>(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);
    
    const activeTrips = useQuery(
        api.functions.rides.getActiveTrips.getActiveTrips,
        user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
    );

    const setFrontPassengerMutation = useMutation(api.functions.rides.setFrontPassenger.setFrontPassenger);
    const removeFrontPassengerMutation = useMutation(api.functions.rides.setFrontPassenger.removeFrontPassenger);

    const handleBackPress = () => {
        router.back();
    };

    const handleSetFrontPassenger = async (rideId: string, passengerName: string, isFrontPassenger: boolean) => {
        try {
            
            if (!rideId) {
                throw new Error('No ride ID provided');
            }
            
            setLoadingFrontPassenger(rideId);
            
            if (isFrontPassenger) {
                await removeFrontPassengerMutation({ rideId: rideId });
            } else {
                await setFrontPassengerMutation({ rideId: rideId });
            }
        } catch (error) {
            console.error('Front passenger error:', error);
        } finally {
            setLoadingFrontPassenger(null);
        }
    };

    if (!user || activeTrips === undefined) {
        return <LoadingSpinner />;
    }

    if (!activeTrips || !activeTrips.passengers.length) {
        return (
            <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
                <View style={dynamicStyles.header}>
                    <View style={dynamicStyles.headerRow}>
                        <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={20} color={theme.text} />
                        </Pressable>
                        <Text style={[dynamicStyles.headerTitle, { color: theme.text }]}>
                            {currentLanguage === 'zu' ? 'Izigibelo Ezisebenzayo' :
                             currentLanguage === 'tn' ? 'Dipalamo tse di Dirang' :
                             currentLanguage === 'af' ? 'Aktiewe Ritte' :
                             'Active Rides'}
                        </Text>
                    </View>
                </View>
                <View style={dynamicStyles.container}>
                    <View style={dynamicStyles.headerSection}>
                        <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
                            {currentLanguage === 'zu' ? 'Azikho izigibelo ezisebenzayo ezitholiwe' :
                             currentLanguage === 'tn' ? 'Ga go na dipalamo tse di dirang tse di fitlhetsweng' :
                             currentLanguage === 'af' ? 'Geen aktiewe ritte gevind nie' :
                             'No active trips found'}
                        </Text>
                    </View>
                    <View style={dynamicStyles.emptyState}>
                        <Ionicons name="car-outline" size={64} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
                        <Text style={[dynamicStyles.emptyStateText, { color: theme.textSecondary }]}>
                            {currentLanguage === 'zu' ? 'Azikho izigibelo ezisebenzayo ngalesi sikhathi' :
                             currentLanguage === 'tn' ? 'Ga go na dipalamo tse di dirang jaanong' :
                             currentLanguage === 'af' ? 'Geen aktiewe ritte op die oomblik nie' :
                             'No active rides at the moment'}
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
                        {currentLanguage === 'zu' ? 'Izigibelo Ezisebenzayo' :
                         currentLanguage === 'tn' ? 'Dipalamo tse di Dirang' :
                         currentLanguage === 'af' ? 'Aktiewe Ritte' :
                         'Active Rides'}
                    </Text>
                </View>
            </View>
            <ScrollView
                style={dynamicStyles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={dynamicStyles.headerSection}>
                    <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
                        {currentLanguage === 'zu' ? `${activeTrips.passengers.length} ${activeTrips.passengers.length !== 1 ? 'abagibeli' : 'umgibeli'} osigibelo` :
                         currentLanguage === 'tn' ? `${activeTrips.passengers.length} ${activeTrips.passengers.length !== 1 ? 'bapalami' : 'mopalami'} mo leelong` :
                         currentLanguage === 'af' ? `${activeTrips.passengers.length} ${activeTrips.passengers.length !== 1 ? 'passasiers' : 'passasier'} op rit` :
                         `${activeTrips.passengers.length} passenger${activeTrips.passengers.length !== 1 ? 's' : ''} on trip`}
                    </Text>
                </View>

                <View style={dynamicStyles.contentSection}>
                    {activeTrips.passengers.map((p: Passenger, idx: number) => (
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
                                <View style={dynamicStyles.statusContainer}>
                                    <View style={[
                                        dynamicStyles.statusBadge,
                                        p.tripPaid === true ? dynamicStyles.statusPaid :
                                        p.tripPaid === false ? dynamicStyles.statusUnpaid :
                                        dynamicStyles.statusWaiting
                                    ]}>
                                        <Text style={dynamicStyles.statusText}>
                                            {p.tripPaid === true ?
                                                (currentLanguage === 'zu' ? 'Kukhokhiwe' :
                                                 currentLanguage === 'tn' ? 'E Dueletswe' :
                                                 currentLanguage === 'af' ? 'Betaal' :
                                                 'Paid') :
                                             p.tripPaid === false ?
                                                (currentLanguage === 'zu' ? 'Akukhokhwanga' :
                                                 currentLanguage === 'tn' ? 'Ga e a Duelwa' :
                                                 currentLanguage === 'af' ? 'Onbetaald' :
                                                 'Unpaid') :
                                                (currentLanguage === 'zu' ? 'Kulindile' :
                                                 currentLanguage === 'tn' ? 'E Emetse' :
                                                 currentLanguage === 'af' ? 'Hangende' :
                                                 'Pending')}
                                        </Text>
                                    </View>
                                    {p.isFrontPassenger && (
                                        <View style={dynamicStyles.frontPassengerBadge}>
                                            <Text style={dynamicStyles.frontPassengerText}>
                                                {currentLanguage === 'zu' ? 'Ngaphambili' :
                                                 currentLanguage === 'tn' ? 'Kwa Pele' :
                                                 currentLanguage === 'af' ? 'Voor' :
                                                 'Front'}
                                            </Text>
                                        </View>
                                    )}
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

                            <View style={dynamicStyles.cardActions}>
                                <TouchableOpacity
                                    style={[
                                        dynamicStyles.frontPassengerButton,
                                        p.isFrontPassenger ? dynamicStyles.frontPassengerButtonActive : dynamicStyles.frontPassengerButtonInactive
                                    ]}
                                    onPress={() => handleSetFrontPassenger(p.rideId, p.name, p.isFrontPassenger || false)}
                                    disabled={loadingFrontPassenger === p.rideId}
                                >
                                    {loadingFrontPassenger === p.rideId ? (
                                        <View style={dynamicStyles.loadingContainer}>
                                            <Text style={[
                                                dynamicStyles.frontPassengerButtonText,
                                                { color: p.isFrontPassenger ? '#fff' : '#007AFF' }
                                            ]}>
                                                {currentLanguage === 'zu' ? 'Iyalayisha...' :
                                                 currentLanguage === 'tn' ? 'Ya Laisa...' :
                                                 currentLanguage === 'af' ? 'Laai...' :
                                                 'Loading...'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={dynamicStyles.buttonContent}>
                                            <Ionicons
                                                name={p.isFrontPassenger ? "person" : "person-outline"}
                                                size={16}
                                                color={p.isFrontPassenger ? '#fff' : '#007AFF'}
                                            />
                                            <Text style={[
                                                dynamicStyles.frontPassengerButtonText,
                                                { color: p.isFrontPassenger ? '#fff' : '#007AFF' }
                                            ]}>
                                                {p.isFrontPassenger ?
                                                    (currentLanguage === 'zu' ? 'Susa Phambili' :
                                                     currentLanguage === 'tn' ? 'Tlosa Pele' :
                                                     currentLanguage === 'af' ? 'Verwyder Voor' :
                                                     'Remove Front') :
                                                    (currentLanguage === 'zu' ? 'Beka Njengophambili' :
                                                     currentLanguage === 'tn' ? 'Beya Jaaka Pele' :
                                                     currentLanguage === 'af' ? 'Stel as Voor' :
                                                     'Set as Front')}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
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
    statusContainer: {
        alignItems: 'flex-end',
    },
    frontPassengerBadge: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        minWidth: 83,
        alignItems: 'center',
        justifyContent: 'center', 
        marginTop: 10,
    },
    frontPassengerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    statusPaid: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    statusUnpaid: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    statusWaiting: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardDetails: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
        marginBottom: 16,
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
    cardActions: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    frontPassengerButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    frontPassengerButtonActive: {
        backgroundColor: '#007AFF',
    },
    frontPassengerButtonInactive: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    frontPassengerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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