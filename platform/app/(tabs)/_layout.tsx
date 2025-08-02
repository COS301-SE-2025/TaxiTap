import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Image, View, Alert } from 'react-native';
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

// Notification Button Component
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

// Theme Toggle Button Component
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

// Header Right Component with both buttons
const HeaderRightButtons: React.FC = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <NotificationButton />
      <ThemeToggleButton />
    </View>
  );
};

// Tab Navigation Component
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
            source={isDark ? dark : light}
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
          title: 'View Routes',
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
        name="Payments"
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
  const [processedNotifications, setProcessedNotifications] = useState<Set<string>>(new Set());
  const [shownNotificationTypes, setShownNotificationTypes] = useState<Set<string>>(new Set());
  
  let currentLocation, destination;
  try {
    ({ currentLocation, destination } = useMapContext());
  } catch (e) {
    currentLocation = undefined;
    destination = undefined;
  }

  // Only reset on ride_accepted (start of backend notification flow)
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    const unprocessedRideAccepted = notifications.find(n => 
      n.type === 'ride_accepted' && 
      !n.isRead && 
      !processedNotifications.has(n._id)
    );
    
    if (unprocessedRideAccepted) {
      console.log('New ride detected, resetting notification types for ride:', unprocessedRideAccepted._id);
      setShownNotificationTypes(new Set());
    }
  }, [notifications, processedNotifications]);

  // CONSOLIDATED NOTIFICATION HANDLER
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    // DEBUG: Log all notifications
    console.log('=== NOTIFICATION DEBUG ===');
    console.log('All notifications:', notifications.map(n => ({
      id: n._id,
      type: n.type,
      isRead: n.isRead,
      message: n.message?.substring(0, 50)
    })));
    console.log('Processed notifications:', Array.from(processedNotifications));
    console.log('Shown notification types:', Array.from(shownNotificationTypes));

    notifications.forEach(notification => {
      console.log(`Checking notification ${notification._id} (${notification.type})`);
      
      if (notification.isRead) {
        console.log(`- Skipping: already read`);
        return;
      }
      
      if (processedNotifications.has(notification._id)) {
        console.log(`- Skipping: already processed`);
        return;
      }

      if (shownNotificationTypes.has(notification.type)) {
        console.log(`- Skipping: type ${notification.type} already shown`);
        markAsRead(notification._id);
        return;
      }

      console.log(`- Processing notification: ${notification.type}`);
      
      setProcessedNotifications(prev => new Set(prev).add(notification._id));
      setShownNotificationTypes(prev => new Set(prev).add(notification.type));

      switch (notification.type) {
        case 'ride_accepted':
          Alert.alert(
            'Ride Accepted',
            notification.message || 'Your ride has been accepted by the driver!',
            [
              {
                text: 'OK',
                onPress: () => {
                  markAsRead(notification._id);
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
                style: 'default'
              }
            ],
            { cancelable: false }
          );
          break;

        case 'ride_declined':
          Alert.alert(
            'Ride Declined',
            notification.message || 'Your ride request was declined.',
            [
              {
                text: 'OK',
                onPress: () => {
                  markAsRead(notification._id);
                  setShownNotificationTypes(new Set());
                  router.push('./HomeScreen');
                },
                style: 'default',
              },
            ],
            { cancelable: false }
          );
          break;

        case 'ride_cancelled':
          Alert.alert(
            'Ride Cancelled',
            notification.message || 'Your ride has been cancelled.',
            [
              {
                text: 'OK',
                onPress: () => {
                  markAsRead(notification._id);
                  setShownNotificationTypes(new Set());
                  router.push('./HomeScreen');
                },
                style: 'default'
              }
            ],
            { cancelable: false }
          );
          break;

        case 'ride_started':
          Alert.alert(
            'Ride Started',
            notification.message || 'Your ride has started!',
            [
              {
                text: 'OK',
                onPress: () => markAsRead(notification._id),
                style: 'default',
              },
            ],
            { cancelable: false }
          );
          break;

        case 'ride_completed':
          Alert.alert(
            'Ride Completed',
            notification.message || 'Your ride has been completed!',
            [
              {
                text: 'OK',
                onPress: () => {
                  markAsRead(notification._id);
                  setShownNotificationTypes(new Set());
                  router.push('./HomeScreen');
                },
                style: 'default',
              },
            ],
            { cancelable: false }
          );
          break;

        case 'driver_10min_away':
          Alert.alert(
            'Driver Update',
            'Driver is 10 minutes away!',
            [
              {
                text: 'OK',
                onPress: () => markAsRead(notification._id)
              }
            ]
          );
          break;

        case 'driver_5min_away':
          Alert.alert(
            'Driver Update',
            'Driver is 5 minutes away!',
            [
              {
                text: 'OK',
                onPress: () => markAsRead(notification._id)
              }
            ]
          );
          break;

        case 'driver_arrived':
          Alert.alert(
            'Driver Update',
            'Driver has arrived at your location!',
            [
              {
                text: 'OK',
                onPress: () => markAsRead(notification._id)
              }
            ]
          );
          break;

        default:
          console.log('Unhandled notification type:', notification.type);
          markAsRead(notification._id);
          break;
      }
    });
  }, [notifications, markAsRead, currentLocation, destination, processedNotifications, shownNotificationTypes]);

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