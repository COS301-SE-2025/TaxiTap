import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

export default function ModalScreen() {
  const { currentLanguage } = useLanguage();

  // Hardcoded translations
  const translations = {
    en: {
      modal: "Modal"
    },
    tn: {
      modal: "Modal"
    },
    zu: {
      modal: "I-Modal"
    },
    af: {
      modal: "Modal"
    }
  };

  const t = (key: string) => {
    const lang = currentLanguage === 'tn' ? 'tn' : currentLanguage === 'zu' ? 'zu' : currentLanguage === 'af' ? 'af' : 'en';
    return translations[lang][key as keyof typeof translations[typeof lang]] || key;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('modal')}</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/modal.tsx" />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
