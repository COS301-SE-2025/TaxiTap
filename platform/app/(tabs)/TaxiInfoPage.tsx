import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLocalSearchParams } from 'expo-router';

export default function TaxiInfoPage() {
  const { theme, isDark } = useTheme();
  const { userId } = useLocalSearchParams();

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
        return <Text>No matching taxi found.</Text>;
    }

  if (driverDetails === undefined) {
    return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />;
  }

  if (driverDetails === null) {
    return <Text style={{ color: theme.text, padding: 20 }}>Driver not found.</Text>;
  }


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Driver Information</Text>
      <View style={styles.card}>
        <Ionicons name="person-circle" size={64} color={theme.primary} style={{ marginBottom: 20 }} />
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{taxi.driverName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Experience:</Text>
          <Text style={styles.value}>5 years</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Taxi Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Vehicle type:</Text>
          <Text style={styles.value}>{taxi.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>License plate:</Text>
          <Text style={styles.value}>{taxi.licensePlate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total seats:</Text>
          <Text style={styles.value}>{taxi.seats}</Text>
        </View>
        {taxi.image ? (
            <Image
                source={{ uri: taxi.image }}
                resizeMode="contain"
                style={styles.image}
            />
            ) : (
            <Text style={{ color: 'red' }}>No Image</Text>
        )}
      </View>
    </ScrollView>
  );
}