import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
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

export const unstable_settings = {
  initialRouteName: 'LandingPage',
};

SplashScreen.preventAutoHideAsync();

// Initialize Convex client with your deployment URL
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
          <NotificationProvider>
          <MapProvider>
            <RouteProvider>
              <RootLayoutNav />
            </RouteProvider>
          </MapProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { user } = useUser();
 
  // Create navigation theme based on our custom theme
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

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <NotificationProvider userId={user?.id as Id<"taxiTap_users">}>
          <InAppNotificationOverlay />
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
          </Stack>
        </NotificationProvider>
      </View>
    </NavigationThemeProvider>
  );
}