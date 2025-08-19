import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useRouteContext } from '../contexts/RouteContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@/contexts/UserContext';
import { useAlertHelpers } from '../components/AlertHelpers';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  const { t } = useLanguage();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [showMenu, setShowMenu] = useState(false);
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [showFullStatus, setShowFullStatus] = useState(true);
  const { showGlobalSuccess, showModal } = useAlertHelpers();

  const taxiInfo = useQuery(
      api.functions.taxis.getTaxiForDriver.getTaxiForDriver,
      user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  // Get driver's assigned route from database
  const assignedRoute = useQuery(
    api.functions.routes.queries.getDriverAssignedRoute,
    user?.id ? { userId: user.id as Id<"taxiTap_users"> } : "skip"
  );

  const earnings = useQuery(
    api.functions.earnings.earnings.getWeeklyEarnings,
    user?.id ? { driverId: user.id as Id<"taxiTap_users"> } : "skip"
  );

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
    }, 5000);
    return () => clearTimeout(timer);
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
    showModal(
      "Emergency Alert",
      "This will contact emergency services (112)",
      [
        {
          label: "Yes, Get Help",
          onPress: () => {
            showGlobalSuccess("Emergency Alert Sent", "Emergency services contacted.", {
              duration: 3000,
              position: 'top',
              animation: 'slide-down',
            });
            setShowSafetyMenu(false);
          },
          style: "destructive"
        },
        {
          label: "Cancel",
          onPress: () => setShowSafetyMenu(false),
          style: "cancel"
        }
      ]
    );
  };

   const menuItems = [
    { icon: "person", title: "Profile", onPress: () => router.push('/DriverProfile') },
    { icon: "time", title: "Earnings", onPress: () => router.push('/EarningsPage') },
    { icon: "star", title: "Feedback", onPress: () => router.push('/FeedbackHistoryScreen') },
    { icon: "help-circle", title: "Help", onPress: () => navigation.navigate('HelpPage' as never) },
  ];

  // Get route display string from database
  const getRouteDisplayString = () => {
    if (!assignedRoute) return t('driver:notSet');
    const { start, destination } = parseRouteName(assignedRoute.name);
    return `${start} → ${destination}`;
  };

  const quickActions: QuickActionType[] = [
    {
      icon: "location-outline",
      title: t('driver:assignedRoute'),
      value: getRouteDisplayString(),
      subtitle: getRouteDisplayString() === t('driver:notSet') 
        ? t('driver:noRouteAssigned') 
        : t('driver:currentRoute'),
      color: "#F59E0B",
      onPress: () => router.push('/SetRoute'),
    },
    {
      icon: "people-outline",
      title: t('common:availableSeats'),
      value: taxiInfo?.capacity === 0
        ? t('common:noSeatsAvailable')
        : `${taxiInfo?.capacity ?? 0} ${t('common:seats')}`,
      subtitle: taxiInfo?.capacity === 0
        ? t('driver:taxiFull')
        : t('driver:seatsAvailable'),
      color: taxiInfo?.capacity === 0 ? "#EF4444" : "#F59E0B",
      onPress: () => console.log('Seats pressed')
    }
  ];

  const safetyOptions: SafetyOptionType[] = [
    {
      icon: "call",
      title: t('driver:emergencyCall'),
      subtitle: t('driver:call112Immediately'),
      color: "#EF4444",
      onPress: handleEmergency
    },
  ];

  // Show loading spinner if essential data is not loaded
  if (!user || taxiInfo === undefined || earnings === undefined) {
    return <LoadingSpinner />;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
    },
    // Enhanced Header with glossy finish
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(0, 0, 0, 0.08)',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.5)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuButton: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.8)' 
        : 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.5,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark 
        ? 'rgba(239, 68, 68, 0.2)' 
        : 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#EF4444',
      marginLeft: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    themeButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.8)' 
        : 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 24,
    },
    // Enhanced Earnings card with glossy design
    earningsCard: {
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.8)' 
        : 'rgba(255, 255, 255, 0.9)',
      borderRadius: 20,
      padding: 24,
      marginTop: 24,
      marginBottom: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    earningsAmount: {
      color: '#F59E0B',
      fontSize: 36,
      fontWeight: "800",
      marginBottom: 8,
      textShadowColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    earningsTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    earningsSubtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: "500",
      opacity: 0.8,
      letterSpacing: -0.2,
    },
    // Enhanced Main offline section with glossy design
    offlineSection: {
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.8)' 
        : 'rgba(255, 255, 255, 0.9)',
      borderRadius: 24,
      padding: 32,
      marginBottom: 28,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    offlineIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: isDark 
        ? 'rgba(255, 255, 255, 0.2)' 
        : 'rgba(0, 0, 0, 0.1)',
    },
    offlineTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    offlineSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: "500",
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 28,
      opacity: 0.9,
      letterSpacing: -0.2,
    },
    buttonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 16,
      marginBottom: 20,
    },
    emergencyButton: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      borderColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    emergencyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#DC2626',
      marginLeft: 8,
      letterSpacing: 0.5,
    },
    goOnlineButton: {
      width: '100%',
      height: 60,
      borderRadius: 18,
      backgroundColor: '#F59E0B',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    goOnlineButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    // Enhanced Quick actions section
    quickActionsSection: {
      marginBottom: 28,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(226, 232, 240, 0.5)',
      marginVertical: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 20,
      letterSpacing: -0.5,
    },
    quickActionsRow: {
      flexDirection: 'column',
      gap: 16,
    },
    quickActionCard: {
      width: '100%',
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.8)' 
        : 'rgba(255, 255, 255, 0.9)',
      borderRadius: 20,
      padding: 24,
      minHeight: 140,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionIcon: {
      marginBottom: 20,
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: isDark 
        ? 'rgba(245, 158, 11, 0.08)' 
        : 'rgba(245, 158, 11, 0.04)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(245, 158, 11, 0.15)' 
        : 'rgba(245, 158, 11, 0.08)',
    },
    quickActionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      textAlign: 'center',
      opacity: 0.8,
    },
    quickActionValue: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
      lineHeight: 22,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    quickActionSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
      opacity: 0.7,
      lineHeight: 16,
      textAlign: 'center',
      paddingHorizontal: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-start',
      paddingTop: 100,
      paddingHorizontal: 40,
    },
    menuModal: {
      backgroundColor: theme.background,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 280,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.8)',
    },
    menuHeader: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)',
      alignItems: 'center',
    },
    menuHeaderText: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.3,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(71, 85, 105, 0.1)' : 'rgba(226, 232, 240, 0.3)',
    },
    menuItemIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark 
        ? 'rgba(245, 158, 11, 0.15)' 
        : 'rgba(245, 158, 11, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    menuItemText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
      letterSpacing: -0.2,
    },
    safetyModal: {
      position: 'absolute',
      bottom: 120,
      right: 24,
      backgroundColor: isDark 
        ? 'rgba(30, 41, 59, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      padding: 12,
      minWidth: 300,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(71, 85, 105, 0.3)' 
        : 'rgba(226, 232, 240, 0.5)',
    },
    safetyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      minHeight: 64,
      borderRadius: 12,
    },
    safetyItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    safetyItemContent: {
      flex: 1,
    },
    safetyItemTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    safetyItemSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 18,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      <View style={dynamicStyles.container}>
        {/* Enhanced Header */}
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.headerLeft}>
            <TouchableOpacity 
              style={dynamicStyles.menuButton}
              onPress={handleMenuPress}
              accessibilityLabel="Open menu"
              activeOpacity={0.8}
            >
              <Icon name="menu" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>{t('driver:myDashboard')}</Text>
          </View>
          
          <View style={dynamicStyles.headerRight}>
            <View style={dynamicStyles.statusContainer}>
              <View style={dynamicStyles.statusDot} />
              {showFullStatus && (
                <Text style={dynamicStyles.statusText}>{t('driver:offline')}</Text>
              )}
            </View>
            
            <TouchableOpacity
              style={dynamicStyles.themeButton}
              onPress={handleToggleTheme}
              activeOpacity={0.8}
              accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              <Icon 
                name={isDark ? 'sunny-outline' : 'moon-outline'} 
                size={22}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={dynamicStyles.contentContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Enhanced Earnings Card */}
          <TouchableOpacity
            style={dynamicStyles.earningsCard}
            onPress={() => router.push('/EarningsPage')}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.earningsAmount}>
              R{(earnings?.[0]?.todayEarnings ?? 0).toFixed(2)}
            </Text>
            <Text style={dynamicStyles.earningsTitle}>{t('driver:todaysEarnings')}</Text>
            <Text style={dynamicStyles.earningsSubtitle}>
              {t('driver:tapToViewBreakdown')}
            </Text>
          </TouchableOpacity>

          {/* Enhanced Offline Section */}
          <View style={dynamicStyles.offlineSection}>
            <View style={dynamicStyles.offlineIconContainer}>
              <Icon name="car-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={dynamicStyles.offlineTitle}>{t('driver:readyToPickUpPassengers')}</Text>
            <Text style={dynamicStyles.offlineSubtitle}>
              {t('driver:goOnlineToAcceptRequests')}
            </Text>
            
            <View style={dynamicStyles.buttonRow}>
              <TouchableOpacity
                style={dynamicStyles.emergencyButton}
                onPress={handleSafetyPress}
                activeOpacity={0.8}
              >
                <Icon name="call" size={20} color="#DC2626" />
                <Text style={dynamicStyles.emergencyButtonText}>{t('driver:emergency')}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={dynamicStyles.goOnlineButton}
              onPress={onGoOnline}
              activeOpacity={0.9}
              accessibilityLabel="Go online to accept passengers"
            >
              <Text style={dynamicStyles.goOnlineButtonText}>{t('driver:goOnline')}</Text>
            </TouchableOpacity>
          </View>

          {/* Enhanced Quick Actions */}
          <View style={dynamicStyles.quickActionsSection}>
            <View style={dynamicStyles.sectionDivider} />
            <Text style={dynamicStyles.sectionTitle}>{t('driver:quickOverview')}</Text>
            
            <View style={dynamicStyles.quickActionsRow}>
              {quickActions.map((action, index) => (
                <TouchableOpacity 
                  key={index}
                  style={dynamicStyles.quickActionCard}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                  accessibilityLabel={`${action.title}: ${action.value}`}
                >
                  <View style={dynamicStyles.quickActionIcon}>
                    <Icon 
                      name={action.icon} 
                      size={24} 
                      color={action.color}
                    />
                  </View>
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

        {/* Enhanced Menu Modal */}
         <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
            <TouchableOpacity style={dynamicStyles.modalOverlay} onPress={() => setShowMenu(false)}>
              <View style={dynamicStyles.menuModal}>
                <View style={dynamicStyles.menuHeader}>
                  <Text style={dynamicStyles.menuHeaderText}>Menu</Text>
                </View>
                
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={dynamicStyles.menuItem}
                    onPress={() => {
                      item.onPress();
                      setShowMenu(false);
                    }}
                  >
                    <View style={dynamicStyles.menuItemIcon}>
                      <Icon name={item.icon} size={20} color={theme.primary} />
                    </View>
                    <Text style={dynamicStyles.menuItemText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

        {/* Enhanced Safety Modal */}
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
                  style={dynamicStyles.safetyItem}
                  onPress={option.onPress}
                  activeOpacity={0.8}
                >
                  <View style={[
                    dynamicStyles.safetyItemIcon, 
                    { backgroundColor: `${option.color}20` }
                  ]}>
                    <Icon name={option.icon} size={20} color={option.color} />
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