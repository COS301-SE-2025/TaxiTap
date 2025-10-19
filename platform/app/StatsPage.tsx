import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Pressable } from "react-native";
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

export default function StatsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  
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

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      backgroundColor: theme.background,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },
    headerSection: {
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      fontWeight: '500',
    },
    statsGrid: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 4,
      alignItems: 'center',
      elevation: 2,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)',
      marginBottom: 16,
    },
    statCard2: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 4,
      alignItems: 'center',
      elevation: 2,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 153, 0, 0.4)' : 'rgba(255, 153, 0, 0.3)',
      marginBottom: 16,
    },
    statCard3: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 4,
      alignItems: 'center',
      elevation: 2,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)',
      marginBottom: 16,
    },
    statCard4: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 4,
      alignItems: 'center',
      elevation: 2,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.3)',
      marginBottom: 16,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 18,
    },
    activeRidesCard: {
      borderTopWidth: 3,
      borderTopColor: isDark ? '#22c55e' : '#10b981',
    },
    waitingPaymentsCard: {
      borderTopWidth: 3,
      borderTopColor: isDark ? '#fbbf24' : '#f59e0b',
    },
    unpaidAccountsCard: {
      borderTopWidth: 3,
      borderTopColor: isDark ? '#f87171' : '#ef4444',
    },
    changeDueCard: {
      borderTopWidth: 3,
      borderTopColor: isDark ? '#facc15' : '#eab308',
    },
    summarySection: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 24,
      elevation: 1,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      marginBottom: 16,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    summaryContent: {
      paddingTop: 8,
    },
    summaryText: {
      fontSize: 15,
      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      lineHeight: 22,
    },
  });

  if (!user || activeTrips === undefined || changeDueData === undefined) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <View style={dynamicStyles.container}>
          <View style={dynamicStyles.headerSection}>
            <Text style={dynamicStyles.headerTitle}>Dashboard</Text>
            <Text style={dynamicStyles.headerSubtitle}>Loading...</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner size="large" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView 
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={dynamicStyles.headerSection}>
          <Text style={dynamicStyles.headerSubtitle}>Ride and payment overview</Text>
        </View>

        {/* Summary Section */}
        <View style={dynamicStyles.summarySection}>
          <Text style={dynamicStyles.summaryTitle}>Quick Summary</Text>
          <View style={dynamicStyles.summaryContent}>
            <Text style={dynamicStyles.summaryText}>
              You have {activeTrips?.activeCount || 0} active rides and {activeTrips?.noResponseCount || 0} payments pending.
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={dynamicStyles.statsGrid}>
          <TouchableOpacity
            style={[dynamicStyles.statCard, dynamicStyles.activeRidesCard]}
            onPress={() => router.push("/ActiveRides")}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.statNumber}>{activeTrips?.activeCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Active Rides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard4, dynamicStyles.changeDueCard]}
            onPress={() => router.push("/ChangePage")}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.statNumber}>{changeDueCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Change Due and Money Owed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard2, dynamicStyles.waitingPaymentsCard]}
            onPress={() => router.push("/WaitingPayments")}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.statNumber}>{activeTrips?.noResponseCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Pending Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard3, dynamicStyles.unpaidAccountsCard]}
            onPress={() => router.push("/UnpaidPayments")}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.statNumber}>{activeTrips?.unpaidCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Unpaid Accounts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}