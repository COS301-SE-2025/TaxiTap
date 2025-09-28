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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import regular from '../assets/fonts/Amazon_Ember_Display.otf';
// import bold from '../assets/fonts/Amazon_Ember_Display_Bold_Italic.ttf';
// import medium from '../assets/fonts/Amazon_Ember_Display_Medium.ttf';
// import light from '../assets/fonts/Amazon_Ember_Display_Light.ttf';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { UserProvider, useUser } from '../contexts/UserContext';
import { MapProvider } from '../contexts/MapContext';
import { RouteProvider } from '../contexts/RouteContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { AlertProvider } from '../contexts/AlertContext';
import { AlertOverlay } from '../components/AlertOverlay';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Id } from '../convex/_generated/dataModel';
import '../src/i18n/i18n';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient('https://affable-goose-538.convex.cloud');

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'AmazonEmber-Regular': require('../assets/fonts/Amazon_Ember_Display.otf'),
    'AmazonEmber-Bold': require('../assets/fonts/Amazon_Ember_Display_Bold_Italic.ttf'),
    'AmazonEmber-Medium': require('../assets/fonts/Amazon_Ember_Display_Medium.ttf'),
    'AmazonEmber-Light': require('../assets/fonts/Amazon_Ember_Display_Light.ttf'),
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { user, loading } = useUser();
  const { currentLanguage } = useLanguage();

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    driverProfile: {
      en: "Driver Profile",
      zu: "Iphrofayili Yomshayeli",
      tn: "Profaele ya Mokgweetsi",
      af: "Bestuurder Profiel"
    },
    driverPersonalInformation: {
      en: "Driver Personal Information",
      zu: "Ulwazi Lwakho Lomshayeli",
      tn: "Tshedimosetso ya Mokgweetsi",
      af: "Bestuurder Persoonlike Inligting"
    },
    myTaxiAndRoute: {
      en: "My Taxi & Route",
      zu: "Itekisi Yami Nendlela",
      tn: "Tekisi ya Me le Leetong",
      af: "My Taxi & Roete"
    },
    earnings: {
      en: "Earnings",
      zu: "Imali Etholwayo",
      tn: "Ditlhwatlhwa",
      af: "Verdienste"
    },
    setRoute: {
      en: "Set Route",
      zu: "Setha Indlela",
      tn: "Beakanya Leetong",
      af: "Stel Roete"
    },
    passengerInfo: {
      en: "Passenger Info",
      zu: "Ulwazi Lomhambi",
      tn: "Tshedimosetso ya Moleledi",
      af: "Passasier Inligting"
    },
    vehicleDetails: {
      en: "Vehicle Details",
      zu: "Imininingwane Yemoto",
      tn: "Mabaka a Koloi",
      af: "Voertuigbesonderhede"
    },
    notifications: {
      en: "Notifications",
      zu: "Izaziso",
      tn: "Ditsebiso",
      af: "Kennisgewings"
    },
    helpPage: {
      en: "Help Page",
      zu: "Ikhasi Losizo",
      tn: "Tsebe ya Tshegetso",
      af: "Hulp Bladsy"
    },
    dashboard: {
      en: "Dashboard",
      zu: "I-Dashboard",
      tn: "Dashboard",
      af: "Dashboard"
    },
    activeRides: {
      en: "Active Rides",
      zu: "Ohambo Olusebenzayo",
      tn: "Ditlhwatlhwa tse di Tsamayang",
      af: "Aktiewe Ritte"
    },
    feedback: {
      en: "Feedback",
      zu: "Ukubuyisela Imibono",
      tn: "Mabaka",
      af: "Terugvoer"
    },
    unpaidRides: {
      en: "Unpaid Rides",
      zu: "Ohambo Olungakhokhiwe",
      tn: "Ditlhwatlhwa tse di sa Tshwerweng",
      af: "Onbetaalde Ritte"
    },
    waitingPayments: {
      en: "Waiting Payments",
      zu: "Izinkokhelo Ezilinde",
      tn: "Ditlhwatlhwa tse di Emeng",
      af: "Wagende Betalings"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };
  
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
    return <LoadingSpinner />;
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
              title: getTranslation('driverProfile'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />

          <Stack.Screen
            name="DriverEdit"
            options={{
              title: getTranslation('driverPersonalInformation'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />
          
          <Stack.Screen
            name="DriverRequestPage"
            options={{
              headerShown: true,
              title: getTranslation('myTaxiAndRoute'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />
          
          <Stack.Screen
            name="EarningsPage"
            options={{
              headerShown: true,
              title: getTranslation('earnings'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />
          
          <Stack.Screen
            name="SetRoute"
            options={{
              headerShown: true,
              title: getTranslation('setRoute'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
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
              title: getTranslation('passengerInfo')
            }}
          />
          
          <Stack.Screen
            name="VehicleDriver"
            options={{
              headerShown: true,
              title: getTranslation('vehicleDetails'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />
          
          <Stack.Screen
            name="NotificationsScreen"
            options={{
              headerShown: true,
              title: getTranslation('notifications') 
            }}
          />
          
          <Stack.Screen
            name="HelpPage"
            options={{
              headerShown: true,
              title: getTranslation('helpPage'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />

          <Stack.Screen
            name="StatsPage"
            options={{
              headerShown: true,
              title: getTranslation('dashboard'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />

          <Stack.Screen
            name="ActiveRides"
            options={{
              headerShown: true,
              title: getTranslation('activeRides'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />

          <Stack.Screen
            name="FeedbackHistoryScreen"
            options={{
              headerShown: true,
              title: getTranslation('feedback'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />

          <Stack.Screen
            name="UnpaidPayments"
            options={{
              headerShown: true,
              title: getTranslation('unpaidRides'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
            }}
          />

          <Stack.Screen
            name="WaitingPayments"
            options={{
              headerShown: true,
              title: getTranslation('waitingPayments'),
              headerStyle: {
                backgroundColor: theme.surface,
              },
              headerTintColor: theme.primary,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: "black",
              },
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