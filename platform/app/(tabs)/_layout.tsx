import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { UserProvider } from '../../contexts/UserContext';
import { router } from 'expo-router';
import dark from '../../assets/images/icon-dark.png';
import light from '../../assets/images/icon.png';
import { useNotifications } from '../../contexts/NotificationContext';
import { useMapContext } from '../../contexts/MapContext';
import { MapProvider } from '../../contexts/MapContext';
import { FeedbackProvider } from '../../contexts/FeedbackContext';
import { useAlertHelpers } from '../../components/AlertHelpers';

const NotificationButton: React.FC = () => {
  const { theme, isDark } = useTheme();

  const handleNotificationPress = () => {
    router.push('../NotificationsScreen');
  };

  return (
    <TouchableOpacity
      style={{
        padding: 8,
        borderRadius: 20,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPress={handleNotificationPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="notifications-outline" 
        size={24} 
        color={theme.text} 
      />
    </TouchableOpacity>
  );
};

const ThemeToggleButton: React.FC = () => {
  const { isDark, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  return (
    <TouchableOpacity
      style={{
        padding: 8,
        marginRight: 12,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={isDark ? 'light-mode' : 'dark-mode'}
        size={24}
        color={isDark ? '#FFFFFF' : '#232F3E'}
      />
    </TouchableOpacity>
  );
};

const HeaderRightButtons: React.FC = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <NotificationButton />
      <ThemeToggleButton />
    </View>
  );
};

const TabNavigation: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: 'AmazonEmber-Medium',
          fontSize: 12,
          marginBottom: 4,
        },
        headerTitle: () => (
          <Image
            source={isDark 
              ? dark
              : light
            }
            style={{ 
              width: 150,
              height: 150,
              resizeMode: 'contain',
            }}
          />
        ),
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: theme.headerBackground,
          shadowOpacity: isDark ? 0.3 : 0.1,
          elevation: 2,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.text,
        headerRight: () => <HeaderRightButtons />,
      }}
    >
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="PassengerRoute"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="map" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="FeedbackHistoryScreen"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="feedback" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="PassengerProfile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="HelpPage"
        options={{
          title: 'Help',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="question-circle" size={24} color={color} />
          ),
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
        name="AddHomeAddress"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="AddWorkAddress"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="PersonalInfoEdit"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default function TabLayout() {
  const { notifications, markAsRead } = useNotifications();
  const { showGlobalError, showGlobalSuccess, showGlobalAlert } = useAlertHelpers();
  let currentLocation, destination;
  
  try {
    ({ currentLocation, destination } = useMapContext());
  } catch (e) {
    currentLocation = undefined;
    destination = undefined;
  }

  const processedNotificationsRef = useRef(new Set<string>());
  
  // Ride declined notification handler
  useEffect(() => {

   const rideDeclined = notifications.find(
			n => n.type === 'ride_declined' && 
				!n.isRead && 
				!processedNotificationsRef.current.has(n._id) // Add this check
        );

    if (rideDeclined) {

      processedNotificationsRef.current.add(rideDeclined._id);// Mark as processed

      showGlobalError(
        'Ride Declined',
        rideDeclined.message || 'Your ride request was declined.',
        {
          duration: 0,
          actions: [
            {
              label: 'OK',
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

   const rideAccepted = notifications.find(
			n => n.type === 'ride_accepted' && 
				!n.isRead && 
				!processedNotificationsRef.current.has(n._id) // Add this check
		);

    
    if (rideAccepted) {

      processedNotificationsRef.current.add(rideAccepted._id);// Mark as processed

      showGlobalSuccess(
        'Ride Accepted',
        rideAccepted.message,
        {
          duration: 0,
          actions: [
            {
              label: 'OK',
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

   const rideCancelled = notifications.find(
			n => n.type === 'ride_cancelled' && 
				!n.isRead && 
				!processedNotificationsRef.current.has(n._id) // Add this check
		);

    if (rideCancelled) {

      processedNotificationsRef.current.add(rideCancelled._id);// Mark as processed

      showGlobalAlert({
        title: 'Ride Cancelled',
        message: rideCancelled.message,
        type: 'warning',
        duration: 0,
        actions: [
          {
            label: 'OK',
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
    <SafeAreaProvider>
      <UserProvider>
        <MapProvider>
          <FeedbackProvider>
            <TabNavigation />
          </FeedbackProvider>
        </MapProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}