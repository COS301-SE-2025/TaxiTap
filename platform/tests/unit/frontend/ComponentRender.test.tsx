import React from 'react';
import { render, cleanup } from '@testing-library/react-native';

// Mock the necessary dependencies
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return Text;
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{ name: 'Test Location' }])),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
  },
}));

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    setOptions: jest.fn(),
    navigate: jest.fn(),
  }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../../contexts/UserContext', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      role: 'driver',
      accountType: 'driver',
    },
    logout: jest.fn(),
    updateUserRole: jest.fn(),
    updateUserName: jest.fn(),
    updateAccountType: jest.fn(),
    updateNumber: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      textSecondary: '#666666',
      primary: '#007AFF',
      border: '#e0e0e0',
      shadow: '#000000',
    },
    isDark: false,
    themeMode: 'light',
    setThemeMode: jest.fn(),
  }),
}));

jest.mock('../../../contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    markAsRead: jest.fn(),
  }),
}));

jest.mock('../../../contexts/RouteContext', () => ({
  useRouteContext: () => ({
    currentRoute: 'Test Route',
    setCurrentRoute: jest.fn(),
  }),
}));

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => null),
  useMutation: jest.fn(() => jest.fn()),
}));

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    functions: {
      taxis: {
        getTaxiForDriver: { getTaxiForDriver: 'getTaxiForDriver' },
        updateAvailableSeats: { updateTaxiSeatAvailability: 'updateTaxiSeatAvailability' },
        updateAvailableSeatsDirectly: { updateAvailableSeatsDirectly: 'updateAvailableSeatsDirectly' },
      },
      earnings: {
        earnings: { getWeeklyEarnings: 'getWeeklyEarnings' },
        fare: { getFareForLatestTrip: 'getFareForLatestTrip' },
      },
      rides: {
        acceptRide: { acceptRide: 'acceptRide' },
        cancelRide: { cancelRide: 'cancelRide' },
        declineRide: { declineRide: 'declineRide' },
      },
    },
  },
}));

jest.mock('../../../app/hooks/useLocationStreaming', () => ({
  useThrottledLocationStreaming: () => ({
    location: null,
    error: null,
  }),
}));

describe('Component Render Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('DriverOnline Component', () => {
    it('should render without hooks violations', () => {
      const DriverOnline = require('../../../app/DriverOnline').default;
      
      expect(() => {
        render(
          <DriverOnline
            onGoOffline={jest.fn()}
            todaysEarnings={100}
            currentRoute="Test Route"
          />
        );
      }).not.toThrow();
    });
  });

  describe('DriverOffline Component', () => {
    it('should render without hooks violations', () => {
      const DriverOffline = require('../../../app/DriverOffline').default;
      
      expect(() => {
        render(
          <DriverOffline
            onGoOnline={jest.fn()}
            todaysEarnings={100}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Payments Component', () => {
    it('should render without hooks violations', () => {
      const PaymentScreen = require('../../../app/(tabs)/Payments').default;
      
      expect(() => {
        render(<PaymentScreen />);
      }).not.toThrow();
    });
  });
}); 