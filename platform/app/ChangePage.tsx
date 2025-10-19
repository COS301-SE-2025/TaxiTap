import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Pressable, Platform, Dimensions } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../contexts/UserContext";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter, useNavigation } from "expo-router";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function ChangeDue() {
  const { theme, isDark } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const { user } = useUser();
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Check if the current user is a front passenger
  const frontPassengerStatus = useQuery(
    api.functions.rides.setFrontPassenger.checkPassengerFrontStatus,
    user ? { passengerId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  // Determine the driver ID to use
  const driverIdToUse = user?.role === 'driver' 
    ? user.id as Id<"taxiTap_users">
    : frontPassengerStatus?.rideInfo?.driverId;

  // Fetch change due data using the appropriate driver ID
  const changeDueData = useQuery(
    api.functions.rides.getActiveTrips.getPassengersNeedingChange,
    driverIdToUse ? { driverId: driverIdToUse } : "skip"
  );

  const markChangeReceived = useMutation(api.functions.rides.getActiveTrips.markChangeGiven);

  const handleMarkReceived = async (rideId: string, paymentType: string) => {
    try {
      const result = await markChangeReceived({ rideId });
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  // Check user authorization
  const isAuthorized = user?.role === 'driver' || 
    (user?.role === 'passenger' && frontPassengerStatus?.isFrontPassenger);

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {currentLanguage === 'zu' ? 'Ushintshi Oselekelwe Nemali Ekhokhelwayo' :
               currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng le Dikadimo' :
               currentLanguage === 'af' ? 'Wisselgeld en Geld Verskuldig' :
               'Change Due or Money Owed'}
            </Text>
          </View>
        </View>
        <View style={styles.container}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {currentLanguage === 'zu' ? 'Sicela ungene ngemvume ukuze uqhubeke' :
             currentLanguage === 'tn' ? 'Tsweetswee tsena go tswelela pele' :
             currentLanguage === 'af' ? 'Meld asseblief aan om voort te gaan' :
             'Please log in to continue'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthorized) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {currentLanguage === 'zu' ? 'Ushintshi Oselekelwe Nemali Ekhokhelwayo' :
               currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng le Dikadimo' :
               currentLanguage === 'af' ? 'Wisselgeld en Geld Verskuldig' :
               'Change Due or Money Owed'}
            </Text>
          </View>
        </View>
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <Text style={[styles.headerTitleSmall, { color: theme.text }]}>
              {currentLanguage === 'zu' ? 'Ukufinyelela Kunqatshelwe' :
               currentLanguage === 'tn' ? 'Phitlhelelo e Gannwe' :
               currentLanguage === 'af' ? 'Toegang Geweier' :
               'Access Denied'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Abashayeli kuphela nabagibeli abakhethwe phambili bangafinyelela kuleli khasi' :
               currentLanguage === 'tn' ? 'Bakhanni fela le bapalami ba pele ba ba tlhophilweng ba ka fitlhelela tsebe eno' :
               currentLanguage === 'af' ? 'Slegs bestuurders en aangewese voorste passasiers kan hierdie bladsy toegang' :
               'Only drivers and designated front passengers can access this page'}
            </Text>
          </View>
          <View style={styles.emptyState}>
            <Ionicons
              name="lock-closed-outline"
              size={64}
              color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}
            />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Kudingeka ube umgibeli wangaphambili ukuze ufinyelele ukulawula inkokhelo' :
               currentLanguage === 'tn' ? 'O tlhoka go nna mopalami wa pele go fitlhelela taolo ya dituelo' :
               currentLanguage === 'af' ? 'Jy moet die voorste passasier wees om betaling bestuur te toegang' :
               'You need to be the front passenger to access payment management'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!changeDueData) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {currentLanguage === 'zu' ? 'Ushintshi Oselekelwe Nemali Ekhokhelwayo' :
               currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng le Dikadimo' :
               currentLanguage === 'af' ? 'Wisselgeld en Geld Verskuldig' :
               'Change Due or Money Owed'}
            </Text>
          </View>
        </View>
        <View style={styles.container}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {currentLanguage === 'zu' ? 'Iyalayisha...' :
             currentLanguage === 'tn' ? 'Ya Laisa...' :
             currentLanguage === 'af' ? 'Laai...' :
             'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { count, passengers } = changeDueData;

  if (!passengers || passengers.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {currentLanguage === 'zu' ? 'Ushintshi Oselekelwe Nemali Ekhokhelwayo' :
               currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng le Dikadimo' :
               currentLanguage === 'af' ? 'Wisselgeld en Geld Verskuldig' :
               'Change Due or Money Owed'}
            </Text>
          </View>
        </View>
        <View style={styles.container}>
          <View style={styles.headerSection}>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Abagibeli abadinga ushintshi noma abasikweleta' :
               currentLanguage === 'tn' ? 'Ga go na bapalami ba ba tlhokang tshelete kgotsa ba ba o adileng' :
               currentLanguage === 'af' ? 'Geen passasiers het wisselgeld nodig of skuld geld nie' :
               'No passengers need change or owe money'}
            </Text>
          </View>
          <View style={styles.emptyState}>
            <Ionicons
              name="cash-outline"
              size={64}
              color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}
            />
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {currentLanguage === 'zu' ? 'Bonke abagibeli bathole ushintshi wabo olulungile futhi bagcwalise izinkokhelo zabo' :
               currentLanguage === 'tn' ? 'Bapalami botlhe ba amogetswe tshelete ya bone e e siameng mme ba diragatsa dituelo tsa bone' :
               currentLanguage === 'af' ? 'Alle passasiers het hul korrekte wisselgeld ontvang en hul betalings vervul' :
               'All passengers have received their correct change and fulfilled their payments'}
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
            {currentLanguage === 'zu' ? 'Ushintshi Oselekelwe Nemali Ekhokhelwayo' :
             currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng le Dikadimo' :
             currentLanguage === 'af' ? 'Wisselgeld en Geld Verskuldig' :
             'Change Due or Money Owed'}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerSection}>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {currentLanguage === 'zu' ? `${count} ${count !== 1 ? 'abagibeli' : 'umgibeli'} ${count === 1 ? 'udinga' : 'badinga'} ushintshi noma basikweleta` :
             currentLanguage === 'tn' ? `${count} ${count !== 1 ? 'bapalami' : 'mopalami'} ${count === 1 ? 'o tlhoka' : 'ba tlhoka'} tshelete kgotsa ba go adile` :
             currentLanguage === 'af' ? `${count} ${count !== 1 ? 'passasiers' : 'passasier'} ${count === 1 ? 'benodig' : 'benodig'} wisselgeld of skuld geld` :
             `${count} passenger${count !== 1 ? "s" : ""} need${count === 1 ? "s" : ""} change or owe money`}
          </Text>
          {frontPassengerStatus?.isFrontPassenger && (
            <View style={styles.frontPassengerBadge}>
              <Ionicons name="person" size={14} color="#007AFF" />
              <Text style={[styles.frontPassengerText, { color: "#007AFF" }]}>
                {currentLanguage === 'zu' ? 'Ukufinyelela Komgibeli Wangaphambili' :
                 currentLanguage === 'tn' ? 'Phitlhelelo ya Mopalami wa Pele' :
                 currentLanguage === 'af' ? 'Voorste Passasier Toegang' :
                 'Front Passenger Access'}
              </Text>
            </View>
          )}
        </View>

        {passengers.map((ride) => {
            let statusText = currentLanguage === 'zu' ? 'Ushintshi Oselekelwe' :
                            currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng' :
                            currentLanguage === 'af' ? 'Wisselgeld Verskuldig' :
                            'Change Due';
            let statusColor = "#f59e0b";
            let statusBackground = "rgba(239, 68, 68, 0.1)";
            let changeLabel = currentLanguage === 'zu' ? 'Ushintshi Oselekelwe' :
                             currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng' :
                             currentLanguage === 'af' ? 'Wisselgeld Verskuldig' :
                             'Change Due';
            let buttonText = currentLanguage === 'zu' ? 'Maka Ushintshi Onikwe' :
                            currentLanguage === 'tn' ? 'Swaya Tshelete e e Filweng' :
                            currentLanguage === 'af' ? 'Merk Wisselgeld Gegee' :
                            'Mark Change Given';
            let buttonColor = "#22c55e";
            let iconName: "cash-outline" | "wallet-outline" = "cash-outline";

            if (ride.paymentType === "underpaid") {
                statusText = currentLanguage === 'zu' ? 'Ukweleta Umshayeli' :
                            currentLanguage === 'tn' ? 'O Adile Mokhanni' :
                            currentLanguage === 'af' ? 'Skuld Bestuurder' :
                            'Owes Driver';
                statusColor = "#ef4444";
                statusBackground = "rgba(245, 158, 11, 0.1)";
                changeLabel = currentLanguage === 'zu' ? `Ukweleta: R${ride.changeDue.toFixed(2)}` :
                             currentLanguage === 'tn' ? `O Adile: R${ride.changeDue.toFixed(2)}` :
                             currentLanguage === 'af' ? `Skuld: R${ride.changeDue.toFixed(2)}` :
                             `Owes: R${ride.changeDue.toFixed(2)}`;
                buttonText = currentLanguage === 'zu' ? 'Maka Imali Etholiwe' :
                            currentLanguage === 'tn' ? 'Swaya Madi a a Amogetsweng' :
                            currentLanguage === 'af' ? 'Merk Geld Ontvang' :
                            'Mark Money Received';
                buttonColor = "#3b82f6";
                iconName = "wallet-outline";
            } else if (ride.paymentType === "overpaid") {
                statusText = currentLanguage === 'zu' ? 'Ushintshi Oselekelwe' :
                            currentLanguage === 'tn' ? 'Tshelete e e Tshwanetsweng' :
                            currentLanguage === 'af' ? 'Wisselgeld Verskuldig' :
                            'Change Due';
                statusColor = "#ef4444";
                statusBackground = "rgba(239, 68, 68, 0.1)";
                changeLabel = currentLanguage === 'zu' ? `Ushintshi: R${ride.changeDue.toFixed(2)}` :
                             currentLanguage === 'tn' ? `Tshelete: R${ride.changeDue.toFixed(2)}` :
                             currentLanguage === 'af' ? `Wisselgeld: R${ride.changeDue.toFixed(2)}` :
                             `Change: R${ride.changeDue.toFixed(2)}`;
                buttonText = currentLanguage === 'zu' ? 'Maka Ushintshi Onikwe' :
                            currentLanguage === 'tn' ? 'Swaya Tshelete e e Filweng' :
                            currentLanguage === 'af' ? 'Merk Wisselgeld Gegee' :
                            'Mark Change Given';
                buttonColor = "#22c55e";
                iconName = "cash-outline";
            }

            return (
                <View key={ride.rideId} style={[styles.passengerCard, { backgroundColor: theme.card }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.passengerInfo}>
                    <Text style={[styles.name, { color: theme.text }]}>{ride.name}</Text>
                    <Text style={[styles.phoneNumber, { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }]}>
                        {ride.phoneNumber}
                    </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBackground }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                </View>

                <View style={[styles.cardDetails, { borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "#f0f0f0" }]}>
                    <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
                    <Text style={[styles.detailText, { color: theme.text }]}>
                      {currentLanguage === 'zu' ? `Intengo: R${ride.fare.toFixed(2)}` :
                       currentLanguage === 'tn' ? `Tuelo: R${ride.fare.toFixed(2)}` :
                       currentLanguage === 'af' ? `Tarief: R${ride.fare.toFixed(2)}` :
                       `Fare: R${ride.fare.toFixed(2)}`}
                    </Text>
                    </View>
                    <View style={styles.detailRow}>
                    <Ionicons name="wallet-outline" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
                    <Text style={[styles.detailText, { color: theme.text }]}>
                      {currentLanguage === 'zu' ? `Kukhokhiwe: R${ride.amountPaid.toFixed(2)}` :
                       currentLanguage === 'tn' ? `E Dueletswe: R${ride.amountPaid.toFixed(2)}` :
                       currentLanguage === 'af' ? `Betaal: R${ride.amountPaid.toFixed(2)}` :
                       `Paid: R${ride.amountPaid.toFixed(2)}`}
                    </Text>
                    </View>
                    <View style={styles.detailRow}>
                    <Ionicons name={iconName} size={16} color={statusColor} />
                    <Text style={[styles.detailText, { color: statusColor, fontWeight: "600" }]}>{changeLabel}</Text>
                    </View>

                    <TouchableOpacity
                    style={[styles.button, { backgroundColor: buttonColor }]}
                    onPress={() => handleMarkReceived(ride.rideId, ride.paymentType)}
                    >
                    <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                </View>
                </View>
            );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: "600", flex: 1 },
  container: { padding: 20 },
  headerSection: { marginBottom: 24 },
  headerTitleSmall: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  headerSubtitle: { fontSize: 16, fontWeight: "400", marginBottom: 8 },
  frontPassengerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  frontPassengerText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
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
    borderColor: "rgba(0,0,0,0.08)",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  passengerInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: "600", marginBottom: 4 },
  phoneNumber: { fontSize: 15, fontWeight: "400" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 90, alignItems: "center" },
  statusChange: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, color: "#ef4444" },
  cardDetails: { borderTopWidth: 1, paddingTop: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  detailText: { fontSize: 15, fontWeight: "500", marginLeft: 8 },
  button: { marginTop: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  loadingText: { textAlign: "center", fontSize: 16, marginTop: 40 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyStateText: { fontSize: 16, fontWeight: "500", marginTop: 16, textAlign: "center", maxWidth: 250 },
});