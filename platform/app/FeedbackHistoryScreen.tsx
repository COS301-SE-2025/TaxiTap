import React, { useLayoutEffect } from 'react';
import { ScrollView, Text, View, SafeAreaView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useUser } from '../contexts/UserContext';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function FeedbackHistoryScreen() {
  const { theme, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const { user } = useUser();
  const router = useRouter();
  const navigation = useNavigation();

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    noFeedbackReceived: {
      en: "You haven't received any feedback yet.",
      zu: "Awukakutholi noma yikuphi ukubuyisela imibono.",
      tn: "Ga o na le mabaka a a tserweng.",
      af: "Jy het nog geen terugvoer ontvang nie."
    },
    noReviewsLeft: {
      en: "You haven't left any reviews yet.",
      zu: "Awukashiyi noma yikuphi ukubuyekela.",
      tn: "Ga o na le dikgato tse o di tlogetseng.",
      af: "Jy het nog geen resensies gelaat nie."
    },
    feedbackHelpsImprove: {
      en: "Passenger feedback helps improve your service!",
      zu: "Ukubuyisela imibono komhambi kusiza ukuthuthukisa isevisi yakho!",
      tn: "Mabaka a moleledi a thusa go tokafatsa tshebeletso ya gago!",
      af: "Passasierterugvoer help om jou diens te verbeter!"
    },
    yourFeedbackHelps: {
      en: "Your feedback helps improve our service!",
      zu: "Ukubuyisela imibono kwakho kusiza ukuthuthukisa isevisi yethu!",
      tn: "Mabaka a gago a thusa go tokafatsa tshebeletso ya rona!",
      af: "Jou terugvoer help om ons diens te verbeter!"
    },
    rating: {
      en: "Rating:",
      zu: "Isilinganiso:",
      tn: "Tlhopho:",
      af: "Gradering:"
    },
    comment: {
      en: "Comment:",
      zu: "Ukuphawula:",
      tn: "Tlhaloso:",
      af: "Kommentaar:"
    },
    passenger: {
      en: "Passenger:",
      zu: "Umhambi:",
      tn: "Moleledi:",
      af: "Passasier:"
    },
    driver: {
      en: "Driver:",
      zu: "Umshayeli:",
      tn: "Mokgweetsi:",
      af: "Bestuurder:"
    },
    from: {
      en: "From:",
      zu: "Kusuka:",
      tn: "Go tswa:",
      af: "Van:"
    },
    to: {
      en: "To:",
      zu: "Kuya:",
      tn: "Go ya:",
      af: "Na:"
    },
    notAvailable: {
      en: "N/A",
      zu: "Akukho",
      tn: "Ga go na",
      af: "N/V"
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  const feedbackList = useQuery(
    user?.role === 'driver' 
      ? api.functions.feedback.showFeedback.showFeedbackDriver
      : api.functions.feedback.showFeedback.showFeedbackPassenger,
    user?.id ? (user?.role === 'driver' 
      ? { driverId: user.id as Id<"taxiTap_users"> }
      : { passengerId: user.id as Id<"taxiTap_users"> }
    ) : "skip"
  );

  const dynamicStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    section: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      overflow: 'hidden',
    },
    feedbackItem: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      minHeight: 56,
    },
    lastFeedbackItem: {
      borderBottomWidth: 0,
    },
    feedbackContent: {
      marginBottom: 8,
    },
    feedbackText: {
      fontSize: 17,
      color: theme.text,
      fontWeight: '400',
      marginBottom: 4,
    },
    feedbackSecondary: {
      fontSize: 15,
      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      fontWeight: '400',
      marginBottom: 4,
    },
    feedbackTimestamp: {
      fontSize: 12,
      color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
      fontWeight: '400',
      marginTop: 8,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      textAlign: 'center',
      marginBottom: 8,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      minHeight: 120,
    },
  });

  if (!user) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <LoadingSpinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView 
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Feedback List Section */}
        <View style={dynamicStyles.section}>
          {!feedbackList ? (
            <View style={dynamicStyles.loadingContainer}>
              <LoadingSpinner size="small" />
            </View>
          ) : feedbackList.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <Text style={dynamicStyles.emptyStateText}>
                {user.role === 'driver' 
                  ? getTranslation('noFeedbackReceived')
                  : getTranslation('noReviewsLeft')
                }
              </Text>
              <Text style={dynamicStyles.emptyStateText}>
                {user.role === 'driver' 
                  ? getTranslation('feedbackHelpsImprove')
                  : getTranslation('yourFeedbackHelps')
                }
              </Text>
            </View>
          ) : (
            feedbackList.map((entry: any, index: number) => (
              <View
                key={entry._id}
                style={[
                  dynamicStyles.feedbackItem,
                  index === feedbackList.length - 1 && dynamicStyles.lastFeedbackItem
                ]}
              >
                <View style={dynamicStyles.feedbackContent}>
                  {entry.rating > 0 && (
                    <Text style={dynamicStyles.feedbackText}>⭐ {getTranslation('rating')} {entry.rating}</Text>
                  )}
                  {entry.comment && (
                    <Text style={dynamicStyles.feedbackText}>📝 {getTranslation('comment')} {entry.comment}</Text>
                  )}
                  {user.role === 'driver' ? (
                    // For drivers, show passenger name
                    entry.passengerName && (
                      <Text style={dynamicStyles.feedbackSecondary}>{getTranslation('passenger')} {entry.passengerName}</Text>
                    )
                  ) : (
                    // For passengers, show driver name
                    entry.driverName && (
                      <Text style={dynamicStyles.feedbackSecondary}>{getTranslation('driver')} {entry.driverName}</Text>
                    )
                  )}
                  {(entry.startLocation || entry.endLocation) && (
                    <View>
                      <Text style={dynamicStyles.feedbackSecondary}>
                        {getTranslation('from')} {entry.startLocation || getTranslation('notAvailable')}
                      </Text>
                      <Text style={dynamicStyles.feedbackSecondary}>
                        {getTranslation('to')} {entry.endLocation || getTranslation('notAvailable')}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={dynamicStyles.feedbackTimestamp}>
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}