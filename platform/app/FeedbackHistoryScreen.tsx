import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function FeedbackHistoryScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const navigation = useNavigation();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  const isLargeScreen = screenWidth >= 414;

  const feedbackList = useQuery(
    user?.role === 'driver' 
      ? api.functions.feedback.showFeedback.showFeedbackDriver
      : api.functions.feedback.showFeedback.showFeedbackPassenger,
    user?.id ? (user?.role === 'driver' 
      ? { driverId: user.id as Id<"taxiTap_users"> }
      : { passengerId: user.id as Id<"taxiTap_users"> }
    ) : "skip"
  );

  // Calculate pagination
  const totalItems = feedbackList?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFeedback = feedbackList?.slice(startIndex, endIndex) || [];

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
    feedbackCard: {
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
    feedbackHeader: {
      marginBottom: 12,
    },
    feedbackTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
      lineHeight: 20,
    },
    feedbackSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    commentContainer: {
      marginBottom: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    commentText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    routeContainer: {
      marginBottom: 12,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    locationIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 12,
    },
    startIndicator: {
      backgroundColor: theme.primary,
    },
    endIndicator: {
      backgroundColor: '#FF6B6B',
    },
    routeText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      lineHeight: 18,
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
    ratingDetailText: {
      color: '#F59E0B',
      fontWeight: '600',
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

  if (!user) {
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
          <Pressable style={dynamicStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text style={dynamicStyles.headerTitle}>Feedback History</Text>
        </View>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <ScrollView 
           showsVerticalScrollIndicator={false}
           contentContainerStyle={{ 
             paddingBottom: totalPages > 1 ? (Platform.OS === 'ios' ? 120 : 100) : (Platform.OS === 'ios' ? 40 : 20)
           }}
        >
          {/* Feedback List */}
          {!feedbackList ? (
            <View style={dynamicStyles.loadingContainer}>
              <LoadingSpinner size="large" />
              <Text style={dynamicStyles.loadingText}>Loading feedback...</Text>
            </View>
          ) : feedbackList.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <View style={dynamicStyles.emptyStateIcon}>
                <Ionicons 
                  name="chatbubble-ellipses-outline" 
                  size={36} 
                  color={isDark ? 'rgba(156, 163, 175, 0.6)' : 'rgba(156, 163, 175, 0.8)'} 
                />
              </View>
              <Text style={dynamicStyles.emptyStateText}>
                {user.role === 'driver' 
                  ? "No Feedback Yet" 
                  : "No Reviews Yet"
                }
              </Text>
              <Text style={dynamicStyles.emptyStateSubtext}>
                {user.role === 'driver' 
                  ? "Passenger feedback will appear here once you complete rides. Great service leads to better ratings!" 
                  : "Your ride reviews will appear here. Share your experience to help improve our service!"
                }
              </Text>
            </View>
          ) : (
            <>
              <Text style={dynamicStyles.sectionTitle}>
                Your {user.role === 'driver' ? 'Passenger Feedback' : 'Ride Reviews'}
              </Text>
              
              {paginatedFeedback.map((entry: any, index: number) => (
                <View key={entry._id} style={dynamicStyles.feedbackCard}>
                   {/* Header */}
                   <View style={dynamicStyles.feedbackHeader}>
                     <Text style={dynamicStyles.feedbackTitle}>
                       {user.role === 'driver' 
                         ? (entry.passengerName ? `Feedback from ${entry.passengerName}` : 'Passenger Feedback')
                         : (entry.driverName ? `Review for ${entry.driverName}` : 'Driver Review')
                       }
                     </Text>
                     <Text style={dynamicStyles.feedbackSubtitle}>
                       {new Date(entry.createdAt).toLocaleDateString('en-US', {
                         month: 'short',
                         day: 'numeric',
                         year: 'numeric',
                         hour: '2-digit',
                         minute: '2-digit'
                       })}
                     </Text>
                   </View>

                  {/* Comment */}
                  {entry.comment && (
                    <View style={dynamicStyles.commentContainer}>
                      <Text style={dynamicStyles.commentText}>
                        "{entry.comment}"
                      </Text>
                    </View>
                  )}

                  {/* Route Information */}
                  {(entry.startLocation || entry.endLocation) && (
                    <View style={dynamicStyles.routeContainer}>
                       {entry.startLocation && (
                         <View style={dynamicStyles.locationRow}>
                           <View style={[dynamicStyles.locationIndicator, dynamicStyles.startIndicator]} />
                           <Text style={dynamicStyles.routeText} numberOfLines={2}>
                             {entry.startLocation}
                           </Text>
                         </View>
                       )}
                       {entry.endLocation && (
                         <View style={[dynamicStyles.locationRow, { marginBottom: 0 }]}>
                           <View style={[dynamicStyles.locationIndicator, dynamicStyles.endIndicator]} />
                           <Text style={dynamicStyles.routeText} numberOfLines={2}>
                             {entry.endLocation}
                           </Text>
                         </View>
                       )}
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
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    {entry.rating > 0 && (
                      <View style={dynamicStyles.detailItem}>
                        <Ionicons 
                          name="star" 
                          size={14} 
                          color="#F59E0B" 
                          style={dynamicStyles.detailIcon}
                        />
                        <Text style={[dynamicStyles.detailText, dynamicStyles.ratingDetailText]}>
                          {entry.rating}/5
                        </Text>
                      </View>
                    )}
                    {entry.comment && (
                      <View style={dynamicStyles.detailItem}>
                        <Ionicons 
                          name="chatbubble-outline" 
                          size={14} 
                          color={theme.textSecondary} 
                          style={dynamicStyles.detailIcon}
                        />
                        <Text style={dynamicStyles.detailText}>
                          Comment
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
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