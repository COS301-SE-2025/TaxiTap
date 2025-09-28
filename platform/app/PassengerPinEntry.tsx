import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import Icon from 'react-native-vector-icons/Ionicons';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function PassengerPinEntry() {
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  const { currentLanguage } = useLanguage();
  const params = useLocalSearchParams();
  
  const [pin, setPin] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);

  // Supported languages type
  type SupportedLanguage = 'en' | 'zu' | 'tn' | 'af';

  // Hardcoded translations for all UI text
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    error: {
      en: "Error",
      zu: "Iphutha",
      tn: "Phoso",
      af: "Fout"
    },
    failedToProcessPinInput: {
      en: "Failed to process PIN input. Please try again.",
      zu: "Kuhlulekile ukucubungula okokufaka kwe-PIN. Sicela uzame futhi.",
      tn: "Ga go atlege go rarabolola tseno ya PIN. Re kopa o leke gape.",
      af: "Kon nie PIN-invoer verwerk nie. Probeer asseblief weer."
    },
    failedToProcessBackspace: {
      en: "Failed to process backspace. Please try again.",
      zu: "Kuhlulekile ukucubungula ukubuyela emuva. Sicela uzame futhi.",
      tn: "Ga go atlege go rarabolola go boela morago. Re kopa o leke gape.",
      af: "Kon nie terugspasie verwerk nie. Probeer asseblief weer."
    },
    missingRideOrUserInfo: {
      en: "Missing ride or user information.",
      zu: "Ulwazi lohambo noma lomsebenzisi alukho.",
      tn: "Tshedimosetso ya leetong kgotsa ya modirisi ga e na.",
      af: "Ontbrekende rit of gebruiker inligting."
    },
    invalidPin: {
      en: "Invalid PIN",
      zu: "I-PIN Engalungile",
      tn: "PIN e sa Tshwaneng",
      af: "Ongeldige PIN"
    },
    enterValidFourDigitPin: {
      en: "Please enter a valid 4-digit PIN.",
      zu: "Sicela ufake i-PIN engu-4 engalungile.",
      tn: "Re kopa o tsenye PIN e e tshwanang ya dinomoro tse 4.",
      af: "Voer asseblief 'n geldige 4-syfer PIN in."
    },
    unknownDriver: {
      en: "Unknown Driver",
      zu: "Umshayeli Ongaziwa",
      tn: "Mokgweetsi o sa Itseweng",
      af: "Onbekende Bestuurder"
    },
    navigationError: {
      en: "Navigation Error",
      zu: "Iphutha Lokuhamba",
      tn: "Phoso ya Go Tsamaya",
      af: "Navigasie Fout"
    },
    failedToNavigateToPayments: {
      en: "Failed to navigate to payments. Please try again.",
      zu: "Kuhlulekile ukuhamba ukuya ezinkokhelweni. Sicela uzame futhi.",
      tn: "Ga go atlege go tsamaya go ya ditlhwatlhwa. Re kopa o leke gape.",
      af: "Kon nie na betalings navigeer nie. Probeer asseblief weer."
    },
    checkWithDriverAndTryAgain: {
      en: "Please check with the driver and try again.",
      zu: "Sicela uhlole nomshayeli bese uzama futhi.",
      tn: "Re kopa o tlhatlhobe le mokgweetsi mme o leke gape.",
      af: "Kontroleer asseblief met die bestuurder en probeer weer."
    },
    failedToVerifyPin: {
      en: "Failed to verify PIN. Please try again.",
      zu: "Kuhlulekile ukuqinisekisa i-PIN. Sicela uzame futhi.",
      tn: "Ga go atlege go tlhomamisa PIN. Re kopa o leke gape.",
      af: "Kon nie PIN verifieer nie. Probeer asseblief weer."
    },
    missingRideInformation: {
      en: "Missing ride information. Please go back and try again.",
      zu: "Ulwazi lohambo alukho. Sicela ubuyele emuva bese uzama futhi.",
      tn: "Tshedimosetso ya leetong ga e na. Re kopa o boele morago mme o leke gape.",
      af: "Ontbrekende rit inligting. Gaan asseblief terug en probeer weer."
    },
    verifyingPin: {
      en: "Verifying PIN...",
      zu: "Kuqinisekiswa i-PIN...",
      tn: "Go tlhomamisiwa PIN...",
      af: "PIN word geverifieer..."
    },
    verifyDriverPin: {
      en: "Verify Driver PIN",
      zu: "Qinisekisa I-PIN Yomshayeli",
      tn: "Tlhomamisa PIN ya Mokgweetsi",
      af: "Verifieer Bestuurder PIN"
    },
    enterDriversPin: {
      en: "Enter Driver's PIN",
      zu: "Faka I-PIN Yomshayeli",
      tn: "Tsenya PIN ya Mokgweetsi",
      af: "Voer Bestuurder PIN in"
    },
    askDriverToShowPin: {
      en: "Ask the driver to show you their verification PIN to start the ride",
      zu: "Cela umshayeli ukuthi akukhombise i-PIN yakhe yokuqinisekisa ukuze uqale uhambo",
      tn: "Kopa mokgweetsi gore a go bontshe PIN ya gagwe ya tlhomamiso go simolola leetong",
      af: "Vra die bestuurder om jou hul verifikasie PIN te wys om die rit te begin"
    },
    loadingPinDisplay: {
      en: "Loading PIN display...",
      zu: "Kulayishwa ukubonisa i-PIN...",
      tn: "Go tsena pontsho ya PIN...",
      af: "PIN vertoning word gelaai..."
    }
  } as const;

  // Type-safe translation getter
  const getTranslation = (key: keyof typeof translations) => {
    return translations[key][currentLanguage as SupportedLanguage];
  };

  // Reset PIN if it gets corrupted
  useEffect(() => {
    if (pin.length !== 4 || !Array.isArray(pin)) {
      console.warn('PIN state corrupted, resetting...');
      setPin(['', '', '', '']);
    }
  }, [pin]);
  
  // Get ride information from params
  const rideId = params.rideId as string;
  const driverId = params.driverId as string;
  const driverName = params.driverName as string;
  const licensePlate = params.licensePlate as string;
  const fare = params.fare as string;
  const startName = params.startName as string;
  const endName = params.endName as string;

  // Debug logging
  useEffect(() => {
    console.log('PassengerPinEntry mounted with params:', {
      rideId,
      driverId,
      driverName,
      licensePlate,
      fare,
      startName,
      endName,
      user: user?.id
    });
    console.log('🔍 PassengerPinEntry - Multi-leg params check:', {
      isMultiLeg: params.isMultiLeg,
      journeyId: params.journeyId,
      legIndex: params.legIndex,
      totalLegs: params.totalLegs,
      routeName: params.routeName,
      allParams: params
    });
  }, [rideId, driverId, driverName, licensePlate, fare, startName, endName, user?.id, params]);

  const verifyDriverPin = useMutation(api.functions.rides.verifyDriverPin.verifyDriverPin);

  // Handle PIN input
  const handlePinChange = (value: string, index: number) => {
    try {
      // Validate input and PIN state
      if (!value || value.length > 1 || !/^\d$/.test(value)) {
        return; // Only allow single digit
      }
      
      if (!Array.isArray(pin) || pin.length !== 4) {
        console.warn('PIN state corrupted, resetting...');
        setPin(['', '', '', '']);
        return;
      }
      
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      
      // Auto-verify when all digits are entered
      if (index === 3 && value && newPin.every(digit => digit !== '')) {
        const fullPin = newPin.join('');
        if (fullPin.length === 4 && /^\d{4}$/.test(fullPin)) {
          handleVerifyPin(fullPin);
        }
      }
    } catch (error) {
      console.error('PIN input error:', error);
      Alert.alert(getTranslation('error'), getTranslation('failedToProcessPinInput'));
      // Reset PIN state on error
      setPin(['', '', '', '']);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    try {
      // Validate PIN state
      if (!Array.isArray(pin) || pin.length !== 4) {
        console.warn('PIN state corrupted, resetting...');
        setPin(['', '', '', '']);
        return;
      }
      
      const lastFilledIndex = pin.map((digit, index) => digit !== '' ? index : -1)
        .filter(index => index !== -1)
        .pop();
      
      if (lastFilledIndex !== undefined && lastFilledIndex >= 0) {
        const newPin = [...pin];
        newPin[lastFilledIndex] = '';
        setPin(newPin);
      }
    } catch (error) {
      console.error('Backspace error:', error);
      Alert.alert(getTranslation('error'), getTranslation('failedToProcessBackspace'));
      // Reset PIN state on error
      setPin(['', '', '', '']);
    }
  };

  // Verify PIN
  const handleVerifyPin = async (enteredPin: string) => {
    if (!user || !rideId || !driverId) {
      Alert.alert(getTranslation('error'), getTranslation('missingRideOrUserInfo'));
      return;
    }

    // Validate PIN format
    if (!enteredPin || enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
      Alert.alert(getTranslation('invalidPin'), getTranslation('enterValidFourDigitPin'));
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyDriverPin({
        rideId: rideId,
        passengerId: user.id as Id<'taxiTap_users'>,
        driverId: driverId as Id<'taxiTap_users'>,
        enteredPin: enteredPin,
      });

      if (result && result.success) {
        // PIN verified successfully, redirect to payments page
        try {
          await router.push({
            pathname: '/Payments',
            params: {
              driverName: driverName || getTranslation('unknownDriver'),
              licensePlate: licensePlate || 'Unknown Plate',
              fare: fare || '0',
              rideId: rideId,
              startName: startName || 'Current Location',
              endName: endName || 'Destination',
              driverId: driverId || '',
              // Pass through location parameters
              currentLat: params.currentLat,
              currentLng: params.currentLng,
              currentName: params.currentName,
              destinationLat: params.destinationLat,
              destinationLng: params.destinationLng,
              destinationName: params.destinationName,
              // Pass through multi-leg journey parameters
              isMultiLeg: params.isMultiLeg,
              journeyId: params.journeyId,
              legIndex: params.legIndex,
              totalLegs: params.totalLegs,
              routeName: params.routeName,
            },
          });
        } catch (navError) {
          console.error('Navigation error:', navError);
          Alert.alert(getTranslation('navigationError'), getTranslation('failedToNavigateToPayments'));
        }
      } else {
        Alert.alert(getTranslation('invalidPin'), getTranslation('checkWithDriverAndTryAgain'));
        setPin(['', '', '', '']);
      }
    } catch (error: any) {
      console.error('PIN verification error:', error);
      Alert.alert(getTranslation('error'), error?.message || getTranslation('failedToVerifyPin'));
      setPin(['', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  // Render number pad
  const renderNumberPad = () => {
    try {
      const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];
      
      return (
        <View style={styles.numberPad}>
          {numbers.map((item, index) => {
            if (item === '') {
              return <View key={index} style={styles.numberButtonEmpty} />;
            }
            
            if (item === 'backspace') {
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.numberButton}
                  onPress={handleBackspace}
                  activeOpacity={0.7}
                  disabled={isVerifying}
                >
                  <Icon name="backspace-outline" size={24} color={theme.text} />
                </TouchableOpacity>
              );
            }
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.numberButton}
                onPress={() => handlePinChange(item, pin.findIndex(digit => digit === ''))}
                activeOpacity={0.7}
                disabled={isVerifying}
              >
                <Text style={styles.numberButtonText}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    } catch (error) {
      console.error('Number pad rendering error:', error);
      return (
        <View style={styles.numberPad}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Error loading number pad
          </Text>
        </View>
      );
    }
  };

  // Early return if no user
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#FFFFFF' }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme?.text || '#000000' }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Early return if missing required parameters
  if (!rideId || !driverId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme?.background || '#FFFFFF' }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme?.text || '#000000' }]}>{getTranslation('missingRideInformation')}</Text>
          <TouchableOpacity 
            style={[styles.cancelButton, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelButtonText, { color: theme?.text || '#000000' }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Early return if theme is not loaded
  if (!theme) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: '#000000' }]}>Loading theme...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading spinner when verifying PIN
  if (isVerifying) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingSpinner size="large" />
          <Text style={{ marginTop: 20, color: theme.text, fontSize: 16 }}>
            {getTranslation('verifyingPin')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        {/* <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push("/PassengerReservation")}
          >
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {getTranslation('verifyDriverPin')}
          </Text>
          <View style={styles.placeholder} />
        </View> */}

        {/* Main Content */}
        {/* <View style={styles.content}> */}
          <View style={styles.infoSection}>
            <Icon name="shield-checkmark" size={60} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              {getTranslation('enterDriversPin')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {getTranslation('askDriverToShowPin')}
            </Text>
          </View>

          {/* PIN Display */}
          <View style={styles.pinDisplay}>
            {Array.isArray(pin) && pin.length === 4 ? (
              pin.map((digit, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.pinDot,
                    digit !== '' && styles.pinDotFilled,
                    { borderColor: theme.primary }
                  ]}
                >
                  {digit !== '' && (
                    <Text style={[styles.pinDigit, { color: theme.primary }]}>
                      {digit}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={[styles.loadingText, { color: theme.text }]}>
                {getTranslation('loadingPinDisplay')}
              </Text>
            )}
          </View>

          {/* Number Pad */}
          {renderNumberPad()}

          {/* Cancel Button */}
          <TouchableOpacity 
            style={[styles.cancelButton]}
            onPress={() => router.push("../PassengerReservation")}
            disabled={isVerifying}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          {/* Loading Indicator */}
          {isVerifying && (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.text }]}>
                {getTranslation('verifyingPin')}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 15,
  },
  pinDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: 'transparent',
  },
  pinDigit: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 30,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  numberButtonEmpty: {
    width: 70,
    height: 70,
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    backgroundColor: "#FF4444",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: "center",
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});