import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Linking } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function HelpScreen() {
  const { theme, isDark } = useTheme();

  const handleContactSupport = () => {
    Alert.alert("Support", "You can contact support at: gititdone.2025@gmail.com");
  };

  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flexGrow: 1,
      padding: 16,
      backgroundColor: theme.background,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 15,
      color: theme.text,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 10,
      padding: 15,
      marginBottom: 15,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
    },
    question: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
      color: theme.text,
    },
    answer: {
      fontSize: 14,
      color: theme.text,
    },
    supportButton: {
      marginTop: 10,
      backgroundColor: theme.primary,
      paddingVertical: 10,
      borderRadius: 8,
    },
    supportButtonText: {
      color: isDark ? '#121212' : '#fff',
      fontWeight: '600',
      textAlign: 'center',
    }
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView contentContainerStyle={dynamicStyles.container}>
          <Text style={dynamicStyles.sectionTitle}>User Manual</Text>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>How to navigate the app?</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://raw.githubusercontent.com/COS301-SE-2025/Taxi-Tap/main/docs/Taxi%20Tap%20User%20Manual.pdf')}>
            <Text style={dynamicStyles.answer}>
              Link to manual
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={dynamicStyles.sectionTitle}>Frequently Asked Questions</Text>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>How do I book a ride?</Text>
          <Text style={dynamicStyles.answer}>
            Go to the home screen, select your destination and reserve a seat, select your taxi.
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>How do I switch between passenger and driver roles?</Text>
          <Text style={dynamicStyles.answer}>
            You can change your active role from your profile settings if your account supports both roles.
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>I forgot my password. What do I do?</Text>
          <Text style={dynamicStyles.answer}>
            On the login screen, select "Forgot Password" to reset your password via SMS verification.
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>How do I contact support?</Text>
          <Text style={dynamicStyles.answer}>
            If you have any issues, feel free to contact us directly.
          </Text>
          <TouchableOpacity style={dynamicStyles.supportButton} onPress={handleContactSupport}>
            <Text style={dynamicStyles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}