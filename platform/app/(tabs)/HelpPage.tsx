import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, Linking } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function HelpScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  const handleContactSupport = () => {
    Alert.alert(t('help:support'), t('help:supportEmail'));
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
          <Text style={dynamicStyles.sectionTitle}>{t('help:userManual')}</Text>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>{t('help:howToNavigateApp')}</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://raw.githubusercontent.com/COS301-SE-2025/Taxi-Tap/main/docs/Taxi%20Tap%20User%20Manual.pdf')}>
            <Text style={dynamicStyles.answer}>
              {t('help:linkToManual')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={dynamicStyles.sectionTitle}>{t('help:frequentlyAskedQuestions')}</Text>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>{t('help:howToBookRide')}</Text>
          <Text style={dynamicStyles.answer}>
            {t('help:bookRideAnswer')}
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>{t('help:howToSwitchRoles')}</Text>
          <Text style={dynamicStyles.answer}>
            {t('help:switchRolesAnswer')}
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>{t('help:forgotPassword')}</Text>
          <Text style={dynamicStyles.answer}>
            {t('help:forgotPasswordAnswer')}
          </Text>
        </View>

        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.question}>{t('help:howToContactSupport')}</Text>
          <Text style={dynamicStyles.answer}>
            {t('help:contactSupportAnswer')}
          </Text>
          <TouchableOpacity style={dynamicStyles.supportButton} onPress={handleContactSupport}>
            <Text style={dynamicStyles.supportButtonText}>{t('help:contactSupport')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}