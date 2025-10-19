import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Pressable, Platform, Dimensions } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function StatsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  const { t, currentLanguage } = useLanguage();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  const activeTrips = useQuery(
    api.functions.rides.getActiveTrips.getActiveTrips,
    user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  // Use getPassengersNeedingChange for more accurate change due count
  const changeDueData = useQuery(
    api.functions.rides.getActiveTrips.getPassengersNeedingChange,
    user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  const changeDueCount = changeDueData?.count ?? 0;

  const handleBackPress = () => {
    router.back();
  };

  if (!user || activeTrips === undefined || changeDueData === undefined) {
    return (
      <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[dynamicStyles.header, { backgroundColor: theme.background, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={dynamicStyles.headerRow}>
            <Pressable style={[dynamicStyles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={[dynamicStyles.headerTitle, { color: theme.text }]}>
              {currentLanguage === 'zu' ? 'Ibhodi Lomsebenzi' :
               currentLanguage === 'tn' ? 'Boto ya Tiro' :
               currentLanguage === 'af' ? 'Dashboard' :
               'Dashboard'}
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[dynamicStyles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[dynamicStyles.header, { backgroundColor: theme.background, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={dynamicStyles.headerRow}>
          <Pressable style={[dynamicStyles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text style={[dynamicStyles.headerTitle, { color: theme.text }]}>
            {currentLanguage === 'zu' ? 'Ibhodi Lomsebenzi' :
             currentLanguage === 'tn' ? 'Boto ya Tiro' :
             currentLanguage === 'af' ? 'Dashboard' :
             'Dashboard'}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={dynamicStyles.headerSection}>
          <Text style={[dynamicStyles.headerSubtitle, { color: theme.textSecondary }]}>
            {currentLanguage === 'zu' ? 'Ukubuka Izigibelo Nokukhokha' :
             currentLanguage === 'tn' ? 'Kakaretso ya Dipalamo le Dituelo' :
             currentLanguage === 'af' ? 'Rit en betaling oorsig' :
             'Ride and payment overview'}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={[dynamicStyles.summarySection, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }]}>
          <Text style={[dynamicStyles.summaryTitle, { color: theme.text }]}>
            {currentLanguage === 'zu' ? 'Isifinyezo Esisheshayo' :
             currentLanguage === 'tn' ? 'Kakaretso e Khutshwane' :
             currentLanguage === 'af' ? 'Vinnige Opsomming' :
             'Quick Summary'}
          </Text>
          <View style={dynamicStyles.summaryContent}>
            <Text style={[dynamicStyles.summaryText, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? `Unezigibelo ezisebenzayo ezingu-${activeTrips?.activeCount || 0} nezinkokhelo ezilindile ezingu-${activeTrips?.noResponseCount || 0}.` :
               currentLanguage === 'tn' ? `O na le dipalamo tse ${activeTrips?.activeCount || 0} tse di dirang le dituelo tse ${activeTrips?.noResponseCount || 0} tse di letileng.` :
               currentLanguage === 'af' ? `Jy het ${activeTrips?.activeCount || 0} aktiewe ritte en ${activeTrips?.noResponseCount || 0} betalings hangend.` :
               `You have ${activeTrips?.activeCount || 0} active rides and ${activeTrips?.noResponseCount || 0} payments pending.`}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={dynamicStyles.statsGrid}>
          <TouchableOpacity
            style={[dynamicStyles.statCard, dynamicStyles.activeRidesCard, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#22C55E' }]}
            onPress={() => router.push("/ActiveRides")}
          >
            <Text style={[dynamicStyles.statNumber, { color: theme.text }]}>{activeTrips?.activeCount || 0}</Text>
            <Text style={[dynamicStyles.statLabel, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Izigibelo Ezisebenzayo' :
               currentLanguage === 'tn' ? 'Dipalamo tse di Dirang' :
               currentLanguage === 'af' ? 'Aktiewe Ritte' :
               'Active Rides'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard4, dynamicStyles.changeDueCard, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(255, 255, 0, 0.3)' : '#FFFF00' }]}
            onPress={() => router.push("/ChangePage")}
          >
            <Text style={[dynamicStyles.statNumber, { color: theme.text }]}>{changeDueCount || 0}</Text>
            <Text style={[dynamicStyles.statLabel, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Ushintshi Oselekelwe Nemali Ekhokhelwayo' :
               currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng le Dikadimo' :
               currentLanguage === 'af' ? 'Wisselgeld en Geld Verskuldig' :
               'Change Due and Money Owed'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard2, dynamicStyles.waitingPaymentsCard, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(255, 153, 0, 0.3)' : '#FF9900' }]}
            onPress={() => router.push("/WaitingPayments")}
          >
            <Text style={[dynamicStyles.statNumber, { color: theme.text }]}>{activeTrips?.noResponseCount || 0}</Text>
            <Text style={[dynamicStyles.statLabel, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Izinkokhelo Ezilindile' :
               currentLanguage === 'tn' ? 'Dituelo tse di Letileng' :
               currentLanguage === 'af' ? 'Hangende Betalings' :
               'Pending Payments'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard3, dynamicStyles.unpaidAccountsCard, { backgroundColor: theme.card, borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#EF4444' }]}
            onPress={() => router.push("/UnpaidPayments")}
          >
            <Text style={[dynamicStyles.statNumber, { color: theme.text }]}>{activeTrips?.unpaidCount || 0}</Text>
            <Text style={[dynamicStyles.statLabel, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Ama-Akhawunti Angakhokhelwanga' :
               currentLanguage === 'tn' ? 'Diakhaonto tse di sa Duelwang' :
               currentLanguage === 'af' ? 'Onbetaalde Rekeninge' :
               'Unpaid Accounts'}
            </Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '400',
  },
  statsGrid: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
    marginBottom: 16,
  },
  statCard2: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9900',
    marginBottom: 16,
  },
  statCard3: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 16,
  },
  statCard4: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFF00',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  activeRidesCard: {
    borderTopWidth: 3,
    borderTopColor: '#10b981',
  },
  waitingPaymentsCard: {
    borderTopWidth: 3,
    borderTopColor: '#f59e0b',
  },
  unpaidAccountsCard: {
    borderTopWidth: 3,
    borderTopColor: '#ef4444',
  },
  changeDueCard: {
    borderTopWidth: 3,
    borderTopColor: '#FFFF00',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryContent: {
    paddingTop: 8,
  },
  summaryText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
});