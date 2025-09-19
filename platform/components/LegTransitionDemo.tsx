import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Icon } from 'react-native-elements';
import LegTransition from './LegTransition';
import useLegTransition from '../hooks/useLegTransition';
import { JourneyLeg, MultiLegJourney } from '../types/multiLegJourney';

const { width } = Dimensions.get('window');

// Mock data for demonstration
const mockJourney: MultiLegJourney = {
  journeyId: 'journey-123',
  passengerId: 'passenger-123',
  status: 'active',
  totalLegs: 3,
  currentLegIndex: 0,
  originAddress: 'University of Cape Town',
  destinationAddress: 'Cape Town International Airport',
  originCoordinates: { latitude: -33.9577, longitude: 18.4612 },
  destinationCoordinates: { latitude: -33.9648, longitude: 18.6017 },
  optimizationPreference: 'shortest_time',
  estimatedTotalFare: 45.50,
  estimatedTotalDuration: 45,
  legs: [
    {
      legIndex: 0,
      fromAddress: 'University of Cape Town',
      toAddress: 'Cape Town Station',
      fromCoordinates: { latitude: -33.9577, longitude: 18.4612 },
      toCoordinates: { latitude: -33.9249, longitude: 18.4242 },
      status: 'active',
      estimatedFare: 15.50,
      estimatedDuration: 15,
    },
    {
      legIndex: 1,
      fromAddress: 'Cape Town Station',
      toAddress: 'Bellville Station',
      fromCoordinates: { latitude: -33.9249, longitude: 18.4242 },
      toCoordinates: { latitude: -33.8925, longitude: 18.6281 },
      status: 'pending',
      estimatedFare: 20.00,
      estimatedDuration: 20,
    },
    {
      legIndex: 2,
      fromAddress: 'Bellville Station',
      toAddress: 'Cape Town International Airport',
      fromCoordinates: { latitude: -33.8925, longitude: 18.6281 },
      toCoordinates: { latitude: -33.9648, longitude: 18.6017 },
      status: 'pending',
      estimatedFare: 10.00,
      estimatedDuration: 10,
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const LegTransitionDemo: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [transferProximity, setTransferProximity] = useState(5.0); // Start 5km away
  const [currentLegIndex, setCurrentLegIndex] = useState(0);

  const currentLeg = mockJourney.legs[currentLegIndex];
  const nextLeg = mockJourney.legs[currentLegIndex + 1];

  // Mock functions for demonstration
  const mockRequestNextLegTaxi = async (journeyId: string, legIndex: number) => {
    console.log(`Requesting next leg taxi for journey ${journeyId}, leg ${legIndex}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate random success/failure for demo
    if (Math.random() > 0.3) {
      console.log('Next leg taxi requested successfully');
    } else {
      throw new Error('No available taxis found for the next leg');
    }
  };

  const mockProgressJourney = async (journeyId: string, completedLegIndex: number) => {
    console.log(`Progressing journey ${journeyId} from leg ${completedLegIndex}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Journey progressed successfully');
  };

  const mockCancelJourney = async (journeyId: string) => {
    console.log(`Cancelling journey ${journeyId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Journey cancelled successfully');
  };

  const {
    transferStatus,
    nextLegRequestStatus,
    isTransitionVisible,
    errorMessage,
    estimatedArrivalTime,
    handleArrival,
    handleConfirmNextLeg,
    handleRetryRequest,
    handleCancelJourney,
    resetTransition,
  } = useLegTransition({
    currentLeg,
    nextLeg: nextLeg!,
    journey: mockJourney,
    onRequestNextLegTaxi: mockRequestNextLegTaxi,
    onProgressJourney: mockProgressJourney,
    onCancelJourney: mockCancelJourney,
    transferProximity,
    transferThreshold: 2.0,
  });

  // Simulate approaching transfer point
  useEffect(() => {
    const interval = setInterval(() => {
      setTransferProximity(prev => {
        const newProximity = prev - 0.5;
        if (newProximity <= 0) {
          clearInterval(interval);
          return 0;
        }
        return newProximity;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleNextDemo = () => {
    if (currentLegIndex < mockJourney.legs.length - 1) {
      setCurrentLegIndex(prev => prev + 1);
      setTransferProximity(5.0);
      resetTransition();
    } else {
      Alert.alert('Demo Complete', 'You have completed all legs of the journey!');
    }
  };

  const handleResetDemo = () => {
    setCurrentLegIndex(0);
    setTransferProximity(5.0);
    resetTransition();
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Leg Transition Demo
        </Text>
        <TouchableOpacity
          style={[styles.themeButton, isDarkMode && styles.themeButtonDark]}
          onPress={() => setIsDarkMode(!isDarkMode)}
        >
          <Icon
            name={isDarkMode ? 'light-mode' : 'dark-mode'}
            color={isDarkMode ? '#FFD700' : '#333'}
            size={20}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoContainer, isDarkMode && styles.infoContainerDark]}>
        <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
          Current Leg: {currentLeg.fromAddress} → {currentLeg.toAddress}
        </Text>
        <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
          Distance to Transfer: {transferProximity.toFixed(1)} km
        </Text>
        <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
          Status: {transferStatus}
        </Text>
        {nextLegRequestStatus !== 'pending' && (
          <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
            Next Leg Status: {nextLegRequestStatus}
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isDarkMode && styles.controlButtonDark]}
          onPress={handleArrival}
        >
          <Icon name="location-on" size={20} color="#4CAF50" />
          <Text style={[styles.controlButtonText, isDarkMode && styles.controlButtonTextDark]}>
            Simulate Arrival
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isDarkMode && styles.controlButtonDark]}
          onPress={handleNextDemo}
        >
          <Icon name="skip-next" size={20} color="#2196F3" />
          <Text style={[styles.controlButtonText, isDarkMode && styles.controlButtonTextDark]}>
            Next Leg
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isDarkMode && styles.controlButtonDark]}
          onPress={handleResetDemo}
        >
          <Icon name="refresh" size={20} color="#FF9800" />
          <Text style={[styles.controlButtonText, isDarkMode && styles.controlButtonTextDark]}>
            Reset Demo
          </Text>
        </TouchableOpacity>
      </View>

      <LegTransition
        visible={isTransitionVisible}
        currentLeg={currentLeg}
        nextLeg={nextLeg!}
        journey={mockJourney}
        onConfirmNextLeg={handleConfirmNextLeg}
        onRequestNextLeg={handleRetryRequest}
        onCancelJourney={handleCancelJourney}
        onRetryRequest={handleRetryRequest}
        transferStatus={transferStatus}
        nextLegRequestStatus={nextLegRequestStatus}
        errorMessage={errorMessage}
        estimatedArrivalTime={estimatedArrivalTime}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerDark: {
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  titleDark: {
    color: '#FFFFFF',
  },
  themeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  themeButtonDark: {
    backgroundColor: '#333',
  },
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  infoContainerDark: {
    backgroundColor: '#1E1E1E',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoTextDark: {
    color: '#B0B0B0',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  controlButtonDark: {
    backgroundColor: '#333',
  },
  controlButtonText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
    textAlign: 'center',
  },
  controlButtonTextDark: {
    color: '#FFFFFF',
  },
});

export default LegTransitionDemo;
