import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useUser } from '../../contexts/UserContext';

const PaymentScreen = () => {
  const { user } = useUser();
  const userId = user?.id;
  if (!user) return;
  const fare = useQuery(api.functions.earnings.fare.getFareForLatestTrip, userId ? { userId: userId as Id<"taxiTap_users"> } : "skip", );

  const paymentMethods = [
    {
      name: "SnapScan",
      icon: require("../../assets/images/snapscan.png"),
      textColor: "#007aff",
    },
    {
      name: "vodapay",
      icon: require("../../assets/images/vodapay.png"),
      textColor: "#E53935",
    },
    {
      name: "MoMo",
      icon: require("../../assets/images/momo.png"),
      textColor: "#FFB300",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Total Box */}
      <View style={styles.totalBox}>
        <Text style={styles.totalText}>Total</Text>
        <Text style={styles.amountText}> R{(fare ?? 0).toFixed(2)}</Text>
      </View>

      {/* Payment Methods Label */}
      <Text style={styles.paymentLabel}>Payment methods</Text>

      {/* Payment Methods List */}
      {paymentMethods.map((method, index) => (
        <TouchableOpacity key={index} style={styles.methodBox}>
          <View style={styles.methodLeft}>
            <Image source={method.icon} style={styles.methodIcon} />
          </View>
          <Ionicons name="chevron-forward" size={20} color="#333" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  totalBox: {
    backgroundColor: "#EED0B3",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "600",
  },
  amountText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  methodBox: {
    backgroundColor: "#F1D7BB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  methodIcon: {
    width: 126,
    height: 26,
    marginRight: 12,
  },
});