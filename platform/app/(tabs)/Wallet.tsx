import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, Dimensions } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { useTheme } from "../../contexts/ThemeContext";

const TransactionHistoryScreen = () => {
  const { passengerId } = useLocalSearchParams<{ passengerId?: string }>();
  const router = useRouter();
  const { theme, isDark } = useTheme();
  
  // Screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  const isLargeScreen = screenWidth >= 414;

  const transactions = useQuery(
    api.functions.users.wallet.getTransactionHistory,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users">} : "skip"
  );

  const paymentTypeLabels: Record<string, string> = {
    overpaid: "Overpaid Trip",
    exact: "Exact Payment",
    underpaid: "Underpaid Trip",
    not_paid: "Not Paid",
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingTop: Platform.OS === 'ios' ? (screenHeight > 800 ? 80 : 70) : 60,
      paddingBottom: 20,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingTop: 16,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    centerText: {
      fontSize: 16,
      color: theme.text,
      textAlign: 'center',
    },
    empty: {
      textAlign: "center",
      color: theme.textSecondary,
      marginTop: 20,
      fontSize: 16,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: isSmallScreen ? 12 : 16,
      marginBottom: isSmallScreen ? 12 : 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      // iOS-style shadows for both platforms
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
    },
    separator: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      marginTop: 10,
    },
    date: {
      fontWeight: "600",
      color: theme.text,
      fontSize: 15,
    },
    status: {
      fontWeight: "600",
      fontSize: 13,
    },
    paid: {
      color: "#34C759",
    },
    unpaid: {
      color: "#FF3B30",
    },
    location: {
      color: theme.textSecondary,
      fontSize: 13,
      marginTop: 8,
      lineHeight: 18,
    },
    fare: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    paymentType: {
      color: theme.primary,
      fontWeight: "500",
      fontSize: 13,
    },
    driver: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    owed: {
      color: "#FF3B30",
      fontWeight: "600",
      fontSize: 13,
    },
    change: {
      color: "#34C759",
      fontWeight: "600",
      fontSize: 13,
    },
    icon: {
      marginRight: 6,
    },
  });

  if (!passengerId) {
    return (
      <View style={dynamicStyles.container}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerRow}>
            <Pressable style={dynamicStyles.backButton} onPress={() => router.push('/(tabs)/PassengerProfile')}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={dynamicStyles.headerTitle}>My Wallet</Text>
          </View>
        </View>
        
        <View style={dynamicStyles.center}>
          <Text style={dynamicStyles.centerText}>No passenger ID provided</Text>
        </View>
      </View>
    );
  }

  if (!transactions) {
    return (
      <View style={dynamicStyles.container}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerRow}>
            <Pressable style={dynamicStyles.backButton} onPress={() => router.push('/(tabs)/PassengerProfile')}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={dynamicStyles.headerTitle}>My Wallet</Text>
          </View>
        </View>
        
        <View style={dynamicStyles.center}>
          <Text style={dynamicStyles.centerText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerRow}>
          <Pressable style={dynamicStyles.backButton} onPress={() => router.push('/(tabs)/PassengerProfile')}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text style={dynamicStyles.headerTitle}>My Wallet</Text>
        </View>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: Platform.OS === 'ios' ? 40 : 20 
          }}
        >

      {transactions.length === 0 && (
        <Text style={dynamicStyles.empty}>No recent transactions</Text>
      )}

      {transactions.map((tx) => (
        <View key={tx.id} style={dynamicStyles.card}>
          <View style={dynamicStyles.rowBetween}>
            <Text style={dynamicStyles.date}>
              {new Date(tx.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text
              style={[
                dynamicStyles.status,
                tx.paymentStatus === "paid" ? dynamicStyles.paid : dynamicStyles.unpaid,
              ]}
            >
              {tx.paymentStatus.toUpperCase()}
            </Text>
          </View>

          <Text style={dynamicStyles.location}>
            {tx.startLocation} → {tx.endLocation}
          </Text>

          <View style={dynamicStyles.separator} />
          
          <View style={dynamicStyles.rowBetween}>
            <Text style={dynamicStyles.fare}>R {tx.fare.toFixed(2)}</Text>
            <View style={dynamicStyles.row}>
              <Ionicons name="card" size={18} color={theme.primary} style={dynamicStyles.icon} />
              <Text style={dynamicStyles.paymentType}>
                {paymentTypeLabels[tx.paymentType] || tx.paymentType}
              </Text>
            </View>
          </View>

          <View style={dynamicStyles.separator} />
          
          {tx.driver && (
            <View style={[dynamicStyles.row, { marginTop: 8 }]}>
              <Text style={dynamicStyles.driver}>Driver: {tx.driver.name}</Text>
            </View>
          )}

          {(tx.amountOwed > 0 || tx.changeDue > 0) && (
            <View style={{ marginTop: 8 }}>
              {tx.amountOwed > 0 && (
                <Text style={dynamicStyles.owed}>Owes: R {tx.amountOwed.toFixed(2)}</Text>
              )}
              {tx.changeDue > 0 && (
                <Text style={dynamicStyles.change}>Change Due: R {tx.changeDue.toFixed(2)}</Text>
              )}
            </View>
          )}
        </View>
      ))}
        </ScrollView>
      </View>
    </View>
  );
};


export default TransactionHistoryScreen;