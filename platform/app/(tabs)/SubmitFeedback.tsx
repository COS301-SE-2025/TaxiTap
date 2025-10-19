import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Pressable, Image, SafeAreaView,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { Id } from '../../convex/_generated/dataModel';
import { isMultiLegJourney, getNextLeg } from '../../utils/multiLegJourneyHelpers';
import { useMapContext } from '../../contexts/MapContext';
import { useMultiLegJourney } from '../../contexts/MultiLegJourneyContext';

export default function SubmitFeedbackScreen() {
  const navigation = useNavigation();

  // Hide header and tab bar like TaxiInformation page
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' }
    });
  }, [navigation]);

  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { theme, isDark } = useTheme();
  const { user } = useUser();
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { clearMapContext } = useMapContext();
  const { showGlobalError, showGlobalSuccess } = useAlertHelpers();
  
  // Safe access to MultiLegJourneyProvider with fallback
  let clearJourneyCache: (() => Promise<void>) | undefined;
  try {
    const multiLegJourneyContext = useMultiLegJourney();
    clearJourneyCache = multiLegJourneyContext.clearJourneyCache;
  } catch (error) {
    // Provider not available, provide a no-op fallback
    console.warn('MultiLegJourneyProvider not available, using fallback');
    clearJourneyCache = async () => {};
  }

  const {
    rideId,
    startName,
    endName,
    passengerId,
    driverId,
    actualFare,
    // Multi-leg journey parameters
    isMultiLeg,
    journeyId,
    legIndex,
    totalLegs,
    routeName,
    continueToNext,
  } = useLocalSearchParams<{
    rideId?: string;
    startName?: string;
    endName?: string;
    passengerId?: string;
    driverId?: string;
    actualFare?: string;
    // Multi-leg journey parameters
    isMultiLeg?: string;
    journeyId?: string;
    legIndex?: string;
    totalLegs?: string;
    routeName?: string;
    continueToNext?: string;
  }>();

  // Multi-leg journey state
  const isMultiLegJourney = isMultiLeg === 'true';
  const currentLegIndex = parseInt(legIndex || '0');
  const totalLegsCount = parseInt(totalLegs || '1');

  const saveFeedback = useMutation(api.functions.feedback.saveFeedback.saveFeedback);
  const completeLegWithPayment = useMutation(api.functions.journeys.journeyStateManager.completeLegWithPayment);
  const getJourneyState = useQuery(
    api.functions.journeys.journeyStateManager.getJourneyState,
    (isMultiLegJourney && journeyId) ? { journeyId } : "skip"
  );

  useEffect(() => { if (user) setName(user.name || ''); }, [user]);

  const handleSubmit = async () => {
    if (!rating && !comment) {
      showGlobalError('No Input', 'Please provide a rating or comment', { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    if (!rideId || !passengerId || !driverId || !startName || !endName) {
      showGlobalError('Missing info', 'Cannot submit feedback: Missing ride/user info.', { duration: 5000, position: 'top', animation: 'slide-down' });
      return;
    }

    try {
      // Submit feedback
      await saveFeedback({
        rideId: rideId as Id<"rides">,
        passengerId: passengerId as Id<"taxiTap_users">,
        driverId: driverId as Id<"taxiTap_users">,
        rating,
        comment,
        startLocation: startName,
        endLocation: endName,
      });

      // Handle multi-leg journey progression
      if (isMultiLegJourney && journeyId) {
        console.log(`Completing leg ${currentLegIndex + 1} of multi-leg journey ${journeyId}`);
        console.log('Multi-leg parameters:', {
          isMultiLegJourney,
          journeyId,
          legIndex,
          totalLegs,
          currentLegIndex,
          totalLegsCount,
          actualFare,
          isLastLeg: currentLegIndex === totalLegsCount - 1
        });

        try {
          // Complete the current leg with payment
          // The backend will verify payment status and auto-confirm if needed
          const legResult = await completeLegWithPayment({
            journeyId,
            legIndex: currentLegIndex,
            actualCost: actualFare ? parseFloat(actualFare) : 0,
          });

          console.log('Multi-leg completion result:', legResult);
          console.log('Journey completion analysis:', {
            success: legResult.success,
            journeyComplete: legResult.journeyComplete,
            hasNextLeg: !!legResult.nextLeg,
            currentLegIndex,
            totalLegsCount
          });

          if (legResult.success && !legResult.journeyComplete && legResult.nextLeg) {
          // Journey continues - navigate to next leg
          const nextLeg = legResult.nextLeg;

          showGlobalSuccess(
            `Leg ${currentLegIndex + 1} Complete!`,
            `Ready for leg ${currentLegIndex + 2}? You have 5 minutes to board the next taxi.`,
            {
              duration: 0,
              actions: [
                {
                  label: 'Continue to Next Leg',
                  onPress: () => {
                    router.replace({
                      pathname: '/(tabs)/TaxiInformation',
                      params: {
                        destinationName: nextLeg.destination.address,
                        destinationLat: nextLeg.destination.coordinates.latitude.toString(),
                        destinationLng: nextLeg.destination.coordinates.longitude.toString(),
                        currentName: nextLeg.origin.address,
                        currentLat: nextLeg.origin.coordinates.latitude.toString(),
                        currentLng: nextLeg.origin.coordinates.longitude.toString(),
                        routeId: journeyId,
                        estimatedFare: nextLeg.estimatedCost.toString(),
                        isMultiLeg: 'true',
                        journeyId: journeyId,
                        legIndex: nextLeg.legIndex.toString(),
                        totalLegs: totalLegsCount.toString(),
                        routeName: nextLeg.routeName,
                      },
                    });
                  },
                  style: 'default',
                },
                {
                  label: 'Cancel Journey',
                  onPress: () => router.replace('/(tabs)/HomeScreen'),
                  style: 'cancel',
                },
              ],
            }
          );
          return;
        } else if (legResult.success && legResult.journeyComplete) {
          // Journey complete - clear all states before navigating home
          console.log('Journey complete! Clearing states and navigating to HomeScreen');

          try {
            // Clear all journey and map states immediately
            console.log('🧹 Clearing multi-leg journey states after completion');
            clearMapContext();
            if (clearJourneyCache) {
              await clearJourneyCache();
            }
            console.log('Multi-leg journey cache cleared successfully');
          } catch (error) {
            console.error('Error clearing journey states:', error);
            // Continue with navigation even if clearing fails
          }

          // Navigate immediately without showing success message first to avoid conflicts
          console.log('Navigating to HomeScreen after journey completion');
          try {
            // Navigate to HomeScreen without passing any parameters that might cause crashes
            router.push({ pathname: './HomeScreen' });
            console.log('Navigation to HomeScreen initiated with clean parameters');
          } catch (error) {
            console.error('Navigation error:', error);
            // Fallback: try with replace
            try {
              router.replace({ pathname: './HomeScreen' });
              console.log('Fallback navigation to HomeScreen successful');
            } catch (fallbackError) {
              console.error('All navigation attempts failed:', fallbackError);
              // Last resort: try basic navigation without object syntax
              try {
                router.push('./HomeScreen');
              } catch (basicError) {
                console.error('Even basic navigation failed:', basicError);
              }
            }
          }
          return;
        } else {
          // If journey doesn't have nextLeg or other issue, show error
          console.error('Multi-leg journey completion failed or missing nextLeg:', legResult);
          console.error('This else case should not happen for final leg. Expected journeyComplete: true');
          console.error('Debug values:', {
            legResultSuccess: legResult.success,
            legResultJourneyComplete: legResult.journeyComplete,
            legResultNextLeg: legResult.nextLeg,
            actualCurrentLegIndex: currentLegIndex,
            actualTotalLegsCount: totalLegsCount,
            isLastLeg: currentLegIndex === totalLegsCount - 1
          });
          showGlobalError('Multi-leg Journey Error', 'Unable to continue to next leg. Please try again or contact support.', {
            duration: 0,
            actions: [
              {
                label: 'Go to Home',
                onPress: () => {
                  clearMapContext();
                  router.replace('/(tabs)/HomeScreen');
                },
                style: 'default'
              }
            ]
          });
          return;
        }
      } catch (multiLegError: any) {
          console.error('Multi-leg journey completion error:', multiLegError);
          showGlobalError('Multi-leg Journey Error',
            multiLegError.message || 'Failed to complete leg. Please ensure payment is confirmed and try again.',
            {
              duration: 0,
              actions: [
                {
                  label: 'Go to Home',
                  onPress: () => {
                    clearMapContext();
                    router.replace('/(tabs)/HomeScreen');
                  },
                  style: 'default'
                }
              ]
            }
          );
          return;
        }
      }

      // Check if this is a continue to next leg flow
      if (continueToNext === 'true' && journeyId && legIndex) {
        // Navigate to TaxiInformation for next leg
        const nextLegIndex = parseInt(legIndex) + 1;

        // Get the next leg information from journey state
        if (getJourneyState && getJourneyState.legs && getJourneyState.legs[nextLegIndex]) {
          const nextLeg = getJourneyState.legs[nextLegIndex];

          showGlobalSuccess('Feedback submitted!', 'Continuing to next leg...', {
            duration: 2000,
            position: 'top',
            animation: 'slide-down',
          });

          setTimeout(() => {
            router.push({
              pathname: '/(tabs)/TaxiInformation',
              params: {
                destinationName: nextLeg.destination.address,
                destinationLat: nextLeg.destination.coordinates.latitude.toString(),
                destinationLng: nextLeg.destination.coordinates.longitude.toString(),
                currentName: nextLeg.origin.address,
                currentLat: nextLeg.origin.coordinates.latitude.toString(),
                currentLng: nextLeg.origin.coordinates.longitude.toString(),
                routeId: journeyId,
                estimatedFare: nextLeg.estimatedCost.toString(),
                isMultiLeg: 'true',
                journeyId,
                legIndex: nextLegIndex.toString(),
                totalLegs,
                routeName: nextLeg.routeName,
              },
            });
          }, 2000);
        } else {
          showGlobalError('Navigation Error', 'Unable to get next leg information. Please try again.', {
            duration: 4000,
            position: 'top',
            animation: 'slide-down',
          });
        }
        return;
      }

      // Standard single ride completion
      setRating(0);
      setComment('');
      showGlobalSuccess(
        currentLanguage === 'zu' ? 'Impumelelo' :
        currentLanguage === 'tn' ? 'Katlego' :
        currentLanguage === 'af' ? 'Sukses' :
        'Success',
        currentLanguage === 'zu' ? 'Ukuphawula kuthunyelwe ngempumelelo!' :
        currentLanguage === 'tn' ? 'Maikutlo a rometse ka katlego!' :
        currentLanguage === 'af' ? 'Terugvoer suksesvol ingedien!' :
        'Feedback submitted successfully!',
        {
          duration: 0,
          position: 'top',
          animation: 'slide-down',
          actions: [
            {
              label: currentLanguage === 'zu' ? 'KULUNGILE' :
                     currentLanguage === 'tn' ? 'GO SIAME' :
                     currentLanguage === 'af' ? 'OK' :
                     'OK',
              onPress: () => {
                clearMapContext();
                router.replace('/(tabs)/HomeScreen');
              },
              style: 'default'
            },
          ],
        }
      );
    } catch (err: any) {
      showGlobalError('Error', err.message || 'Something went wrong.', { duration: 5000, position: 'top', animation: 'slide-down' });
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: 'images', 
        allowsEditing: true, 
        quality: 1,
        aspect: [1, 1]
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch {}
  };

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
    headerSection: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    profileImageContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    cameraIconOverlay: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: '#f90',
      borderRadius: 14,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.background,
    },
    userName: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    userRole: {
      fontSize: 16,
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      fontWeight: '500',
      textTransform: 'capitalize',
      marginBottom: 16,
    },
    rideInfoContainer: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      width: '100%',
    },
    rideInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    lastRideInfoRow: {
      marginBottom: 0,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rideInfoContent: {
      flex: 1,
    },
    rideInfoLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    rideInfoText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    section: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      overflow: 'hidden',
    },
    ratingSection: {
      padding: 20,
    },
    ratingTitle: {
      fontSize: 17,
      fontWeight: '400',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    starButton: {
      padding: 8,
    },
    commentSection: {
    },
    commentInput: {
      color: theme.text,
      height: 120,
      borderRadius: 12,
      padding: 16,
      textAlignVertical: 'top',
      fontSize: 16,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(255,255,255,0)' 
        : 'rgba(0,0,0,0.08)',
    },
    buttonContainer: {
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 20,
      marginTop: 8,
    },
    submitButton: {
      backgroundColor: '#F59E0B',
      borderRadius: 28,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      borderWidth: 2,
      borderColor: '#D97706',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    skipButton: {
      backgroundColor: isDark 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.05)',
      borderRadius: 28,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      minHeight: 56,
    },
    skipButtonText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView 
        contentContainerStyle={dynamicStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Profile and Ride Info */}
        <View style={dynamicStyles.headerSection}>
          <Pressable onPress={handleUploadPhoto} style={dynamicStyles.profileImageContainer}>
            <View style={dynamicStyles.profileImage}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={48} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
              )}
            </View>
            <View style={dynamicStyles.cameraIconOverlay}>
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </Pressable>
          
          <Text style={dynamicStyles.userName}>{name}</Text>
          <Text style={dynamicStyles.userRole}>Passenger</Text>
          
          {/* Ride Info Section - styled exactly like PassengerProfile */}
          <View style={dynamicStyles.rideInfoContainer}>
            <View style={dynamicStyles.rideInfoRow}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="location-outline" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.rideInfoContent}>
                <Text style={dynamicStyles.rideInfoLabel}>
                  {currentLanguage === 'zu' ? 'Kusuka' :
                   currentLanguage === 'tn' ? 'Go tswa' :
                   currentLanguage === 'af' ? 'Van' :
                   'From'}
                </Text>
                <Text style={dynamicStyles.rideInfoText}>{startName ?? 'N/A'}</Text>
              </View>
            </View>
            <View style={[dynamicStyles.rideInfoRow, dynamicStyles.lastRideInfoRow]}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="location" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.rideInfoContent}>
                <Text style={dynamicStyles.rideInfoLabel}>
                  {currentLanguage === 'zu' ? 'Kuya' :
                   currentLanguage === 'tn' ? 'Go ya' :
                   currentLanguage === 'af' ? 'Na' :
                   'To'}
                </Text>
                <Text style={dynamicStyles.rideInfoText}>{endName ?? 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Driver Feedback Section */}
        <Text style={dynamicStyles.sectionHeader}>
          {currentLanguage === 'zu' ? 'Linganisa Umshayeli Wakho' :
           currentLanguage === 'tn' ? 'Lekanya Mokgweetsi wa Gago' :
           currentLanguage === 'af' ? 'Gradeer Jou Bestuurder' :
           'Rate Your Driver'}
        </Text>
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.ratingSection}>
            <Text style={dynamicStyles.ratingTitle}>
              {currentLanguage === 'zu' ? 'Ubunjani umshayeli wakho?' :
               currentLanguage === 'tn' ? 'Mokgweetsi wa gago o ne a le jang?' :
               currentLanguage === 'af' ? 'Hoe was jou bestuurder?' :
               'How was your driver?'}
            </Text>
            <View style={dynamicStyles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => setRating(star)}
                  style={dynamicStyles.starButton}
                  activeOpacity={0.7}
                >
                  <FontAwesome 
                    name={rating >= star ? 'star' : 'star-o'} 
                    size={36} 
                    color={rating >= star ? '#F59E0B' : theme.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Comment Section */}
        <Text style={dynamicStyles.sectionHeader}>
          {currentLanguage === 'zu' ? 'Yabelana Ngokuphawula Kwakho' :
           currentLanguage === 'tn' ? 'Abelana ka Maikutlo a Gago' :
           currentLanguage === 'af' ? 'Deel Jou Terugvoer' :
           'Share Your Feedback'}
        </Text>
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.commentSection}>
            <Text style={dynamicStyles.commentTitle}>
              {currentLanguage === 'zu' ? 'Sitshele ngomshayeli wakho' :
               currentLanguage === 'tn' ? 'Re bolelele ka mokgweetsi wa gago' :
               currentLanguage === 'af' ? 'Vertel ons van jou bestuurder' :
               'Tell us about your driver'}
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={
                currentLanguage === 'zu' ? 'Yabelana ngemicabango yakho ngomshayeli...' :
                currentLanguage === 'tn' ? 'Abelana ka dikakanyo tsa gago ka mokgweetsi...' :
                currentLanguage === 'af' ? 'Deel jou gedagtes oor die bestuurder...' :
                'Share your thoughts about the driver...'
              }
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
              style={dynamicStyles.commentInput}
              multiline
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={dynamicStyles.buttonContainer}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={dynamicStyles.submitButton}
            activeOpacity={0.9}
          >
            <Text style={dynamicStyles.submitButtonText}>
              {currentLanguage === 'zu' ? 'Thumela Ukuphawula' :
               currentLanguage === 'tn' ? 'Romela Maikutlo' :
               currentLanguage === 'af' ? 'Dien Terugvoer In' :
               'Submit Feedback'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={async () => {
              // Check if this is a continue to next leg flow
              if (continueToNext === 'true' && journeyId && legIndex) {
                // Navigate to TaxiInformation for next leg
                const nextLegIndex = parseInt(legIndex) + 1;

                // Get the next leg information from journey state
                if (getJourneyState && getJourneyState.legs && getJourneyState.legs[nextLegIndex]) {
                  const nextLeg = getJourneyState.legs[nextLegIndex];

                  router.push({
                    pathname: '/(tabs)/TaxiInformation',
                    params: {
                      destinationName: nextLeg.destination.address,
                      destinationLat: nextLeg.destination.coordinates.latitude.toString(),
                      destinationLng: nextLeg.destination.coordinates.longitude.toString(),
                      currentName: nextLeg.origin.address,
                      currentLat: nextLeg.origin.coordinates.latitude.toString(),
                      currentLng: nextLeg.origin.coordinates.longitude.toString(),
                      routeId: journeyId,
                      estimatedFare: nextLeg.estimatedCost.toString(),
                      isMultiLeg: 'true',
                      journeyId,
                      legIndex: nextLegIndex.toString(),
                      totalLegs,
                      routeName: nextLeg.routeName,
                    },
                  });
                } else {
                  showGlobalError('Navigation Error', 'Unable to get next leg information. Please try again.', {
                    duration: 4000,
                    position: 'top',
                    animation: 'slide-down',
                  });
                }
              } else {
                // Standard skip feedback flow - clear states for multi-leg journeys
                if (isMultiLegJourney && journeyId) {
                  // For multi-leg journeys, always clear states to prevent loading screen hanging
                  // This covers cases where the journey might be completed but state check fails
                  console.log('🧹 Clearing multi-leg journey states on skip feedback');
                  try {
                    clearMapContext();
                    if (clearJourneyCache) {
                      await clearJourneyCache();
                    }
                    console.log('Multi-leg journey cache cleared successfully');
                  } catch (error) {
                    console.error('Error clearing journey states on skip:', error);
                  }

                  // Add a small delay to ensure cache clearing propagates before navigation
                  setTimeout(() => {
                    router.replace('/(tabs)/HomeScreen');
                  }, 100);
                } else {
                  // For non-multi-leg journeys, navigate immediately
                  router.replace('/(tabs)/HomeScreen');
               }
              }
            }}
            style={dynamicStyles.skipButton}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.skipButtonText}>
              {currentLanguage === 'zu' ? 'Yeqa Ukuphawula' :
               currentLanguage === 'tn' ? 'Tlola Maikutlo' :
               currentLanguage === 'af' ? 'Slaan Terugvoer Oor' :
               'Skip Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}