import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  tabBarActive: string;
  tabBarInactive: string;
  tabBarBackground: string;
  headerBackground: string;
  card: string;
  shadow: string;
  buttonText: string;
}

export const lightTheme: ThemeColors = {
  primary: '#FF9900',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#232F3E',
  textSecondary: '#131A22',
  border: '#E5E7EB',
  tabBarActive: '#FF9900',
  tabBarInactive: '#6B7280',
  tabBarBackground: '#FFFFFF',
  headerBackground: '#FFFFFF',
  card: '#FFFFFF',
  shadow: '#000000',
  buttonText: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  primary: '#FF9900', 
  background: '#131A22',
  surface: '#232F3E',
  text: '#FFFFFF',
  textSecondary: '#F5F5F5',
  border: '#37475A',
  tabBarActive: '#FF9900',
  tabBarInactive: '#F5F5F5',
  tabBarBackground: '#232F3E',
  headerBackground: '#232F3E',
  card: '#232F3E',
  shadow: '#FFFFFF',
  buttonText: '#FFFFFF',
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  // Load saved theme preference on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('themeMode') as ThemeMode;
        if (savedMode) {
          setThemeModeState(savedMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Update theme when mode or system preference changes
  useEffect(() => {
    let newIsDark: boolean;
    
    switch (themeMode) {
      case 'light':
        newIsDark = false;
        break;
      case 'dark':
        newIsDark = true;
        break;
      case 'system':
      default:
        newIsDark = systemColorScheme === 'dark';
        break;
    }
    
    setIsDark(newIsDark);
    
    // Update system UI (status bar, navigation bar)
    SystemUI.setBackgroundColorAsync(newIsDark ? darkTheme.background : lightTheme.background);
  }, [themeMode, systemColorScheme]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};