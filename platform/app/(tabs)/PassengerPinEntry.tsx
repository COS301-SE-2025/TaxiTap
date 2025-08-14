import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Vibration,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PassengerPinEntry() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { user } = useUser();
  
  const [pin, setPin] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const rideId = params.rideId as string;

  // Get ride information
  const ride = useQuery(
    api.functions.rides.getRideById.getRideById,
    rideId ? { rideId } : "skip"
  );

  // Get driver information
  const driver = useQuery(
    api.functions.users.UserManagement.getUserById.getUserById,
    ride?.driverId ? { userId: ride.driverId } : "skip"
  );

  const verifyDriverPin = useMutation(api.functions.rides.verifyDriverPin.verifyDriverPin);

  const handlePinChange = (value: string, index: number) => {
    if (value.length > 1) return; // Only allow single digits
    if (value && !/^\d$/.test(value)) return; // Only allow numbers

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 4 digits are entered
    if (index === 3 && value && newPin.every(digit => digit !== '')) {
      handleVerifyPin(newPin.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !pin[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyPin = async (pinToVerify?: string) => {
    const pinString = pinToVerify || pin.join('');
    
    if (pinString.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter all 4 digits');
      return;
    }

    if (!user || !ride?.driverId) {
      Alert.alert('Error', 'Missing ride information');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyDriverPin({
        rideId: rideId,
        passengerId: user.id as Id<'taxiTap_users'>,
        driverId: ride.driverId,
        enteredPin: pinString,
      });

      if (result.success) {
        // Success feedback
        Vibration.vibrate([100, 50, 100]);
        
        Alert.alert('Success!', 'PIN verified. Your ride is starting!', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the ride tracking page instead of going back
              // This ensures the passenger stays on the ride tracking page
              router.push('/(tabs)/PassengerReservation');
            },
          },
        ]);
      } else {
        // Failed verification
        setAttempts(prev => prev + 1);
        setPin(['', '', '', '']);
        setIsShaking(true);
        
        Vibration.vibrate([200, 100, 200]);
        
        setTimeout(() => setIsShaking(false), 500);
        
        if (attempts >= 2) {
          Alert.alert(
            'PIN Verification Failed', 
            'Too many incorrect attempts. Please ask the driver to show you the correct PIN.',
            [{ text: 'OK', onPress: () => inputRefs.current[0]?.focus() }]
          );
        } else {
          Alert.alert(
            'Incorrect PIN', 
            `${result.message || 'Please try again.'}\n${3 - attempts - 1} attempts remaining.`,
            [{ text: 'OK', onPress: () => inputRefs.current[0]?.focus() }]
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  const clearPin = () => {
    setPin(['', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    driverInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 40,
      width: '100%',
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 4,
    },
    driverAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    driverDetails: {
      flex: 1,
    },
    driverName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    driverLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pinContainer: {
      alignItems: 'center',
      marginBottom: 40,
      width: '100%',
    },
    pinLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    pinInputContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
    },
    pinInput: {
      width: 60,
      height: 70,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 12,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      backgroundColor: theme.surface,
      marginHorizontal: 6,
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    pinInputFocused: {
      borderColor: theme.primary,
      backgroundColor: isDark ? theme.surface : '#FFF8E1',
    },
    pinInputFilled: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
      color: isDark ? "#121212" : "#FFFFFF",
    },
    pinInputError: {
      borderColor: '#FF4444',
      backgroundColor: '#FFEBEE',
    },
    shakeContainer: {
      transform: [{ translateX: isShaking ? 10 : 0 }],
    },
    instructionText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    buttonContainer: {
      width: '100%',
      gap: 12,
    },
    verifyButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      opacity: pin.every(digit => digit !== '') ? 1 : 0.6,
    },
    verifyButtonDisabled: {
      opacity: 0.3,
    },
    verifyButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? "#121212" : "#FFFFFF",
    },
    clearButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    clearButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 14,
      marginTop: 8,
    },
    attemptsText: {
      fontSize: 12,
      color: attempts > 1 ? '#FF4444' : theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  if (!ride || !driver) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.loadingContainer}>
          <Icon name="hourglass-outline" size={24} color={theme.textSecondary} />
          <Text style={dynamicStyles.loadingText}>Loading ride information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={dynamicStyles.backButton}
        onPress={() => router.back()}
      >
        <Icon name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.header}>
            <View style={dynamicStyles.icon}>
              <Icon name="shield-checkmark" size={48} color={theme.primary} />
            </View>
            <Text style={dynamicStyles.title}>Enter Driver PIN</Text>
            <Text style={dynamicStyles.subtitle}>
              Ask your driver to show you their 4-digit PIN for verification
            </Text>
          </View>

          {/* Driver Information */}
          <View style={dynamicStyles.driverInfo}>
            <View style={dynamicStyles.driverAvatar}>
              <Icon name="person" size={24} color={isDark ? "#121212" : "#FFFFFF"} />
            </View>
            <View style={dynamicStyles.driverDetails}>
              <Text style={dynamicStyles.driverName}>
                {driver.name || 'Your Driver'}
              </Text>
              <Text style={dynamicStyles.driverLabel}>Driver</Text>
            </View>
          </View>

          {/* PIN Input */}
          <View style={[dynamicStyles.pinContainer, isShaking && dynamicStyles.shakeContainer]}>
            <Text style={dynamicStyles.pinLabel}>Enter 4-Digit PIN</Text>
            
            <View style={dynamicStyles.pinInputContainer}>
              {pin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    dynamicStyles.pinInput,
                    digit && dynamicStyles.pinInputFilled,
                    attempts > 0 && !digit && dynamicStyles.pinInputError,
                  ]}
                  value={digit}
                  onChangeText={(value) => handlePinChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                  editable={!isVerifying}
                />
              ))}
            </View>

            <Text style={dynamicStyles.instructionText}>
              The driver will show you this PIN on their device
            </Text>

            {attempts > 0 && (
              <Text style={dynamicStyles.attemptsText}>
                {attempts >= 3 
                  ? 'Too many incorrect attempts' 
                  : `${3 - attempts} attempts remaining`
                }
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={dynamicStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                dynamicStyles.verifyButton,
                (isVerifying || !pin.every(digit => digit !== '')) && dynamicStyles.verifyButtonDisabled
              ]}
              onPress={() => handleVerifyPin()}
              disabled={isVerifying || !pin.every(digit => digit !== '')}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <Text style={dynamicStyles.verifyButtonText}>Verifying...</Text>
              ) : (
                <Text style={dynamicStyles.verifyButtonText}>Verify PIN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.clearButton}
              onPress={clearPin}
              disabled={isVerifying}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}