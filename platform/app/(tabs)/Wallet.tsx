import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";

const WalletScreen = () => {
  const { passengerId } = useLocalSearchParams<{ passengerId?: string }>();

  // Don’t run queries if passengerId is missing
  const walletSummary = useQuery(
    api.functions.users.wallet.getWalletSummary,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users"> } : "skip"
  );

  const transactionHistory = useQuery(
    api.functions.users.wallet.getTransactionHistory,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users">, limit: 20 } : "skip"
  );

  const spendingAnalytics = useQuery(
    api.functions.users.wallet.getSpendingAnalytics,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users"> } : "skip"
  );

  const outstandingPayments = useQuery(
    api.functions.users.wallet.getOutstandingPayments,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users"> } : "skip"
  );

  const walletBalance = useQuery(
    api.functions.users.wallet.getWalletBalance,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users"> } : "skip"
  );

  const markPaymentCompleted = useMutation(api.functions.users.wallet.markPaymentCompleted);

  if (!passengerId) {
    return <Text style={styles.loading}>No passenger ID provided</Text>;
  }

  if (!walletSummary || !transactionHistory || !walletBalance) {
    return <Text style={styles.loading}>Loading wallet...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Wallet Balance */}
      <View style={styles.card}>
        <Text style={styles.title}>Wallet Balance</Text>
        <Text style={styles.balance}>R {walletBalance.balance.toFixed(2)}</Text>
        <Text>Total Spent: R {walletBalance.totalSpent.toFixed(2)}</Text>
        <Text>Total Paid: R {walletBalance.totalPaid.toFixed(2)}</Text>
        <Text>Total Owed: R {walletBalance.totalOwed.toFixed(2)}</Text>
      </View>

      {/* Wallet Summary */}
      <View style={styles.card}>
        <Text style={styles.title}>Summary ({walletSummary.timeframe})</Text>
        <Text>Total Trips: {walletSummary.totalTrips}</Text>
        <Text>Average Trip: R {walletSummary.averageTrip.toFixed(2)}</Text>
        <Text>Total Spent: R {walletSummary.totalSpent.toFixed(2)}</Text>
        <Text style={styles.subtitle}>Payment Types:</Text>
        {Object.entries(walletSummary.paymentTypes).map(([type, count]) => (
          <Text key={type}>- {type}: {count}</Text>
        ))}
      </View>

      {/* Outstanding Payments */}
      {outstandingPayments && outstandingPayments.rides.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.title}>Outstanding Payments</Text>
          <Text>Total Owed: R {outstandingPayments.totalOwed.toFixed(2)}</Text>
          {outstandingPayments.rides.map((ride) => (
            <View key={ride.id} style={styles.row}>
              <Text>{ride.startLocation} → {ride.endLocation}</Text>
              <Text>R {ride.amountOwed.toFixed(2)}</Text>
              <TouchableOpacity
                onPress={() =>
                  markPaymentCompleted({ rideId: ride.id, amountPaid: ride.amountOwed })
                }
              >
                <Ionicons name="checkmark-circle" size={24} color="green" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Transactions */}
      <View style={styles.card}>
        <Text style={styles.title}>Recent Transactions</Text>
        {transactionHistory.map((tx) => (
          <View key={tx.id} style={styles.row}>
            <Text>{new Date(tx.date).toLocaleDateString()}</Text>
            <Text>R {tx.fare.toFixed(2)} ({tx.paymentType})</Text>
          </View>
        ))}
      </View>

      {/* Spending Analytics */}
      {spendingAnalytics && (
        <View style={styles.card}>
          <Text style={styles.title}>Spending Analytics</Text>
          <Text>Last 7 Days: R {spendingAnalytics.last7Days.totalSpent.toFixed(2)}</Text>
          <Text>Last 30 Days: R {spendingAnalytics.last30Days.totalSpent.toFixed(2)}</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default WalletScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 8,
    fontWeight: "600",
  },
  balance: {
    fontSize: 22,
    fontWeight: "bold",
    color: "green",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
    alignItems: "center",
  },
  loading: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
});