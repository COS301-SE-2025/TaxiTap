import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PassengerPinEntry() {
  const { user } = useUser();
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  
  const [pin, setPin] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Get ride information from params
  const rideId = params.rideId as string;
  const driverId = params.driverId as string;
  const driverName = params.driverName as string;
  const licensePlate = params.licensePlate as string;
  const fare = params.fare as string;
  const startName = params.startName as string;
  const endName = params.endName as string;

  const verifyDriverPin = useMutation(api.functions.rides.verifyDriverPin.verifyDriverPin);

  // Handle PIN input
  const handlePinChange = (value: string, index: number) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    
    // Auto-advance to next input
    if (value && index < 3) {
      // Focus next input (handled by auto-advance)
    }
    
    // Auto-verify when all digits are entered
    if (index === 3 && value && newPin.every(digit => digit !== '')) {
      handleVerifyPin(newPin.join(''));
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    const lastFilledIndex = pin.map((digit, index) => digit !== '' ? index : -1)
      .filter(index => index !== -1)
      .pop();
    
    if (lastFilledIndex !== undefined) {
      const newPin = [...pin];
      newPin[lastFilledIndex] = '';
      setPin(newPin);
    }
  };

  // Verify PIN
  const handleVerifyPin = async (enteredPin: string) => {
    if (!user || !rideId || !driverId) {
      Alert.alert('Error', 'Missing ride or user information.');
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

      if (result.success) {
        // PIN verified successfully, redirect to payments page
        router.push({
          pathname: './Payments',
          params: {
            driverName: driverName || 'Unknown Driver',
            licensePlate: licensePlate || 'Unknown Plate',
            fare: fare || '0',
            rideId: rideId,
            startName: startName || 'Current Location',
            endName: endName || 'Destination',
            driverId: driverId || '',
          },
        });
      } else {
        Alert.alert('Invalid PIN', 'Please check with the driver and try again.');
        setPin(['', '', '', '']);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to verify PIN. Please try again.');
      setPin(['', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  // Render number pad
  const renderNumberPad = () => {
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
            >
              <Text style={styles.numberButtonText}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Early return if no user
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Verify Driver PIN
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.infoSection}>
            <Icon name="shield-checkmark" size={60} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              Enter Driver's PIN
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Ask the driver to show you their verification PIN to start the ride
            </Text>
          </View>

          {/* PIN Display */}
          <View style={styles.pinDisplay}>
            {pin.map((digit, index) => (
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
            ))}
          </View>

          {/* Number Pad */}
          {renderNumberPad()}

          {/* Cancel Button */}
          <TouchableOpacity 
            style={[styles.cancelButton, { backgroundColor: theme.surface }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
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
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});


