import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocalSearchParams } from 'expo-router';

export default function TaxiInfoPage() {
  const { theme, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const { userId } = useLocalSearchParams();

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    noMatchingTaxiFound: {
      en: "No matching taxi found.",
      zu: "Awukho itekisi elihambelana.",
      tn: "Ga go na tekisi e e tshwanang.",
      af: "Geen passende taxi gevind nie."
    },
    driverNotFound: {
      en: "Driver not found.",
      zu: "Umshayeli awutholakali.",
      tn: "Mokgweetsi ga a bonwe.",
      af: "Bestuurder nie gevind nie."
    },
    driverInformation: {
      en: "Driver Information",
      zu: "Ulwazi Lwomshayeli",
      tn: "Tshedimosetso ya Mokgweetsi",
      af: "Bestuurderinligting"
    },
    name: {
      en: "Name:",
      zu: "Igama:",
      tn: "Leina:",
      af: "Naam:"
    },
    experience: {
      en: "Experience:",
      zu: "Isipiliyoni:",
      tn: "Maitemogelo:",
      af: "Ervaring:"
    },
    yearsExperience: {
      en: "5 years",
      zu: "Iminyaka emi-5",
      tn: "Dingwaga tse 5",
      af: "5 jaar"
    },
    taxiInformation: {
      en: "Taxi Information",
      zu: "Ulwazi Lwetekisi",
      tn: "Tshedimosetso ya Tekisi",
      af: "Taxiinligting"
    },
    vehicleType: {
      en: "Vehicle type:",
      zu: "Uhlobo lwemoto:",
      tn: "Mofuta wa koloi:",
      af: "Voertuigtipe:"
    },
    licensePlate: {
      en: "License plate:",
      zu: "Iphepha lelayisense:",
      tn: "Phepha ya laesense:",
      af: "Kentekenplaat:"
    },
    totalSeats: {
      en: "Total seats:",
      zu: "Izihlalo eziphelele:",
      tn: "Diseatulo tse di Phelele:",
      af: "Totale sitplekke:"
    },
    noImage: {
      en: "No Image",
      zu: "Awukho Isithombe",
      tn: "Ga go na Setšhupo",
      af: "Geen Beeld"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const driverDetails = useQuery(api.functions.taxis.displayTaxis.getAvailableTaxis);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 4,
      marginBottom: 20,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      marginBottom: 12,
    },
    label: {
      fontWeight: 'bold',
      color: theme.text,
      width: 120,
    },
    value: {
      color: theme.text,
      flexShrink: 1,
    },
    image: {
      width: '100%',
      height: 200,
      marginTop: 10,
      borderRadius: 12,
    },
  });

    if (driverDetails === undefined) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />;
    }

    const taxi = driverDetails.find((item) => item.userId === userId);

    if (!taxi) {
        return <Text>{getTranslation('noMatchingTaxiFound')}</Text>;
    }

  if (driverDetails === undefined) {
    return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />;
  }

  if (driverDetails === null) {
    return <Text style={{ color: theme.text, padding: 20 }}>{getTranslation('driverNotFound')}</Text>;
  }


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>{getTranslation('driverInformation')}</Text>
      <View style={styles.card}>
        <Ionicons name="person-circle" size={64} color={theme.primary} style={{ marginBottom: 20 }} />
        <View style={styles.row}>
          <Text style={styles.label}>{getTranslation('name')}</Text>
          <Text style={styles.value}>{taxi.driverName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{getTranslation('experience')}</Text>
          <Text style={styles.value}>{getTranslation('yearsExperience')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{getTranslation('taxiInformation')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{getTranslation('vehicleType')}</Text>
          <Text style={styles.value}>{taxi.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{getTranslation('licensePlate')}</Text>
          <Text style={styles.value}>{taxi.licensePlate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{getTranslation('totalSeats')}</Text>
          <Text style={styles.value}>{taxi.seats}</Text>
        </View>
        {taxi.image ? (
            <Image
                source={{ uri: taxi.image }}
                resizeMode="contain"
                style={styles.image}
            />
            ) : (
            <Text style={{ color: 'red' }}>{getTranslation('noImage')}</Text>
        )}
      </View>
    </ScrollView>
  );
}