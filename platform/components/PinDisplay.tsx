// components/PinDisplay.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useAlertHelpers } from './AlertHelpers';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

interface PinDisplayProps {
  pin: string | null;
  rideId: string;
  onPinRegenerated?: (newPin: string) => void;
}

export const PinDisplay: React.FC<PinDisplayProps> = ({ 
  pin, 
  rideId, 
  onPinRegenerated 
}) => {
  const { theme, isDark } = useTheme();
  const { showConfirm, showGlobalSuccess, showGlobalError } = useAlertHelpers();
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const regeneratePin = useMutation(api.functions.rides.generatePin.regenerateRidePin);

  const handleRegeneratePin = async () => {
    if (isRegenerating) return;
    
    showConfirm(
      "Regenerate PIN",
      "This will create a new 4-digit verification code. The old code will no longer work.",
      async () => {
        setIsRegenerating(true);
        try {
          const result = await regeneratePin({ rideId: rideId as Id<'rides'> });
          onPinRegenerated?.(result.newPin);
          showGlobalSuccess("Success", "New PIN generated successfully!");
        } catch (error: any) {
          showGlobalError("Error", error.message || "Failed to generate new PIN");
        } finally {
          setIsRegenerating(false);
        }
      },
      () => {
        // Cancel action - do nothing
      },
      "Generate New PIN",
      "Cancel"
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: "transparent",
      borderColor: "#FF9900",
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: "dashed",
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 15,
      width: '90%',
      alignSelf: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    headerIcon: {
      marginRight: 6,
    },
    headerText: {
      fontSize: 12,
      fontWeight: '500',
      color: "#666666",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    pinContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    pinDigit: {
      width: 28,
      height: 32,
      backgroundColor: "#121212",
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 2,
      borderWidth: 1,
      borderColor: "#FF9900",
    },
    pinDigitText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: "#FF9900",
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    instructionText: {
      fontSize: 10,
      textAlign: 'center',
      color: "#888888",
      marginBottom: 4,
      fontWeight: '400',
    },
    regenerateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#FF9900",
      alignSelf: 'center',
    },
    regenerateButtonText: {
      fontSize: 10,
      fontWeight: '500',
      color: "#FF9900",
      marginLeft: 3,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    loadingContainer: {
      backgroundColor: "transparent",
      borderColor: "#FF9900",
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: "dashed",
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 15,
      width: '90%',
      alignSelf: 'center',
    },
    loadingText: {
      fontSize: 12,
      textAlign: 'center',
      color: "#666666",
      fontStyle: 'italic',
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });

  if (!pin) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingText}>Generating PIN...</Text>
      </View>
    );
  }

  const pinDigits = pin.split('');

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Icon 
          name="shield-checkmark" 
          size={14} 
          color="#666666" 
          style={dynamicStyles.headerIcon}
        />
        <Text style={dynamicStyles.headerText}>Safety PIN</Text>
      </View>
      
      <View style={dynamicStyles.pinContainer}>
        {pinDigits.map((digit, index) => (
          <View key={index} style={dynamicStyles.pinDigit}>
            <Text style={dynamicStyles.pinDigitText}>{digit}</Text>
          </View>
        ))}
      </View>
      
      <Text style={dynamicStyles.instructionText}>
        Show to driver
      </Text>
      
      <TouchableOpacity 
        style={dynamicStyles.regenerateButton}
        onPress={handleRegeneratePin}
        disabled={isRegenerating}
        activeOpacity={0.8}
      >
        <Icon 
          name="refresh" 
          size={12} 
          color="#FF9900"
        />
        <Text style={dynamicStyles.regenerateButtonText}>
          {isRegenerating ? "Wait..." : "New PIN"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};