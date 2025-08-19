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

export default function StatsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

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
            <Text style={dynamicStyles.headerTitle}>Dashboard</Text>
            <Text style={dynamicStyles.headerSubtitle}>Loading...</Text>
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
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={dynamicStyles.headerSection}>
          <Text style={dynamicStyles.sectionTitle}>Dashboard</Text>
          <Text style={dynamicStyles.headerSubtitle}>Ride and payment overview</Text>
        </View>

        {/* Stats Grid */}
        <View style={dynamicStyles.statsGrid}>
          <TouchableOpacity
            style={[dynamicStyles.statCard, dynamicStyles.activeRidesCard]}
            onPress={() => router.push("/ActiveRides")}
          >
            <Text style={dynamicStyles.statNumber}>{activeTrips?.activeCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Active Rides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard, dynamicStyles.waitingPaymentsCard]}
            onPress={() => router.push("/WaitingPayments")}
          >
            <Text style={dynamicStyles.statNumber}>{activeTrips?.noResponseCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Pending Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.statCard, dynamicStyles.unpaidAccountsCard]}
            onPress={() => router.push("/UnpaidPayments")}
          >
            <Text style={dynamicStyles.statNumber}>{activeTrips?.unpaidCount || 0}</Text>
            <Text style={dynamicStyles.statLabel}>Unpaid Accounts</Text>
          </TouchableOpacity>
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
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'flex-start',
    paddingVertical: 24,
    marginBottom: 32,
  },
  sectionTitle: {
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
  statsGrid: {
    flexDirection: 'row',
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
    borderColor: '#f0f0f0',
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