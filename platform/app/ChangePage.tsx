import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";

export default function ChangeDue() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  const changeDueRides = useQuery(api.functions.rides.getChange.getChangeDueRides);
  const markChangeReceived = useMutation(api.functions.rides.getChange.markChangeReceived);

  const handleMarkReceived = async (rideId: Id<"rides">) => {
    await markChangeReceived({ rideId });
  };

  if (!changeDueRides) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.container}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!changeDueRides.length) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <Text style={[styles.headerSubtitle, { color: theme.text }]}>No users need change</Text>
          </View>
          <View style={styles.emptyState}>
            <Ionicons
              name="cash-outline"
              size={64}
              color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
            />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No change needed</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary, marginBottom: 16 }]}>
          {changeDueRides.length} passenger{changeDueRides.length !== 1 ? "s" : ""} need change
        </Text>

        {changeDueRides.map((ride) => (
          <View key={ride.rideId.toString()} style={[styles.passengerCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.passengerInfo}>
                <Text style={[styles.name, { color: theme.text }]}>{ride.passengerName}</Text>
                <Text style={[styles.phoneNumber, { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }]}>
                  {ride.passengerPhone}
                </Text>
              </View>
              <View style={[styles.statusBadge, styles.statusChange]}>
                <Text style={styles.statusText}>Change Due</Text>
              </View>
            </View>

            <View style={[styles.cardDetails, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "#f0f0f0" }]}>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
                <Text style={[styles.detailText, { color: theme.text }]}>Fare: R{ride.fare.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="wallet-outline" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
                <Text style={[styles.detailText, { color: theme.text }]}>Paid: R{ride.amountPaid.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
                <Text style={[styles.detailText, { color: theme.text }]}>Change Due: R{ride.changeDue.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#3b82f6" }]}
                onPress={() => handleMarkReceived(ride.rideId)}
              >
                <Text style={styles.buttonText}>Mark as Received</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20 },
  headerSection: { marginBottom: 16 },
  headerSubtitle: { fontSize: 16, fontWeight: "400" },
  passengerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  passengerInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: "600", marginBottom: 4 },
  phoneNumber: { fontSize: 15, fontWeight: "400" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 90, alignItems: "center" },
  statusChange: { backgroundColor: "rgba(59, 130, 246, 0.1)" },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, color: "#3b82f6" },
  cardDetails: { borderTopWidth: 1, paddingTop: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  detailText: { fontSize: 15, fontWeight: "500", marginLeft: 8 },
  button: { marginTop: 10, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  loadingText: { textAlign: "center", fontSize: 16, marginTop: 40 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 40 },
  emptyStateText: { fontSize: 16, fontWeight: "500", marginTop: 16 },
});