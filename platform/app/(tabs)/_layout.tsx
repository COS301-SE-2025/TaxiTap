import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Image, View, Platform, Dimensions } from 'react-native';
import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { router } from 'expo-router';
import dark from '../../assets/images/icon-dark.png';
import light from '../../assets/images/icon.png';
import { useNotifications } from '../../contexts/NotificationContext';
import { useMapContext } from '../../contexts/MapContext';
import { useTranslation } from 'react-i18next';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NotificationButton: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;

  const handleNotificationPress = () => {
    router.push('../NotificationsScreen');
  };

  return (
    <TouchableOpacity
      style={{
        width: isSmallScreen ? 36 : 40,
        height: isSmallScreen ? 36 : 40,
        borderRadius: isSmallScreen ? 18 : 20,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
        marginRight: isSmallScreen ? 8 : 12,
        justifyContent: 'center',
        alignItems: 'center',
        // iOS-style shadows
        shadowColor: theme.shadow,
        shadowOpacity: isDark ? 0.2 : 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
      }}
      onPress={handleNotificationPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="notifications-outline" 
        size={isSmallScreen ? 20 : 22} 
        color={theme.text} 
      />
    </TouchableOpacity>
  );
};

const ThemeToggleButton: React.FC = () => {
  const { isDark, setThemeMode, theme } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  return (
    <TouchableOpacity
      style={{
        width: isSmallScreen ? 36 : 40,
        height: isSmallScreen ? 36 : 40,
        borderRadius: isSmallScreen ? 18 : 20,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
        marginRight: isSmallScreen ? 8 : 12,
        justifyContent: 'center',
        alignItems: 'center',
        // iOS-style shadows
        shadowColor: theme.shadow,
        shadowOpacity: isDark ? 0.2 : 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
      }}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={isDark ? 'light-mode' : 'dark-mode'}
        size={isSmallScreen ? 20 : 22}
        color={theme.text}
      />
    </TouchableOpacity>
  );
};

const HeaderRightButtons: React.FC = () => {
  const { width: screenWidth } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center',
      paddingRight: isSmallScreen ? 12 : 16,
      gap: isSmallScreen ? 6 : 8,
    }}>
      <NotificationButton />
      <ThemeToggleButton />
    </View>
  );
};

const TabNavigation: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? (isSmallScreen ? 78 : 84) : (isSmallScreen ? 68 : 72),
          paddingBottom: Platform.OS === 'ios' ? (insets.bottom > 0 ? 8 : 12) : 10,
          paddingTop: 8,
          backgroundColor: theme.tabBarBackground,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          borderTopWidth: 1,
          // iOS-style shadows
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'AmazonEmber-Medium',
          fontSize: isSmallScreen ? 11 : 12,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 2 : 4,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        headerTitle: () => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 6,
            paddingHorizontal: 20,
            flex: 1,
          }}>
            <Image
              source={isDark ? dark : light}
              style={{ 
                width: isSmallScreen ? 110 : 130,
                height: isSmallScreen ? 110 : 130,
                resizeMode: 'contain',
              }}
            />
          </View>
        ),
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: theme.headerBackground,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 4,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          borderBottomWidth: 1,
          height: Platform.OS === 'ios' ? 
            (screenHeight > 800 ? 110 : 100) : 
            (isSmallScreen ? 85 : 95),
        },
        headerTintColor: theme.text,
        headerRight: () => <HeaderRightButtons />,
        headerLeftContainerStyle: {
          paddingLeft: isSmallScreen ? 12 : 16,
        },
        headerRightContainerStyle: {
          paddingRight: 0, // HeaderRightButtons handles its own padding
        },
      }}
    >
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: t('navigation:home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: isSmallScreen ? 28 : 32,
              height: isSmallScreen ? 28 : 32,
            }}>
              <FontAwesome 
                name="home" 
                size={isSmallScreen ? 20 : 22} 
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="PassengerRoute"
        options={{
          title: t('navigation:routes'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: isSmallScreen ? 28 : 32,
              height: isSmallScreen ? 28 : 32,
            }}>
              <MaterialIcons 
                name="map" 
                size={isSmallScreen ? 20 : 22} 
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="PassengerProfile"
        options={{
          title: t('navigation:profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: isSmallScreen ? 28 : 32,
              height: isSmallScreen ? 28 : 32,
            }}>
              <FontAwesome 
                name="user" 
                size={isSmallScreen ? 20 : 22} 
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="HelpPage"
        options={{
          title: t('navigation:help'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: isSmallScreen ? 28 : 32,
              height: isSmallScreen ? 28 : 32,
            }}>
              <FontAwesome 
                name="question-circle" 
                size={isSmallScreen ? 20 : 22} 
                color={color}
                style={{
                  opacity: focused ? 1 : 0.8,
                }}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="Payments"
        options={{
          href: null,
        }}
      />


      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="SeatReserved"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="SubmitFeedback"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="TaxiInfoPage"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="TaxiInformation"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="PassengerReservation"
        options={{
          href: null,
        }}
      />



      <Tabs.Screen
        name="PaymentsConfirm"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default function TabLayout() {
  const { notifications, markAsRead } = useNotifications();
  const { t } = useTranslation();
  const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();

  // Safely get map context
  let currentLocation: any = undefined;
  let destination: any = undefined;

  try {
    const mapContext = useMapContext();
    currentLocation = mapContext.currentLocation;
    destination = mapContext.destination;
  } catch (e) {
    console.warn('MapContext not available in TabLayout');
  }

  const processedNotificationsRef = useRef(new Set<string>());
  
  // Ride declined notification handler
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const rideDeclined = notifications.find(
      n => n.type === 'ride_declined' &&
        !n.isRead &&
        !processedNotificationsRef.current.has(n._id)
    );

    if (rideDeclined) {
      processedNotificationsRef.current.add(rideDeclined._id); // Mark as processed

      showGlobalError(
        t('notifications:rideDeclined'),
        rideDeclined.message || t('notifications:rideDeclinedMessage'),
        {
          duration: 0,
          actions: [
            {
              label: t('notifications:ok'),
              onPress: () => {
                markAsRead(rideDeclined._id);
                router.push('./HomeScreen');
              },
              style: 'default',
            },
          ],
          position: 'top',
          animation: 'slide-down',
        }
      );
    }
  }, [notifications, markAsRead, showGlobalError]);

  // Ride accepted notification handler
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const rideAccepted = notifications.find(
      n => n.type === 'ride_accepted' &&
        !n.isRead &&
        !processedNotificationsRef.current.has(n._id)
    );

    
    if (rideAccepted) {

      processedNotificationsRef.current.add(rideAccepted._id);// Mark as processed

      showGlobalSuccess(
        t('notifications:rideAccepted'),
        rideAccepted.message,
        {
          duration: 0,
          actions: [
            {
              label: t('notifications:ok'),
              onPress: () => {
                markAsRead(rideAccepted._id);
                router.push({
                  pathname: './PassengerReservation',
                  params: currentLocation && destination ? {
                    currentLat: currentLocation.latitude.toString(),
                    currentLng: currentLocation.longitude.toString(),
                    currentName: currentLocation.name,
                    destinationLat: destination.latitude.toString(),
                    destinationLng: destination.longitude.toString(),
                    destinationName: destination.name,
                  } : undefined
                });
              },
              style: 'default',
            },
          ],
          position: 'top',
          animation: 'slide-down',
        }
      );
    }
  }, [notifications, markAsRead, currentLocation, destination, showGlobalSuccess]);

  // Ride cancelled notification handler
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const rideCancelled = notifications.find(
      n => n.type === 'ride_cancelled' &&
        !n.isRead &&
        !processedNotificationsRef.current.has(n._id)
    );

    if (rideCancelled) {

      processedNotificationsRef.current.add(rideCancelled._id);// Mark as processed

      showGlobalAlert({
        title: t('notifications:rideCancelled'),
        message: rideCancelled.message,
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: t('notifications:ok'),
            onPress: () => markAsRead(rideCancelled._id),
            style: 'default',
          },
        ],
        position: 'top',
        animation: 'slide-down',
      });
    }
  }, [notifications, markAsRead, showGlobalAlert]);

  return (
    <TabNavigation />
  );
}