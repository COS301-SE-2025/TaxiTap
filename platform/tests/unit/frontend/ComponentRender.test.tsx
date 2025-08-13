import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Properly suppress act warnings for this test file too
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('An update to DriverOnline inside a test was not wrapped in act') ||
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
const ComponentRenderAlertProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

jest.mock('../../../contexts/AlertContext', () => ({
  AlertProvider: ComponentRenderAlertProvider,
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
        getActiveTrips: { getActiveTrips: 'getActiveTrips' },
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

// Test wrapper with all necessary providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <NavigationContainer>
      <ComponentRenderAlertProvider>
        {children}
      </ComponentRenderAlertProvider>
    </NavigationContainer>
  );
};

describe('DriverOnline Component', () => {
  afterEach(cleanup);

  it('renders without crashing', () => {
    const DriverOnline = require('../../../app/DriverOnline').default;

    expect(() =>
      render(
        <TestWrapper>
          <DriverOnline
            onGoOffline={jest.fn()}
            todaysEarnings={100}
            currentRoute="Test Route"
          />
        </TestWrapper>
      )
    ).not.toThrow();
  });
});