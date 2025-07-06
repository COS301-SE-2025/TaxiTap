import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeSettings: React.FC = () => {
  const { theme, themeMode, setThemeMode } = useTheme();

  const themeOptions = [
    { mode: 'system' as const, label: 'System', icon: 'settings' as const },
    { mode: 'light' as const, label: 'Light', icon: 'light-mode' as const },
    { mode: 'dark' as const, label: 'dark-mode' as const, icon: 'dark-mode' as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Appearance
      </Text>
      
      {themeOptions.map((option) => (
        <TouchableOpacity
          key={option.mode}
          style={[
            styles.option,
            { 
              backgroundColor: themeMode === option.mode ? theme.primary + '20' : 'transparent',
              borderColor: theme.border,
            }
          ]}
          onPress={() => setThemeMode(option.mode)}
        >
          <View style={styles.optionContent}>
            <MaterialIcons 
              name={option.icon} 
              size={24} 
              color={themeMode === option.mode ? theme.primary : theme.textSecondary} 
            />
            <Text style={[
              styles.optionText,
              { 
                color: themeMode === option.mode ? theme.primary : theme.text,
                fontWeight: themeMode === option.mode ? '600' : '400',
              }
            ]}>
              {option.label}
            </Text>
          </View>
          
          {themeMode === option.mode && (
            <MaterialIcons 
              name="check" 
              size={20} 
              color={theme.primary} 
            />
          )}
        </TouchableOpacity>
      ))}
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        System mode will automatically switch between light and dark themes based on your device settings.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
});