import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { View, Platform } from 'react-native';
import React from 'react';
import regular from '../assets/fonts/Amazon_Ember_Display.otf';
import bold from '../assets/fonts/Amazon_Ember_Display_Bold_Italic.ttf';
import medium from '../assets/fonts/Amazon_Ember_Display_Medium.ttf';
import light from '../assets/fonts/Amazon_Ember_Display_Light.ttf';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { UserProvider, useUser } from '../contexts/UserContext';
import { MapProvider } from '../contexts/MapContext';
import { RouteProvider } from '../contexts/RouteContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { InAppNotificationOverlay } from '../components/InAppNotificationOverlay';
import { Id } from '../convex/_generated/dataModel';

export { ErrorBoundary } from 'expo-router';

// Use same initial route for both platforms
export const unstable_settings = {
  initialRouteName: 'LandingPage',
};

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient('https://affable-goose-538.convex.cloud');

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'AmazonEmber-Regular': regular,
    'AmazonEmber-Bold': bold,
    'AmazonEmber-Medium': medium,
    'AmazonEmber-Light': light,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <UserProvider>
          <MapProvider>
            <RouteProvider>
              <RootLayoutNav />
            </RouteProvider>
          </MapProvider>
        </UserProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { user, loading } = useUser();
 
  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
    fonts: DefaultTheme.fonts,
  };

  // iOS: Wait for loading to complete before rendering navigation
  if (Platform.OS === 'ios' && loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* iOS loading state */}
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Only add NotificationProvider when safe */}
        <NotificationProvider userId={user?.id as Id<"taxiTap_users"> | undefined}>
          <InAppNotificationOverlay />
          <StackNavigator />
        </NotificationProvider>
      </View>
    </NavigationThemeProvider>
  );
}

function StackNavigator() {
  const { theme } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.headerBackground,
        },
        headerTitleStyle: {
          fontFamily: 'AmazonEmber-Medium',
          fontSize: 18,
          color: theme.text,
        },
        headerTitleAlign: 'center',
        headerTintColor: theme.text,
      }}
    >
      {/* Always register LandingPage first for iOS */}
      <Stack.Screen
        name="LandingPage"
        options={{ headerShown: false }}
      />
      
      {/* Register other auth screens */}
      <Stack.Screen
        name="Login"
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="SignUp"
        options={{ headerShown: false }}
      />

      {/* iOS: Only register tabs after auth screens */}
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
      />
      
      {/* Android: Keep index for compatibility */}
      {Platform.OS === 'android' && (
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
      )}
      
      {/* Other screens */}
      <Stack.Screen
        name="DriverHomeScreen"
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="NotificationsScreen"
        options={{
          headerShown: true,
          title: "Notifications" 
        }}
      />
              
              <Stack.Screen
                name="DriverPinEntry"
                options={{
                  headerShown: false
                }}
              />
    </Stack>
  );
}