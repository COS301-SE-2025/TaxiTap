import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotFoundScreen() {
  const { currentLanguage } = useLanguage();

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    oops: {
      en: "Oops!",
      zu: "Hawu!",
      tn: "Ee!",
      af: "Oeps!"
    },
    screenDoesNotExist: {
      en: "This screen does not exist.",
      zu: "Lesi sikrini asikho.",
      tn: "Sekrini se ga se na.",
      af: "Hierdie skerm bestaan nie."
    },
    goToHomeScreen: {
      en: "Go to home screen!",
      zu: "Hamba esikrinini sasekhaya!",
      tn: "Tsamaya go sekrini sa gae!",
      af: "Gaan na tuisskerm!"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  return (
    <>
      <Stack.Screen options={{ title: getTranslation('oops') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{getTranslation('screenDoesNotExist')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{getTranslation('goToHomeScreen')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
