import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DriverHomeScreen from '../../../app/DriverHomeScreen';

interface DriverOfflineProps {
  onGoOnline: () => void;
  todaysEarnings: number;
}

interface DriverOnlineProps {
  onGoOffline: () => void;
  todaysEarnings: number;
}

// Properly suppress ALL act warnings for this test file
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('An update to DriverHomeScreen inside a test was not wrapped in act') ||
       args[0].includes('not wrapped in act'))
    ) {
      return; // Completely suppress these warnings
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock the AlertContext
const MockAlertProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

jest.mock('../../../contexts/AlertContext', () => ({
  AlertProvider: MockAlertProvider,
  useAlerts: () => ({
    alerts: [],
    addAlert: jest.fn(),
    removeAlert: jest.fn(),
    clearAlerts: jest.fn(),
  }),
}));

// Mock AlertHelpers
jest.mock('../../../components/AlertHelpers', () => ({
  useAlertHelpers: () => ({
    showSuccessAlert: jest.fn(),
    showErrorAlert: jest.fn(),
    showInfoAlert: jest.fn(),
  }),
}));

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

// Test wrapper with AlertProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <MockAlertProvider>{children}</MockAlertProvider>;
};

describe('DriverHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should render DriverOffline component by default', () => {
      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
    });

    it('should initialize with isOnline state as false', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
    });

    it('should initialize with todaysEarnings as 0.00', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
    });
  });

  describe('State Transitions', () => {
    it('should switch to DriverOnline when handleGoOnline is called', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
      
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-online-component')).toBeTruthy();
        expect(queryByTestId('driver-offline-component')).toBeNull();
      });
    });

    it('should switch back to DriverOffline when handleGoOffline is called', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-online-component')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('go-offline-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-offline-component')).toBeTruthy();
        expect(queryByTestId('driver-online-component')).toBeNull();
      });
    });

    it('should toggle between online and offline states multiple times', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      
      // Go online
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-online-component')).toBeTruthy();
        expect(queryByTestId('driver-offline-component')).toBeNull();
      });
      
      // Go offline
      fireEvent.press(getByTestId('go-offline-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-offline-component')).toBeTruthy();
        expect(queryByTestId('driver-online-component')).toBeNull();
      });
      
      // Go online again
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-online-component')).toBeTruthy();
        expect(queryByTestId('driver-offline-component')).toBeNull();
      });
    });
  });

  describe('Props Passing', () => {
    it('should pass correct props to DriverOffline component', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
      expect(() => fireEvent.press(getByTestId('go-online-button'))).not.toThrow();
    });

    it('should pass correct props to DriverOnline component', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('online-earnings')).toHaveTextContent('Earnings: R0.00');
      });
      
      expect(() => fireEvent.press(getByTestId('go-offline-button'))).not.toThrow();
    });

    it('should maintain todaysEarnings value across state changes', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
      
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('online-earnings')).toHaveTextContent('Earnings: R0.00');
      });
      
      fireEvent.press(getByTestId('go-offline-button'));
      
      await waitFor(() => {
        expect(getByTestId('offline-earnings')).toHaveTextContent('Earnings: R0.00');
      });
    });
  });

  describe('Component Rendering', () => {
    it('should only render one component at a time', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
      expect(queryByTestId('driver-online-component')).toBeNull();
      
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-online-component')).toBeTruthy();
        expect(queryByTestId('driver-offline-component')).toBeNull();
      });
    });

    it('should render components without crashing', () => {
      expect(() => render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      )).not.toThrow();
    });

    it('should handle rapid state changes without crashing', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      for (let i = 0; i < 3; i++) {
        fireEvent.press(getByTestId('go-online-button'));
        await waitFor(() => {
          expect(getByTestId('driver-online-component')).toBeTruthy();
        });
        fireEvent.press(getByTestId('go-offline-button'));
        await waitFor(() => {
          expect(getByTestId('driver-offline-component')).toBeTruthy();
        });
      }
      
      expect(getByTestId('driver-offline-component')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should render components that are accessible', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      const offlineComponent = getByTestId('driver-offline-component');
      expect(offlineComponent).toBeTruthy();
      expect(offlineComponent.props.accessible !== false).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should not mutate state directly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      const initialComponent = getByTestId('driver-offline-component');
      expect(initialComponent).toBeTruthy();
      
      fireEvent.press(getByTestId('go-online-button'));
      
      await waitFor(() => {
        expect(getByTestId('driver-online-component')).toBeTruthy();
      });
    });

    it('should have consistent state behavior', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestWrapper>
          <DriverHomeScreen />
        </TestWrapper>
      );
      
      const testCycles = 2;
      
      for (let i = 0; i < testCycles; i++) {
        expect(getByTestId('driver-offline-component')).toBeTruthy();
        expect(queryByTestId('driver-online-component')).toBeNull();
        
        fireEvent.press(getByTestId('go-online-button'));
        
        await waitFor(() => {
          expect(getByTestId('driver-online-component')).toBeTruthy();
          expect(queryByTestId('driver-offline-component')).toBeNull();
        });
        
        fireEvent.press(getByTestId('go-offline-button'));
        
        await waitFor(() => {
          expect(getByTestId('driver-offline-component')).toBeTruthy();
          expect(queryByTestId('driver-online-component')).toBeNull();
        });
      }
    });
  });
});