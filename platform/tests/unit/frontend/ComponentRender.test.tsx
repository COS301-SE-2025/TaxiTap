import React from 'react';
import { render, cleanup } from '@testing-library/react-native';

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
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 0, longitude: 0 } })
  ),
  reverseGeocodeAsync: jest.fn(() =>
    Promise.resolve([
      {
        name: 'Main St',
        street: '123',
        city: 'Cape Town',
        region: 'Western Cape',
      },
    ])
  ),
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

jest.mock('convex/react', () => {
  return {
    useQuery: jest.fn((queryFn, args) => {
      if (queryFn === 'getWeeklyEarnings') {
        return [{ todayEarnings: 120.5 }];
      }
      if (queryFn === 'getTaxiForDriver') {
        return { capacity: 4 };
      }
      return null;
    }),
    useMutation: jest.fn(() => jest.fn(() => Promise.resolve())),
  };
});

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

describe('DriverOnline Component', () => {
  afterEach(cleanup);

  it('renders without crashing', () => {
    const DriverOnline = require('../../../app/DriverOnline').default;

    expect(() =>
      render(
        <DriverOnline
          onGoOffline={jest.fn()}
          todaysEarnings={100}
          currentRoute="Test Route"
        />
      )
    ).not.toThrow();
  });
});