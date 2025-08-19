import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';

interface LocationSpooferProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function LocationSpoofer({ isVisible, onClose }: LocationSpooferProps) {
  const { theme, isDark } = useTheme();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationName, setLocationName] = useState('');

  const handleSetLocation = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Input', 'Please enter valid latitude and longitude values.');
      return;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90 degrees.');
      return;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180 degrees.');
      return;
    }

    // For now, just show an alert that the location would be set
    // In a real implementation, this would update the app's location state
    Alert.alert(
      'Location Set',
      `Location set to: ${locationName || 'Custom Location'}\nLat: ${lat}\nLng: ${lng}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setLatitude('');
            setLongitude('');
            setLocationName('');
            onClose();
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    setLatitude('');
    setLongitude('');
    setLocationName('');
    onClose();
  };

  const dynamicStyles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 24,
      width: Dimensions.get('window').width * 0.9,
      maxWidth: 400,
      shadowColor: theme.shadow,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 4,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.background,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    cancelButton: {
      backgroundColor: theme.border,
    },
    setButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    cancelButtonText: {
      color: theme.text,
    },
    setButtonText: {
      color: '#FFFFFF',
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
  });

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={dynamicStyles.modalContent}>
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>Location Spoofer</Text>
            <TouchableOpacity
              style={dynamicStyles.closeButton}
              onPress={handleCancel}
            >
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={dynamicStyles.description}>
            Set a custom location for testing purposes. This will override your current GPS location.
          </Text>

          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Location Name (Optional)</Text>
            <TextInput
              style={dynamicStyles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="e.g., Test Location"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Latitude</Text>
            <TextInput
              style={dynamicStyles.input}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="e.g., -26.2041"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Longitude</Text>
            <TextInput
              style={dynamicStyles.input}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="e.g., 28.0473"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={dynamicStyles.buttonContainer}>
            <TouchableOpacity
              style={[dynamicStyles.button, dynamicStyles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={[dynamicStyles.buttonText, dynamicStyles.cancelButtonText]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[dynamicStyles.button, dynamicStyles.setButton]}
              onPress={handleSetLocation}
            >
              <Text style={[dynamicStyles.buttonText, dynamicStyles.setButtonText]}>
                Set Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 