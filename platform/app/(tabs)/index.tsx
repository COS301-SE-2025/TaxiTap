// app/(tabs)/index.tsx - Redirect to LandingPage like HomeScreen/index.js does
import React from 'react';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function TabsIndex() {
  const router = useRouter();

  useEffect(() => {
    // Same redirect logic as HomeScreen/index.js
    router.replace('/LandingPage');
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});