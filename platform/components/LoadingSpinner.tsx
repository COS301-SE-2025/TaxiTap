// components/LoadingSpinner.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'large' }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size={size} color={theme.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});