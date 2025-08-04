import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useRouteContext } from '../contexts/RouteContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@/contexts/UserContext';

interface DriverOfflineProps {
  onGoOnline: () => void;
  todaysEarnings: number;
}

interface MenuItemType {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface QuickActionType {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

interface SafetyOptionType {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

export default function DriverOffline({ 
  onGoOnline, 
  todaysEarnings, 
}: DriverOfflineProps) {
  const navigation = useNavigation();
  const { theme, isDark, setThemeMode } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { setCurrentRoute } = useRouteContext();
  const { setCurrentRoute } = useRouteContext();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [showMenu, setShowMenu] = useState(false);
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [showFullStatus, setShowFullStatus] = useState(true);

  const taxiInfo = useQuery(
      api.functions.taxis.getTaxiForDriver.getTaxiForDriver,
      user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );


  // Get driver's assigned route from database
  const assignedRoute = useQuery(
    api.functions.routes.queries.getDriverAssignedRoute,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  if (!user) return;
  
  const earnings = useQuery(api.functions.earnings.earnings.getWeeklyEarnings, { driverId: user.id as Id<"taxiTap_users">, });
  

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  useEffect(() => {
    // Redirect if accessed directly (not via DriverHomeScreen)
    if (typeof onGoOnline !== 'function') {
      router.replace('/DriverHomeScreen');
    }
  }, [onGoOnline, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFullStatus(false);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer); // Cleanup on unmount
  }, []);

  // Helper function to parse route name
  const parseRouteName = (routeName: string) => {
    const parts = routeName?.split(" to ").map(part => part.trim()) ?? ["Unknown", "Unknown"];
    return {
      start: parts[0] ?? "Unknown",
      destination: parts[1] ?? "Unknown"
    };
  };

  const handleSetRoute = () => {
    router.push('/SetRoute');
  };

  const handleMenuPress = () => {
    setShowMenu(!showMenu);
  };

  const handleSafetyPress = () => {
    setShowSafetyMenu(!showSafetyMenu);
  };

  const handleToggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const handleEmergency = () => {
    Alert.alert(
      "Emergency Alert",
      "This will contact emergency services (112)",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Get Help", style: "destructive", onPress: () => {
          Alert.alert("Emergency Alert Sent", "Emergency services contacted.");
          setShowSafetyMenu(false);
        }}
      ]
    );
  };

  const handleEarningsPress = () => {
    // Type-safe navigation
    router.push('/EarningsPage');
  };

  const menuItems: MenuItemType[] = [
    {
      icon: 'person-outline',
      title: 'My Profile',
      subtitle: 'Driver details & documents',
      onPress: () => router.push('/DriverProfile'),
    },
    {
      icon: 'car-outline',
      title: 'My Taxi & Route',
      subtitle: 'Vehicle info & route settings',
      onPress: () => router.push('/DriverRequestPage'),
    },
    {
      icon: 'time-outline',
      title: 'Trip History',
      subtitle: 'Past rides & routes',
      onPress: () => router.push('/EarningsPage'),
    },
    {
      icon: 'person-outline',
      title: 'Feedback',
      subtitle: 'Ratings & Feedback',
      onPress: () => router.push('/FeedbackHistoryScreen'),
    },
    {
      icon: 'settings-outline',
      title: 'Toggle Theme',
      subtitle: 'Switch between light and dark mode',
      onPress: handleToggleTheme,
    },
    { 
      icon: "settings-outline", 
      title: "Help", 
      subtitle: "App information",
      onPress: () => navigation.navigate('HelpPage' as never)
    },
  ];

  // Get route display string from database
  const getRouteDisplayString = () => {
    if (!assignedRoute) return "Not Set";
    const { start, destination } = parseRouteName(assignedRoute.name);
    return `${start} → ${destination}`;
  };

  const quickActions: QuickActionType[] = [
    {
      icon: "location-outline",
      title: "Current Route",
      value: getRouteDisplayString(),
      subtitle: "Tap to set route",
      color: getRouteDisplayString() === "Not Set" ? "#FF9900" : "#00A591",
      onPress: () => router.push('/SetRoute'),
    },
    {
      icon: "car-outline",
      title: "Available Seats",
      value: taxiInfo?.capacity === 0
        ? "No seats available"
        : taxiInfo?.capacity?.toString() ?? "Loading...",
      subtitle: taxiInfo?.capacity === 0
        ? ""
        : `of 14 seats free`,
      color: "#FF9900",
      onPress: () => console.log('Seats pressed')
    }
  ];

  const safetyOptions: SafetyOptionType[] = [
    {
      icon: "call",
      title: "Emergency Call",
      subtitle: "Call 112 immediately",
      color: "#FF4444",
      onPress: handleEmergency
    },
  ];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      zIndex: 999,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.surface,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDark ? theme.primary : "#f5f5f5",
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 3,
    },
    menuModal: {
      marginTop: 80,
      marginLeft: 20,
      marginRight: 20,
      backgroundColor: theme.surface,
      borderRadius: 20,
      paddingVertical: 8,
      minWidth: 280,
      maxWidth: '90%',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 12,
    },
    menuModalHeader: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : "#D4A57D",
    },
    menuModalHeaderText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    menuModalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 60,
    },
    menuModalItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? theme.primary : "#ECD9C3",
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    menuModalItemContent: {
      flex: 1,
    },
    menuModalItemTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 2,
    },
    menuModalItemSubtitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.surface : "#ECD9C3",
      borderColor: isDark ? theme.border : "#D4A57D",
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 12,
      marginLeft: 10,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#FF4444',
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? theme.text : "#C62828",
      marginLeft: 6,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    earningsAmount: {
      color: theme.primary,
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 4,
    },
    earningsTitle: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 8,
    },
    earningsSubtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: "bold",
      textAlign: 'center',
    },
    offlineSection: {
      backgroundColor: theme.surface,
      borderRadius: 30,
      padding: 24,
      marginBottom: 20,
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
    },
    offlineIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? theme.primary : "#ECD9C3",
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    offlineTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    offlineSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: "bold",
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    goOnlineButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? "#121212" : "#FFFFFF",
      marginLeft: 8,
    },
    quickActionsSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    quickActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    quickActionCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 16,
      marginHorizontal: 4,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 4,
      minHeight: 100,
    },
    quickActionIcon: {
      marginBottom: 8,
    },
    quickActionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
      marginBottom: 4,
    },
    quickActionValue: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    quickActionSubtitle: {
      fontSize: 10,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    actionButton: {
      flexDirection: 'row',
      backgroundColor: '#007AFF',
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginBottom: 10,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      width: 150,
      height: 50,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    safetyModal: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 8,
      minWidth: 200,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 8,
    },
    safetyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 50,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : "#D4A57D",
    },
    safetyItemLast: {
      borderBottomWidth: 0,
    },
    safetyItemIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    safetyItemContent: {
      flex: 1,
    },
    safetyItemTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 2,
    },
    safetyItemSubtitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.surface} 
      />
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerLeft}>
            <TouchableOpacity 
              style={dynamicStyles.menuButton}
              onPress={handleMenuPress}
              accessibilityLabel="Open menu"
            >
              <Icon name="menu" size={24} color={isDark ? "#121212" : "#FF9900"} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>My Dashboard</Text>
          </View>
          
          <View style={dynamicStyles.headerRight}>
            <View style={dynamicStyles.statusContainer}>
              <View style={dynamicStyles.statusDot} />
              {showFullStatus && (
                <Text style={dynamicStyles.statusText}>OFFLINE</Text>
              )}
            </View>
            
            <TouchableOpacity
              onPress={handleToggleTheme}
              activeOpacity={0.8}
              accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              <Icon 
                name={isDark ? 'sunny' : 'moon'} 
                size={28}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={dynamicStyles.contentContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Earnings card */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.surface,
              borderRadius: 30,
              padding: 24,
              marginBottom: 20,
              alignItems: 'center',
              width: '100%',
              justifyContent: 'center',
              elevation: 4,        
            }}
            onPress={() => router.push('/EarningsPage')}
          >
            <Text style={dynamicStyles.earningsAmount}>
              R{(earnings?.[0]?.todayEarnings ?? 0).toFixed(2)}
            </Text>
            <Text style={dynamicStyles.earningsTitle}>Today's Earnings</Text>
            <Text style={dynamicStyles.earningsSubtitle}>
              Tap to view detailed breakdown
            </Text>
          </TouchableOpacity>

          <View style={dynamicStyles.offlineSection}>
            <View style={dynamicStyles.offlineIconContainer}>
              <Icon name="car-outline" size={40} color={isDark ? "#121212" : "#FF9900"} />
            </View>
            <Text style={dynamicStyles.offlineTitle}>Ready to Pick Up Passengers?</Text>
            <Text style={dynamicStyles.offlineSubtitle}>
              Go online to start accepting seat reservation requests
            </Text>
            <TouchableOpacity
              style={[dynamicStyles.actionButton, { backgroundColor: '#FF4444' }]}
              onPress={handleSafetyPress}
            >
              <Icon name="call" size={20} color="#fff" />
              <Text style={dynamicStyles.actionButtonText}>Emergency</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: '100%',
                height: 56,
                borderRadius: 30,
                backgroundColor: isDark ? '#10B981' : '#00A591',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                elevation: 4,
              }}
              onPress={onGoOnline}
              activeOpacity={0.8}
              accessibilityLabel="Go online to accept passengers"
            >
              <Text style={dynamicStyles.goOnlineButtonText}>GO ONLINE</Text>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.quickActionsSection}>
            <Text style={dynamicStyles.sectionTitle}>Quick Overview</Text>
            
            <View style={dynamicStyles.quickActionsRow}>
              {quickActions.map((action, index) => (
                <TouchableOpacity 
                  key={index}
                  style={dynamicStyles.quickActionCard}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                  accessibilityLabel={`${action.title}: ${action.value}`}
                >
                  <Icon 
                    name={action.icon} 
                    size={24} 
                    color={action.color} 
                    style={dynamicStyles.quickActionIcon} 
                  />
                  <Text style={dynamicStyles.quickActionTitle}>{action.title}</Text>
                  <Text style={[dynamicStyles.quickActionValue, { color: action.color }]}>
                    {action.value}
                  </Text>
                  <Text style={dynamicStyles.quickActionSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={showMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity 
            style={dynamicStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            <View style={dynamicStyles.menuModal}>
              <View style={dynamicStyles.menuModalHeader}>
                <Text style={dynamicStyles.menuModalHeaderText}>Menu</Text>
              </View>
              {menuItems.map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={dynamicStyles.menuModalItem}
                  onPress={() => {
                    item.onPress();
                    setShowMenu(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={dynamicStyles.menuModalItemIcon}>
                    <Icon name={item.icon} size={20} color={isDark ? "#121212" : "#FF9900"} />
                  </View>
                  <View style={dynamicStyles.menuModalItemContent}>
                    <Text style={dynamicStyles.menuModalItemTitle}>{item.title}</Text>
                    <Text style={dynamicStyles.menuModalItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {showSafetyMenu && (
          <TouchableOpacity 
            style={dynamicStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSafetyMenu(false)}
          >
            <View style={dynamicStyles.safetyModal}>
              {safetyOptions.map((option, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[
                    dynamicStyles.safetyItem,
                    index === safetyOptions.length - 1 && dynamicStyles.safetyItemLast
                  ]}
                  onPress={option.onPress}
                  activeOpacity={0.8}
                >
                  <View style={[dynamicStyles.safetyItemIcon, { backgroundColor: `${option.color}20` }]}>
                    <Icon name={option.icon} size={16} color={option.color} />
                  </View>
                  <View style={dynamicStyles.safetyItemContent}>
                    <Text style={dynamicStyles.safetyItemTitle}>{option.title}</Text>
                    <Text style={dynamicStyles.safetyItemSubtitle}>{option.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}