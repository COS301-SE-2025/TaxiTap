import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Pressable, Image, SafeAreaView,
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAlertHelpers } from '../../components/AlertHelpers';
import { Id } from '../../convex/_generated/dataModel';
import { isMultiLegJourney, getNextLeg } from '../../utils/multiLegJourneyHelpers';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SubmitFeedbackScreen() {
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

  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  const translations: Record<string, Record<SupportedLanguage, string>> = {
    noInput: {
      en: 'No Input',
      zu: 'Akukho Okufakwayo',
      tn: 'Ga go na Tseno',
      af: 'Geen Invoer'
    },
    pleaseProvideRatingOrComment: {
      en: 'Please provide a rating or comment',
      zu: 'Sicela unike isilinganiso noma umbono',
      tn: 'Ka kopa o ntshe kgato kgotsa maikutlo',
      af: 'Verskaf asseblief \'n gradering of kommentaar'
    },
    missingInfo: {
      en: 'Missing info',
      zu: 'Ulwazi oluswelayo',
      tn: 'Tshedimosetso e e tlhokegang',
      af: 'Ontbrekende inligting'
    },
    cannotSubmitFeedback: {
      en: 'Cannot submit feedback: Missing ride/user info.',
      zu: 'Akukwazi ukuthumela impendulo: Ulwazi lwe-ride/umsebenzisi oluswelayo.',
      tn: 'Ga go kgone go romela maikutlo: Tshedimosetso ya leeto/mošomi e e tlhokegang.',
      af: 'Kan nie terugvoer indien nie: Ontbrekende rit/gebruiker inligting.'
    },
    legComplete: {
      en: 'Leg Complete!',
      zu: 'Ilegi Iqedile!',
      tn: 'Leoto Le Fedile!',
      af: 'Been Voltooi!'
    },
    readyForNextLeg: {
      en: 'Ready for leg',
      zu: 'Silungele ilegi',
      tn: 'Re loketse leoto',
      af: 'Gereed vir been'
    },
    youHaveFiveMinutesToBoard: {
      en: 'You have 5 minutes to board the next taxi.',
      zu: 'Unemizuzu emi-5 ukugibela iteksi elandelayo.',
      tn: 'O na le metsotso e mehlano a go tsena ka tekisi e e latelang.',
      af: 'Jy het 5 minute om die volgende taxi te betree.'
    },
    continueToNextLeg: {
      en: 'Continue to Next Leg',
      zu: 'Qhubeka Ngelegi Elandelayo',
      tn: 'Tswela Pele ka Leoto le le Latelang',
      af: 'Gaan Voort na Volgende Been'
    },
    cancelJourney: {
      en: 'Cancel Journey',
      zu: 'Khansela Uhambo',
      tn: 'Tlogela Leeto',
      af: 'Kanselleer Reis'
    },
    journeyComplete: {
      en: 'Journey Complete!',
      zu: 'Uhambo Luphelile!',
      tn: 'Leeto Le Fedile!',
      af: 'Reis Voltooi!'
    },
    multiLegJourneyCompletedSuccessfully: {
      en: 'Multi-leg journey completed successfully! Total cost: R',
      zu: 'Uhambo lwemigqa eminingi luphelile ngempumelelo! Izindleko eziphelele: R',
      tn: 'Leeto la maloto a mantsi le fedile ka katlego! Tefo e e feletseng: R',
      af: 'Multi-been reis suksesvol voltooi! Totale koste: R'
    },
    ok: {
      en: 'OK',
      zu: 'KULUNGILE',
      tn: 'GO SIAME',
      af: 'OK'
    },
    feedbackSubmitted: {
      en: 'Feedback submitted!',
      zu: 'Impendulo ithunyelwe!',
      tn: 'Maikutlo a rometse!',
      af: 'Terugvoer ingedien!'
    },
    continuingToNextLeg: {
      en: 'Continuing to next leg...',
      zu: 'Kuqhubeka ngelegi elandelayo...',
      tn: 'E tswela pele ka leoto le le latelang...',
      af: 'Gaan voort na volgende been...'
    },
    success: {
      en: 'Success',
      zu: 'Impumelelo',
      tn: 'Katlego',
      af: 'Sukses'
    },
    feedbackSubmittedSuccessfully: {
      en: 'Feedback submitted successfully!',
      zu: 'Impendulo ithunyelwe ngempumelelo!',
      tn: 'Maikutlo a rometse ka katlego!',
      af: 'Terugvoer suksesvol ingedien!'
    },
    error: {
      en: 'Error',
      zu: 'Iphutha',
      tn: 'Phoso',
      af: 'Fout'
    },
    somethingWentWrong: {
      en: 'Something went wrong.',
      zu: 'Kukhona okungahambi kahle.',
      tn: 'Go na le sengwe se se sa siamang.',
      af: 'Iets het verkeerd gegaan.'
    },
    passenger: {
      en: 'Passenger',
      zu: 'Umhambi',
      tn: 'Moeng',
      af: 'Passasier'
    },
    from: {
      en: 'From',
      zu: 'Kusuka',
      tn: 'Go tswa',
      af: 'Van'
    },
    to: {
      en: 'To',
      zu: 'Kuya',
      tn: 'Go ya',
      af: 'Na'
    },
    na: {
      en: 'N/A',
      zu: 'Akukho',
      tn: 'Ga go na',
      af: 'N/V'
    },
    rateYourDriver: {
      en: 'Rate Your Driver',
      zu: 'Linganisa Umqhubi Wakho',
      tn: 'Etsa Moferefere wa Gago',
      af: 'Grader Jou Bestuurder'
    },
    howWasYourDriver: {
      en: 'How was your driver?',
      zu: 'Umqhubi wakho ubekanjani?',
      tn: 'Moferefere wa gago o ne a le bjang?',
      af: 'Hoe was jou bestuurder?'
    },
    shareYourFeedback: {
      en: 'Share Your Feedback',
      zu: 'Yabelana Ngempendulo Yakho',
      tn: 'Arolelana ka Maikutlo a Gago',
      af: 'Deel Jou Terugvoer'
    },
    tellUsAboutYourDriver: {
      en: 'Tell us about your driver',
      zu: 'Sitshele ngomqhubi wakho',
      tn: 'Re bolelele ka moferefere wa gago',
      af: 'Vertel ons van jou bestuurder'
    },
    shareYourThoughtsAboutDriver: {
      en: 'Share your thoughts about the driver...',
      zu: 'Yabelana ngemibono yakho ngomqhubi...',
      tn: 'Arolelana ka maikutlo a gago ka moferefere...',
      af: 'Deel jou gedagtes oor die bestuurder...'
    },
    submitFeedback: {
      en: 'Submit Feedback',
      zu: 'Thumela Impendulo',
      tn: 'Romela Maikutlo',
      af: 'Dien Terugvoer In'
    },
    skipFeedback: {
      en: 'Skip Feedback',
      zu: 'Yeza Impendulo',
      tn: 'Tlogela Maikutlo',
      af: 'Slaan Terugvoer Oor'
    }
  } as const;

  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

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
      showGlobalError(getTranslation('noInput'), getTranslation('pleaseProvideRatingOrComment'), { duration: 4000, position: 'top', animation: 'slide-down' });
      return;
    }

    if (!rideId || !passengerId || !driverId || !startName || !endName) {
      showGlobalError(getTranslation('missingInfo'), getTranslation('cannotSubmitFeedback'), { duration: 5000, position: 'top', animation: 'slide-down' });
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
        console.log(`🔄 Completing leg ${currentLegIndex + 1} of multi-leg journey ${journeyId}`);

        // Complete the current leg with payment using actual fare from ride completion
        const legResult = await completeLegWithPayment({
          journeyId,
          legIndex: currentLegIndex,
          actualCost: actualFare ? parseFloat(actualFare) : 0,
        });

        if (legResult.success && !legResult.journeyComplete && legResult.nextLeg) {
          // Journey continues - navigate to next leg
          const nextLeg = legResult.nextLeg;

          showGlobalSuccess(
            `${getTranslation('legComplete').replace('Leg', `Leg ${currentLegIndex + 1}`)}`,
            `${getTranslation('readyForNextLeg')} ${currentLegIndex + 2}? ${getTranslation('youHaveFiveMinutesToBoard')}`,
            {
              duration: 0,
              actions: [
                {
                  label: getTranslation('continueToNextLeg'),
                  onPress: () => {
                    router.replace({
                      pathname: '/TaxiInformation',
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
                  label: getTranslation('cancelJourney'),
                  onPress: () => router.replace('/HomeScreen'),
                  style: 'cancel',
                },
              ],
            }
          );
          return;
        } else if (legResult.success && legResult.journeyComplete) {
          // Journey complete
          showGlobalSuccess(
            getTranslation('journeyComplete'),
            `${getTranslation('multiLegJourneyCompletedSuccessfully')}${legResult.totalActualCost?.toFixed(2) || '0.00'}`,
            {
              duration: 0,
              actions: [
                { label: getTranslation('ok'), onPress: () => router.replace('/HomeScreen'), style: 'default' },
              ],
            }
          );
          return;
        }
      }

      // Check if this is a continue to next leg flow
      if (continueToNext === 'true' && journeyId && legIndex) {
        // Navigate to TaxiInformation for next leg
        const nextLegIndex = parseInt(legIndex) + 1;
        showGlobalSuccess(getTranslation('feedbackSubmitted'), getTranslation('continuingToNextLeg'), {
          duration: 2000,
          position: 'top',
          animation: 'slide-down',
        });
        
        setTimeout(() => {
          router.push({
            pathname: '/TaxiInformation',
            params: {
              isMultiLeg: 'true',
              journeyId,
              legIndex: nextLegIndex.toString(),
              totalLegs,
              routeName: routeName || '',
            },
          });
        }, 2000);
        return;
      }

      // Standard single ride completion
      setRating(0);
      setComment('');
      showGlobalSuccess(getTranslation('success'), getTranslation('feedbackSubmittedSuccessfully'), {
        duration: 0,
        position: 'top',
        animation: 'slide-down',
        actions: [
          {
            label: getTranslation('ok'),
            onPress: () => {
              clearMapContext();
              router.replace('/HomeScreen');
            },
            style: 'default'
          },
        ],
      });
    } catch (err: any) {
      showGlobalError(getTranslation('error'), err.message || getTranslation('somethingWentWrong'), { duration: 5000, position: 'top', animation: 'slide-down' });
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
      marginBottom: 24,
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
      marginTop: 8,
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
      padding: 20,
    },
    commentTitle: {
      fontSize: 17,
      fontWeight: '400',
      color: theme.text,
      marginBottom: 16,
    },
    commentInput: {
      backgroundColor: isDark 
        ? 'rgba(255,255,255,0.05)' 
        : 'rgba(0,0,0,0.03)',
      color: theme.text,
      height: 120,
      borderRadius: 12,
      padding: 16,
      textAlignVertical: 'top',
      fontSize: 16,
      borderWidth: 1,
      borderColor: isDark 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.08)',
    },
    buttonContainer: {
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 20,
      marginTop: 8,
    },
    submitButton: {
      backgroundColor: '#f90',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      borderWidth: 2,
      borderColor: '#D97706',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600',
    },
    skipButton: {
      backgroundColor: isDark 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.05)',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      minHeight: 56,
    },
    skipButtonText: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '600',
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
          <Text style={dynamicStyles.userRole}>{getTranslation('passenger')}</Text>
          
          {/* Ride Info Section - styled exactly like PassengerProfile */}
          <View style={dynamicStyles.rideInfoContainer}>
            <View style={dynamicStyles.rideInfoRow}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="location-outline" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.rideInfoContent}>
                <Text style={dynamicStyles.rideInfoLabel}>{getTranslation('from')}</Text>
                <Text style={dynamicStyles.rideInfoText}>{startName ?? getTranslation('na')}</Text>
              </View>
            </View>
            <View style={[dynamicStyles.rideInfoRow, dynamicStyles.lastRideInfoRow]}>
              <View style={dynamicStyles.iconContainer}>
                <Ionicons name="location" size={20} color={theme.text} />
              </View>
              <View style={dynamicStyles.rideInfoContent}>
                <Text style={dynamicStyles.rideInfoLabel}>{getTranslation('to')}</Text>
                <Text style={dynamicStyles.rideInfoText}>{endName ?? getTranslation('na')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Driver Feedback Section */}
        <Text style={dynamicStyles.sectionHeader}>{getTranslation('rateYourDriver')}</Text>
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.ratingSection}>
            <Text style={dynamicStyles.ratingTitle}>{getTranslation('howWasYourDriver')}</Text>
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
        <Text style={dynamicStyles.sectionHeader}>{getTranslation('shareYourFeedback')}</Text>
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.commentSection}>
            <Text style={dynamicStyles.commentTitle}>{getTranslation('tellUsAboutYourDriver')}</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={getTranslation('shareYourThoughtsAboutDriver')}
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
            <Text style={dynamicStyles.submitButtonText}>{getTranslation('submitFeedback')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              // Check if this is a continue to next leg flow
              if (continueToNext === 'true' && journeyId && legIndex) {
                // Navigate to TaxiInformation for next leg
                const nextLegIndex = parseInt(legIndex) + 1;
                router.push({
                  pathname: '/TaxiInformation',
                  params: {
                    isMultiLeg: 'true',
                    journeyId,
                    legIndex: nextLegIndex.toString(),
                    totalLegs,
                    routeName: routeName || '',
                  },
                });
              } else {
                // Standard skip feedback flow
                router.replace('/HomeScreen');
              }
            }}
            style={dynamicStyles.skipButton}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.skipButtonText}>
              {getTranslation('skipFeedback')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}