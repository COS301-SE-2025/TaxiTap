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
import { NotificationProvider } from '../contexts/NotificationContext';
import { AlertProvider } from '../contexts/AlertContext';
import { AlertOverlay } from '../components/AlertOverlay';
import { Id } from '../convex/_generated/dataModel';
import '../src/i18n/i18n';
import { LanguageProvider } from '../contexts/LanguageContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
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
        <LanguageProvider>
          <UserProvider>
            <MapProvider>
              <RouteProvider>
                <AlertProvider>
                  <NotificationProvider>
                    <RootLayoutNav />
                    <AlertOverlay />
                  </NotificationProvider>
                </AlertProvider>
              </RouteProvider>
            </MapProvider>
          </UserProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { user, loading } = useUser();
  
  // Configure Android Navigation Bar so it does not overlap content
  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        try {
          // @ts-ignore - module may not be installed in dev yet
          const NavigationBar = await import('expo-navigation-bar');
          await NavigationBar.setBehaviorAsync('inset-swipe');
          await NavigationBar.setPositionAsync('relative');
          await NavigationBar.setBackgroundColorAsync(theme.background);
          await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        } catch (e) {
          // ignore if not available
        }
      })();
    }
  }, [isDark, theme.background]);
  
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

  if (Platform.OS === 'ios' && loading) {
    return (
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <Stack>
            <Stack.Screen
              name="Loading"
              options={{ headerShown: false }}
            />
          </Stack>
        </View>
      </NavigationThemeProvider>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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
          <Stack.Screen
            name="LandingPage"
            options={{
              headerShown: false
            }}
          />
        
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          
          <Stack.Screen
            name="DriverProfile"
            options={{
              headerShown: true,
              title: "Driver Profile"
            }}
          />
          
          <Stack.Screen
            name="DriverRequestPage"
            options={{
              headerShown: true,
              title: "My Taxi & Route"
            }}
          />
          
          <Stack.Screen
            name="EarningsPage"
            options={{
              headerShown: true,
              title: "Earnings"
            }}
          />
          
          <Stack.Screen
            name="SetRoute"
            options={{
              headerShown: true,
              title: "Set Route"
            }}
          />
          
          <Stack.Screen
            name="DriverOffline"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="DriverOnline"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="Login"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="SignUp"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="DriverHomeScreen"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="DriverPassengerInfo"
            options={{
              headerShown: true,
              title: "Passenger Info"
            }}
          />
          
          <Stack.Screen
            name="VehicleDriver"
            options={{
              headerShown: true,
              title: "Vehicle Details"
            }}
          />
          
          <Stack.Screen
            name="NotificationsScreen"
            options={{
              headerShown: true,
              title: "Notifications" 
            }}
          />
          
          <Stack.Screen
            name="HelpPage"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="DriverPinEntry"
            options={{
              headerShown: false
            }}
          />
          
          <Stack.Screen
            name="PassengerPinEntry"
            options={{
              headerShown: false
            }}
          />
          
          {Platform.OS === 'android' && (
            <Stack.Screen
              name="index"
              options={{ headerShown: false }}
            />
          )}
        </Stack>
      </View>
    </NavigationThemeProvider>
  );
}