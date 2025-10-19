import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Id } from '../convex/_generated/dataModel';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Notification {
  _id: Id<"notifications">;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  userId: Id<"taxiTap_users">;
  type?: string;
  data?: any;
}

export default function NotificationsScreen() {
  const { theme, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const navigation = useNavigation();
  const { notifications, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  const isLargeScreen = screenWidth >= 414;

  // Configure navigation header to hide it since we'll use custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    refreshNotifications();
    setRefreshing(false);
  };

  // Calculate pagination
  const totalItems = notifications?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = notifications?.slice(startIndex, endIndex) || [];

  const handleMarkAsRead = (notificationId: Id<"notifications">) => {
    markAsRead(notificationId);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingTop: Platform.OS === 'ios' ? (screenHeight > 800 ? 80 : 70) : 60,
      paddingBottom: 20,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    markAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.primary,
    },
    markAllButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
      marginTop: 8,
    },
    notificationCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: isSmallScreen ? 12 : 16,
      marginBottom: isSmallScreen ? 12 : 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      // Cross-platform shadow handling
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
      }),
    },
    unreadCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    notificationHeader: {
      marginBottom: 12,
    },
    notificationTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
      lineHeight: 20,
    },
    notificationSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    messageContainer: {
      marginBottom: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    messageText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    detailsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    detailIcon: {
      marginRight: 4,
    },
    detailText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    unreadIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
      marginRight: 4,
    },
    emptyState: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginTop: 32,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      // Cross-platform shadow handling
      ...Platform.select({
        ios: {
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
          shadowColor: theme.shadow,
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
      }),
    },
    emptyStateIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(156, 163, 175, 0.1)' : 'rgba(156, 163, 175, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
    },
    loadingText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 16,
      textAlign: 'center',
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: isSmallScreen ? 16 : 20,
      paddingBottom: Platform.OS === 'ios' ? 30 : 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      backgroundColor: theme.background,
    },
    paginationButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Platform.OS === 'android' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 12,
      // Platform-specific shadows (iOS only)
      ...(Platform.OS === 'ios' && {
        shadowColor: theme.shadow,
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      }),
    },
    paginationButtonActive: {
      backgroundColor: theme.primary,
    },
    paginationButtonDisabled: {
      opacity: 0.3,
    },
    paginationInfo: {
      fontSize: 15,
      color: theme.textSecondary,
      marginHorizontal: 20,
      fontWeight: '600',
      minWidth: 80,
      textAlign: 'center',
    },
  });

  if (!notifications) {
    return (
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerRow}>
          <View style={dynamicStyles.headerLeft}>
            <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={dynamicStyles.headerTitle}>
              {currentLanguage === 'zu' ? 'Izaziso' :
               currentLanguage === 'tn' ? 'Dikitsiso' :
               currentLanguage === 'af' ? 'Kennisgewings' :
               'Notifications'}
            </Text>
          </View>
          {notifications.length > 0 && (
            <Pressable style={dynamicStyles.markAllButton} onPress={markAllAsRead}>
              <Text style={dynamicStyles.markAllButtonText}>
                {currentLanguage === 'zu' ? 'Maka Konke Kufundiwe' :
                 currentLanguage === 'tn' ? 'Tshwaya Tsotlhe di Balilwe' :
                 currentLanguage === 'af' ? 'Merk Alles Gelees' :
                 'Mark All Read'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingBottom: totalPages > 1 ? (Platform.OS === 'ios' ? 120 : 100) : (Platform.OS === 'ios' ? 40 : 20)
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Notifications List */}
          {notifications.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <View style={dynamicStyles.emptyStateIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={36}
                  color={isDark ? 'rgba(156, 163, 175, 0.6)' : 'rgba(156, 163, 175, 0.8)'}
                />
              </View>
              <Text style={dynamicStyles.emptyStateText}>
                {currentLanguage === 'zu' ? 'Azikho Izaziso Okwamanje' :
                 currentLanguage === 'tn' ? 'Ga go na Dikitsiso Jaanong' :
                 currentLanguage === 'af' ? 'Nog Geen Kennisgewings Nie' :
                 'No Notifications Yet'}
              </Text>
              <Text style={dynamicStyles.emptyStateSubtext}>
                {currentLanguage === 'zu' ? 'Uzothola izaziso lapha uma kunezibuyekezo mayelana nohambo lwakho, ukubhukha, nomsebenzi we-akhawunti yakho.' :
                 currentLanguage === 'tn' ? 'O tla amogela dikitsiso fano fa go na le dimpshafatso ka ga loeto lwa gago, ditshupiso le tiro ya akhaonto ya gago.' :
                 currentLanguage === 'af' ? 'Jy sal hier kennisgewings ontvang wanneer daar opdaterings is oor jou ritte, besprekings en rekeningaktiwiteit.' :
                 'You\'ll receive notifications here when there are updates about your rides, bookings, and account activity.'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={dynamicStyles.sectionTitle}>
                {currentLanguage === 'zu' ? `Izaziso Zakho (${notifications.length})` :
                 currentLanguage === 'tn' ? `Dikitsiso Tsa Gago (${notifications.length})` :
                 currentLanguage === 'af' ? `Jou Kennisgewings (${notifications.length})` :
                 `Your Notifications (${notifications.length})`}
              </Text>
              
              {paginatedNotifications.map((notification: any, index: number) => (
                <Pressable 
                  key={notification._id} 
                  style={[
                    dynamicStyles.notificationCard,
                    !notification.isRead && dynamicStyles.unreadCard
                  ]}
                  onPress={() => !notification.isRead && handleMarkAsRead(notification._id)}
                >
                  {/* Header */}
                  <View style={dynamicStyles.notificationHeader}>
                    <Text style={dynamicStyles.notificationTitle}>
                      {notification.title}
                    </Text>
                    <Text style={dynamicStyles.notificationSubtitle}>
                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>

                  {/* Message */}
                  {notification.message && (
                    <View style={dynamicStyles.messageContainer}>
                      <Text style={dynamicStyles.messageText}>
                        {notification.message}
                      </Text>
                    </View>
                  )}

                  {/* Details */}
                  <View style={dynamicStyles.detailsContainer}>
                    <View style={dynamicStyles.detailItem}>
                      <Ionicons 
                        name="time-outline" 
                        size={14} 
                        color={theme.textSecondary} 
                        style={dynamicStyles.detailIcon}
                      />
                      <Text style={dynamicStyles.detailText}>
                        {new Date(notification.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    {notification.type && (
                      <View style={dynamicStyles.detailItem}>
                        <Ionicons 
                          name="information-circle-outline" 
                          size={14} 
                          color={theme.textSecondary} 
                          style={dynamicStyles.detailIcon}
                        />
                        <Text style={dynamicStyles.detailText}>
                          {notification.type.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {!notification.isRead && (
                      <View style={[dynamicStyles.detailItem, dynamicStyles.unreadIndicator]}>
                        <View style={dynamicStyles.unreadDot} />
                        <Text style={[dynamicStyles.detailText, { color: theme.primary }]}>
                          Unread
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      </View>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <View style={dynamicStyles.paginationContainer}>
          <Pressable
            style={[
              dynamicStyles.paginationButton,
              currentPage === 1 && dynamicStyles.paginationButtonDisabled
            ]}
            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </Pressable>
          
          <Text style={dynamicStyles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </Text>
          
          <Pressable
            style={[
              dynamicStyles.paginationButton,
              currentPage === totalPages && dynamicStyles.paginationButtonDisabled
            ]}
            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
