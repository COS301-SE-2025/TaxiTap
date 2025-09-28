import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { useLanguage } from '../../contexts/LanguageContext';

const TransactionHistoryScreen = () => {
  const { passengerId } = useLocalSearchParams<{ passengerId?: string }>();
  const { currentLanguage } = useLanguage();

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    noPassengerIdProvided: {
      en: "No passenger ID provided",
      zu: "Awukho i-ID yomhambi enikeziwe",
      tn: "Ga go na ID ya moleledi e e neilweng",
      af: "Geen passasier-ID verskaf nie"
    },
    loadingTransactions: {
      en: "Loading transactions...",
      zu: "Kulayishwa ukuhwebelana...",
      tn: "Go tsena ditlhwatlhwa...",
      af: "Laai transaksies..."
    },
    transactionHistory: {
      en: "Transaction History",
      zu: "Umlando Wokuhwebelana",
      tn: "Histori ya Ditlhwatlhwa",
      af: "Transaksiegeskiedenis"
    },
    noRecentTransactions: {
      en: "No recent transactions",
      zu: "Awukho ukuhwebelana kwakamuva",
      tn: "Ga go na ditlhwatlhwa tsa maabane",
      af: "Geen onlangse transaksies"
    },
    driver: {
      en: "Driver:",
      zu: "Umshayeli:",
      tn: "Mokgweetsi:",
      af: "Bestuurder:"
    },
    owes: {
      en: "Owes:",
      zu: "Ubanikwe:",
      tn: "O tshwerwe:",
      af: "Skuld:"
    },
    changeDue: {
      en: "Change Due:",
      zu: "Ushele Okufanele:",
      tn: "Tsheko e e Tshwanetseng:",
      af: "Wisselgeld Verskuldig:"
    },
    overpaidTrip: {
      en: "Overpaid Trip",
      zu: "Uhambo Olukhokhiwe Ngaphezulu",
      tn: "Leeto le le Tshwerwe ka Nako e Ntsi",
      af: "Oorbetaalde Rit"
    },
    exactPayment: {
      en: "Exact Payment",
      zu: "Inkokhelo Eqondile",
      tn: "Tlhwatlhwa e e Tokafaditseng",
      af: "Presiese Betaling"
    },
    underpaidTrip: {
      en: "Underpaid Trip",
      zu: "Uhambo Olukhokhiwe Ngaphansi",
      tn: "Leeto le le Tshwerwe ka Nako e Nnye",
      af: "Onderbetaalde Rit"
    },
    notPaid: {
      en: "Not Paid",
      zu: "Akukakhokhiwe",
      tn: "Ga e Tshwerwe",
      af: "Nie Betaal"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const transactions = useQuery(
    api.functions.users.wallet.getTransactionHistory,
    passengerId ? { passengerId: passengerId as Id<"taxiTap_users">} : "skip"
  );

  const paymentTypeLabels: Record<string, string> = {
    overpaid: getTranslation('overpaidTrip'),
    exact: getTranslation('exactPayment'),
    underpaid: getTranslation('underpaidTrip'),
    not_paid: getTranslation('notPaid'),
  };

  if (!passengerId) {
    return (
      <View style={styles.center}>
        <Text>{getTranslation('noPassengerIdProvided')}</Text>
      </View>
    );
  }

  if (!transactions) {
    return (
      <View style={styles.center}>
        <Text>{getTranslation('loadingTransactions')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.header}>{getTranslation('transactionHistory')}</Text>

      {transactions.length === 0 && (
        <Text style={styles.empty}>{getTranslation('noRecentTransactions')}</Text>
      )}

      {transactions.map((tx) => (
        <View key={tx.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.date}>
              {new Date(tx.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Text
              style={[
                styles.status,
                tx.paymentStatus === "paid" ? styles.paid : styles.unpaid,
              ]}
            >
              {tx.paymentStatus.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.location}>
            {tx.startLocation} → {tx.endLocation}
          </Text>

          <View style={styles.separator} />
          
          <View style={styles.rowBetween}>
            <Text style={styles.fare}>R {tx.fare.toFixed(2)}</Text>
            <View style={styles.row}>
              <Ionicons name="card" size={18} color="#007AFF" style={styles.icon} />
              <Text style={styles.paymentType}>
                {paymentTypeLabels[tx.paymentType] || tx.paymentType}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />
          
          {tx.driver && (
            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={styles.driver}>{getTranslation('driver')} {tx.driver.name}</Text>
            </View>
          )}

          {(tx.amountOwed > 0 || tx.changeDue > 0) && (
            <View style={{ marginTop: 8 }}>
              {tx.amountOwed > 0 && (
                <Text style={styles.owed}>{getTranslation('owes')} R {tx.amountOwed.toFixed(2)}</Text>
              )}
              {tx.changeDue > 0 && (
                <Text style={styles.change}>{getTranslation('changeDue')} R {tx.changeDue.toFixed(2)}</Text>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  empty: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: "#e0e0e0",
    marginTop: 10,
  },
  date: {
    fontWeight: "600",
    color: "#111",
  },
  status: {
    fontWeight: "600",
  },
  paid: {
    color: "green",
  },
  unpaid: {
    color: "red",
  },
  location: {
    color: "#555",
    fontSize: 12,
    marginTop: 10,
  },
  fare: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  paymentType: {
    color: "#007AFF",
    fontWeight: "500",
  },
  driver: {
    color: "#666",
  },
  owed: {
    color: "red",
    fontWeight: "600",
  },
  change: {
    color: "green",
    fontWeight: "600",
  },
  icon: {
    marginRight: 6,
  },
});

export default TransactionHistoryScreen;