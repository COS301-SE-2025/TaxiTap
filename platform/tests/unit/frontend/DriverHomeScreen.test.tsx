import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DriverHomeScreen from '../../../app/DriverHomeScreen';

interface DriverOfflineProps {
  onGoOnline: () => void;
  todaysEarnings: number;
}

interface DriverOnlineProps {
  onGoOffline: () => void;
  todaysEarnings: number;
}

// Mock dependencies
jest.mock('../../../app/DriverOffline', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockDriverOffline({ onGoOnline, todaysEarnings }: DriverOfflineProps) {
    return (
      <View testID="driver-offline-component">
        <TouchableOpacity testID="go-online-button" onPress={onGoOnline}>
          <Text>Go Online</Text>
        </TouchableOpacity>
        <Text testID="offline-earnings">Earnings: R{todaysEarnings.toFixed(2)}</Text>
      </View>
    );
  };
});

jest.mock('../../../app/DriverOnline', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockDriverOnline({ onGoOffline, todaysEarnings }: DriverOnlineProps) {
    return (
      <View testID="driver-online-component">
        <TouchableOpacity testID="go-offline-button" onPress={onGoOffline}>
          <Text>Go Offline</Text>
        </TouchableOpacity>
        <Text testID="online-earnings">Earnings: R{todaysEarnings.toFixed(2)}</Text>
      </View>
    );
  };
});

describe('DriverHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render DriverOffline component by default', () => {
      const { getByTestId, queryByTestId } = render(<DriverHomeScreen />);
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
    });

    it('should initialize with isOnline state as false', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      // Should show offline component, not online component
      expect(getByTestId('driver-offline-component')).toBeTruthy();
    });

    it('should initialize with todaysEarnings as 0.00', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
    });
  });

  describe('State Transitions', () => {
    it('should switch to DriverOnline when handleGoOnline is called', () => {
      const { getByTestId, queryByTestId } = render(<DriverHomeScreen />);
      
      // Initially should show offline component
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
      
      // Simulate going online
      fireEvent.press(getByTestId('go-online-button'));
      
      // Should now show online component
      expect(getByTestId('driver-online-component')).toBeTruthy();
      expect(queryByTestId('driver-offline-component')).toBeNull();
    });

    it('should switch back to DriverOffline when handleGoOffline is called', () => {
      const { getByTestId, queryByTestId } = render(<DriverHomeScreen />);
      
      // Go online first
      fireEvent.press(getByTestId('go-online-button'));
      expect(getByTestId('driver-online-component')).toBeTruthy();
      
      // Go offline
      fireEvent.press(getByTestId('go-offline-button'));
      
      // Should be back to offline component
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
    });

    it('should toggle between online and offline states multiple times', () => {
      const { getByTestId, queryByTestId } = render(<DriverHomeScreen />);
      
      // Start offline
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      
      // Go online
      fireEvent.press(getByTestId('go-online-button'));
      expect(getByTestId('driver-online-component')).toBeTruthy();
      expect(queryByTestId('driver-offline-component')).toBeNull();
      
      // Go offline
      fireEvent.press(getByTestId('go-offline-button'));
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
      
      // Go online again
      fireEvent.press(getByTestId('go-online-button'));
      expect(getByTestId('driver-online-component')).toBeTruthy();
      expect(queryByTestId('driver-offline-component')).toBeNull();
    });
  });

  describe('Props Passing', () => {
    it('should pass correct props to DriverOffline component', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      // Check that earnings are passed correctly
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
      
      // Check that onGoOnline function works
      expect(() => fireEvent.press(getByTestId('go-online-button'))).not.toThrow();
    });

    it('should pass correct props to DriverOnline component', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      // Go online first
      fireEvent.press(getByTestId('go-online-button'));
      
      // Check that earnings are passed correctly
      expect(getByTestId('online-earnings')).toHaveTextContent('Earnings: R0.00');
      
      // Check that onGoOffline function works
      expect(() => fireEvent.press(getByTestId('go-offline-button'))).not.toThrow();
    });

    it('should maintain todaysEarnings value across state changes', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      // Check initial earnings in offline state
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
      
      // Go online
      fireEvent.press(getByTestId('go-online-button'));
      expect(getByTestId('online-earnings')).toHaveTextContent('Earnings: R0.00');
      
      // Go offline again
      fireEvent.press(getByTestId('go-offline-button'));
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
    });
  });

  describe('Component Rendering', () => {
    it('should only render one component at a time', () => {
      const { getByTestId, queryByTestId } = render(<DriverHomeScreen />);
      
      // Initially offline
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
      
      // Go online
      fireEvent.press(getByTestId('go-online-button'));
      expect(getByTestId('driver-online-component')).toBeTruthy();
      expect(queryByTestId('driver-offline-component')).toBeNull();
    });

    it('should render components without crashing', () => {
      expect(() => render(<DriverHomeScreen />)).not.toThrow();
    });

    it('should handle rapid state changes without crashing', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      // Rapidly toggle states
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByTestId('go-online-button'));
        fireEvent.press(getByTestId('go-offline-button'));
      }
      
      // Should still be functional
      expect(getByTestId('driver-offline-component')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<DriverHomeScreen />);
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should render components that are accessible', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      const offlineComponent = getByTestId('driver-offline-component');
      expect(offlineComponent).toBeTruthy();
      expect(offlineComponent.props.accessible !== false).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should not mutate state directly', () => {
      const { getByTestId } = render(<DriverHomeScreen />);
      
      // The state changes should only happen through the provided handlers
      const initialComponent = getByTestId('driver-offline-component');
      expect(initialComponent).toBeTruthy();
      
      // State should only change when handler is called
      fireEvent.press(getByTestId('go-online-button'));
      expect(getByTestId('driver-online-component')).toBeTruthy();
    });

    it('should have consistent state behavior', () => {
      const { getByTestId, queryByTestId } = render(<DriverHomeScreen />);
      
      // Test the state flow multiple times to ensure consistency
      const testCycles = 3;
      
      for (let i = 0; i < testCycles; i++) {
        // Should start or return to offline
        expect(getByTestId('driver-offline-component')).toBeTruthy();
        expect(queryByTestId('driver-online-component')).toBeNull();
        
        // Go online
        fireEvent.press(getByTestId('go-online-button'));
        expect(getByTestId('driver-online-component')).toBeTruthy();
        expect(queryByTestId('driver-offline-component')).toBeNull();
        
        // Go back offline
        fireEvent.press(getByTestId('go-offline-button'));
      }
    });
  });
});